import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Activities } from '../../src/screens/Activities';
import { createPrivateStorage } from '../../src/utils/privateStorage';

const root = createRoot(document.getElementById('root'));
// Exercise the actual screen and private-storage boundary without live accounts.
window.mountActivityOwner = (ownerId, delay = '') => {
  const storage = createPrivateStorage({ ownerId });
  const read = storage.read;
  const update = storage.update;
  if (delay === 'read') storage.read = async (...args) => {
    const value = await read(...args);
    if (args[0].startsWith('activityCompletions:')) await new Promise((resolve) => { window.releaseActivityRead = resolve; });
    return value;
  };
  if (delay === 'write') storage.update = async (...args) => {
    await new Promise((resolve) => { window.releaseActivityWrite = resolve; });
    return update(...args);
  };
  root.render(<StrictMode><Activities privateStorage={storage} /></StrictMode>);
};
window.mountActivityOwner('local-browser');
