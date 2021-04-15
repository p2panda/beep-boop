import React from 'react';

import { PublishEntry } from '~/components/Chatlog/PublishEntry';

import type { EntryRecord } from '~/p2panda-api/types';

type Props = {
  log: EntryRecord[];
  setCurrentMessage: (message: string) => void;
  setDebugEntry: (entry: EntryRecord) => void;
  handlePublish: (message: string) => Promise<void>;
};

const formatAuthor = ({ author }) => `${author.slice(0, 6)}`;

export const Chatlog = ({
  log,
  setCurrentMessage,
  setDebugEntry,
  handlePublish,
}: Props): JSX.Element => (
  <div className="chat-log flex-column">
    <h2>Message Log</h2>{' '}
    <PublishEntry
      handlePublish={handlePublish}
      setCurrentMessage={setCurrentMessage}
    />
    <div className="messages">
      {log.slice(log.length - 10).map((entry) => (
        <div
          key={`${entry.logId}-${entry.seqNum}`}
          onClick={() => setDebugEntry(entry)}
        >
          <h3>
            {formatAuthor(entry)}: {entry.decoded.message.fields.message.Text}
          </h3>
        </div>
      ))}
    </div>
  </div>
);
