import React, { useState, useEffect } from 'react';
import p2panda from 'p2panda-js';

const NUM_ITERATIONS = 250;

const log = [];

const LogWindow = () => {
  const [debugMsg, setDebugMsg] = useState('');

  const [perfLoad, setPerfLoad] = useState<number>();
  const [perfKeyPair, setPerfKeyPair] = useState<number>();
  const [perfEncodeEntry, setPerfEncodeEntry] = useState<number>();
  const [perfDecodeEntry, setPerfDecodeEntry] = useState<number>();

  useEffect(() => {
    const asyncEffect = async () => {
      const timeStart = performance.now();
      const { KeyPair, decodeEntry, signEncode } = await p2panda;

      const timeP2PandaLoaded = performance.now();
      setPerfLoad(timeP2PandaLoaded - timeStart);

      const keyPair = new KeyPair();
      setDebugMsg(`${keyPair.publicKey()}, ${keyPair.privateKey()}`);
      const timeKeyPair = performance.now();
      setPerfKeyPair(timeKeyPair - timeP2PandaLoaded);

      const private_key = keyPair.privateKey();
      const timeBeforeEntry = performance.now();
      for (const i of new Array(NUM_ITERATIONS).fill(1))
        await sendMessage(private_key, 'test');
      const timeAfterEntry = performance.now();
      setPerfEncodeEntry((timeAfterEntry - timeBeforeEntry) / NUM_ITERATIONS);

      const result = await sendMessage(private_key, 'test');
      const timeBeforeDecode = performance.now();
      for (const i of new Array(NUM_ITERATIONS).fill(1))
        await decodeEntry(result.encoded_entry);
      const timeAfterDecode = performance.now();
      setPerfDecodeEntry((timeAfterDecode - timeBeforeDecode) / NUM_ITERATIONS);
    };
    asyncEffect();
  }, []);

  return (
    <div>
      <h2>Key pair</h2>
      <p>p2panda says: {debugMsg ? debugMsg : 'Generating key pair...'}</p>
      <h2>Performance</h2>
      <p>Loading p2panda lib: {perfLoad}ms</p>
      <p>Generating key pair: {perfKeyPair}ms</p>
      <p>Encoding an entry: {perfEncodeEntry}ms</p>
      <p>Decoding an entry: {perfDecodeEntry}ms</p>
    </div>
  );
};

const getEntryHash = (seqNum, log) => {
  // Offset seqNum by -1 to retrieve correct entry from log array
  return log[seqNum - 1].entry_hash;
};

const sendMessage = async (privateKey: string, message: string) => {
  const { signEncode, getSkipLink } = await p2panda;
  // @TODO
  // 1. Pass over backlink entry hash, skiplink entry hash, sequence number from log ..
  const logLength = log.length;
  let skipLink: number = null;
  let skipLinkHash: string = null;
  let backLinkHash: string = null;
  let seqNum: number = null;
  let backLink: number = null;

  if (logLength > 0) {
    // Seq num for entry we are about to create
    seqNum = logLength + 1;
    // Backlink seq num for the entry preceeding the new entry (current end of log)
    backLink = logLength;
    // Get skipLink sequence number
    // this -1 corrects an error when calculating the skiplink in p2panda-rs i think....
    skipLink = getSkipLink(seqNum) - 1;
    // Calculate skiplink entry hash
    skipLinkHash = getEntryHash(skipLink, log);
    // Calculate backlink entry hash
    backLinkHash = getEntryHash(backLink, log);
  }

  console.log(`skiplink: ${skipLink}`);
  console.log(`backLink: ${backLink}`);
  console.log({ skipLinkHash, backLinkHash });

  const entry = await signEncode(privateKey, message);
  // Push entry to log
  log.push(entry);
  console.log(log);
  return entry;
};

const Home = (): JSX.Element => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [privateKey, setPrivateKey] = useState<string>();
  const [entryEncoded, setEntryEncoded] = useState<string>();
  const [entry, setEntry] = useState<string>();
  const [messageEncoded, setMessageEncoded] = useState<string>();
  const [hash, setHash] = useState<string>();

  useEffect(() => {
    const asyncEffect = async () => {
      const { KeyPair } = await p2panda;
      if (!window.localStorage.getItem('privateKey')) {
        const keyPair = new KeyPair();
        window.localStorage.setItem('privateKey', keyPair.privateKey());
      }
      setPrivateKey(window.localStorage.getItem('privateKey'));
    };
    asyncEffect();
  }, []);

  const handleClick = async () => {
    const result = await sendMessage(privateKey, currentMessage);
    setCurrentMessage('');
    setEntryEncoded(result.encoded_entry);
    setMessageEncoded(result.encoded_message);
    setHash(result.entry_hash);
  };

  useEffect(() => {
    const asyncEffect = async () => {
      const { decodeEntry } = await p2panda;
      const decodedEntry = await decodeEntry(entryEncoded, messageEncoded);
      setEntry(decodedEntry);
    };
    asyncEffect();
  }, [entryEncoded, messageEncoded]);

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
      <div>
        <h1>p2paradies, p2panda, p2parachute</h1>
        <h2>Hallo, hier ist alles schön :)</h2>
        <input
          type="text"
          onChange={({ target: { value } }) => setCurrentMessage(value)}
          value={currentMessage}
        />
        <button onClick={() => handleClick()}>bœp</button>
        <h2>hier beginnt das Abenteuer:</h2>
        <textarea
          rows={20}
          cols={80}
          onChange={({ target: { value } }) => setEntryEncoded(value)}
          value={entryEncoded}
        ></textarea>

        <LogWindow />
      </div>
      <div>
        <pre
          style={{
            maxWidth: '30em',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {entry}
        </pre>
        <p style={{ maxWidth: '30em', wordBreak: 'break-all' }}>
          {hash && 'Hash:'} {hash}
        </p>
        <p style={{ maxWidth: '30em', wordBreak: 'break-all' }}>
          {messageEncoded && 'Message:'} {messageEncoded}
        </p>
      </div>
    </section>
  );
};

export default Home;
