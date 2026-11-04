import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/styles.css';
import { MemoryJarGame } from '../../src/components/games/MemoryJarGame';
import { createPrivateStorage } from '../../src/utils/privateStorage';

function Fixture() {
  const [owner, setOwner] = useState('jar-owner-a');
  const [locked, setLocked] = useState(false);
  const [generation, setGeneration] = useState(0);
  const storage = useMemo(() => {
    const source = createPrivateStorage({ ownerId: owner, encryptionEnabled: false });
    return { ...source, update: async (...args) => {
      if (window.holdJarWrite) await new Promise((resolve) => { window.releaseJarWrite = resolve; });
      return source.update(...args);
    }, read: async (...args) => {
      const value = await source.read(...args);
      if (window.holdJarRead) await new Promise((resolve) => { window.releaseJarRead = resolve; });
      return value;
    } };
  }, [owner, generation]);
  return <MemoryRouter initialEntries={['/games/memory?month=2026-11']}><div className="app theme-seafoam"><main className="app-container">
    <button onClick={() => setOwner('jar-owner-a')}>Owner A</button><button onClick={() => setOwner('jar-owner-b')}>Owner B</button>
    <button onClick={() => setLocked((value) => !value)}>Toggle lock</button><button onClick={() => setGeneration((value) => value + 1)}>New storage session</button>
    {locked ? <p>Journal locked</p> : <MemoryJarGame mood={{ key: 'calm', score: 5 }} privateStorage={storage} reduceMotion />}
  </main></div></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
