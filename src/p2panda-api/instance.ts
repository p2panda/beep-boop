import { Resolved } from '~/typescript/helpers';

import { Session } from '.';
import { Fields } from './types';

type InstanceArgs = {
  // @ts-expect requires types exported from rust
  keyPair: Resolved<Session['p2panda']['KeyPair']>;
  schema: string;
  session: Session;
};

/**
 * Returns a message fields instance for the given field contents and schema
 */
const getMessageFields = async (
  session: Session,
  _schema: string,
  fields: Fields,
) => {
  const { MessageFields } = await session.loadWasm();

  const messageFields = new MessageFields();
  for (const fieldName of Object.keys(fields)) {
    const fieldType = Object.keys(fields[fieldName])[0];
    messageFields.add(fieldName, fields[fieldName][fieldType]);
  }
  return messageFields;
};

/**
 * Sign and publish an entry given a prepared `Message`, `KeyPair` and `Session`
 */
const signPublishEntry = async (message, { keyPair, schema, session }) => {
  const { signEncodeEntry, KeyPair } = await session.loadWasm();

  const entryArgs = await session.getNextEntryArgs(keyPair.publicKey(), schema);

  // If lastSeqNum is null don't try and convert to BigInt
  // Can this be handled better in the wasm code?
  const lastSeqNum = entryArgs.lastSeqNum
    ? BigInt(entryArgs.lastSeqNum)
    : entryArgs.lastSeqNum;

  // Sign and encode entry passing in copy of keyPair
  const { entryEncoded } = signEncodeEntry(
    KeyPair.fromPrivateKey(keyPair.privateKey()),
    message,
    entryArgs.entryHashSkiplink,
    entryArgs.entryHashBacklink,
    lastSeqNum,
    BigInt(entryArgs.logId),
  );

  // Publish entry and store returned entryArgs for next entry
  const nextEntryArgs = await session.publishEntry(entryEncoded, message);

  // Cache next entry args for next publish
  session.setNextEntryArgs(keyPair.publicKey(), schema, nextEntryArgs);
};

/**
 * Signs and publishes a `create` entry for the given user data and matching schema.
 *
 * Caches arguments for creating the next entry of this schema in the given session.
 *
 * @param fields user data to publish with the new entry, needs to match schema
 * @param instanceArgs config object:
 * @param instanceArgs.keyPair will be used to sign the new entry
 * @param instanceArgs.schema hex-encoded schema id
 * @param instanceArgs.session will be used to publish the new entry
 * @example
 * await Instance.create({
 *   message: { Text: 'hello' }
 * }, {
 *  keyPair,
 *  schema,
 *  session
 * });
 */
const create = async (
  fields: Fields,
  { keyPair, schema, session }: InstanceArgs,
): Promise<void> => {
  const { encodeCreateMessage } = await session.loadWasm();

  // Create message
  const messageFields = await getMessageFields(session, schema, fields);
  const encodedMessage = await encodeCreateMessage(schema, messageFields);
  await signPublishEntry(encodedMessage, { keyPair, schema, session });
};

export default { create };
