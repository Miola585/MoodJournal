import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/styles.css';
import { JournalLibrary } from '../../src/screens/JournalLibrary';
import { PersonalNightSky } from '../../src/components/games/PersonalNightSky';
import { JournalPrivacyGate } from '../../src/components/layout/JournalLocks';
import { createPrivateStorage } from '../../src/utils/privateStorage';
import { moods } from '../../src/data/journalData';

const first = { id: 'first', type: 'checkin', dateKey: '2026-10-01', created: '2026-10-01T12:00:00', mood: 'Calm', intensity: 2, primary: true };
function Fixture() {
  const [owner, setOwner] = useState('sky-owner-a');
  const [locked, setLocked] = useState(false);
  const [entries, setEntries] = useState([first]);
  const storage = useMemo(() => {
    const source = createPrivateStorage({ ownerId: owner, encryptionEnabled: false });
    return { ...source, read: async (...args) => {
      const result = await source.read(...args);
      if (window.holdSkyRead) await new Promise((resolve) => {
        window.skyPendingReads = [...(window.skyPendingReads || []), resolve];
        window.releaseSkyRead = () => { window.holdSkyRead = false; window.skyPendingReads.splice(0).forEach((release) => release()); };
      });
      return result;
    } };
  }, [owner]);
  const library = new URLSearchParams(location.search).get('library');
  return <MemoryRouter initialEntries={['/journal/library?month=2026-10&view=night-sky']}><div className="app">
    <button onClick={() => setEntries([{ ...first, intensity: 9 }])}>Edit mood</button>
    <button onClick={() => setEntries([{ ...first, dateKey: '2026-09-01' }])}>Move date</button>
    <button onClick={() => setEntries([])}>Delete day</button>
    <button onClick={() => setEntries([first])}>Undo deletion</button>
    <button onClick={() => { setOwner('sky-owner-b'); setEntries([{ ...first, id: 'other', type: 'journal' }]); }}>Owner B</button>
    <button onClick={() => setLocked(true)}>Lock now</button>
    <JournalPrivacyGate locked={locked} code="test" onUnlock={() => setLocked(false)}>
      {library ? <JournalLibrary key={owner} entries={entries} privateStorage={storage} reduceMotion={false} /> : <PersonalNightSky key={owner} entries={entries} moods={moods} />}
    </JournalPrivacyGate>
  </div></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
