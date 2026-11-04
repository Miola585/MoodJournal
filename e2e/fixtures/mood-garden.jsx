import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles.css';
import { MoodGardenGame } from '../../src/components/games/MoodGardenGame';
import { moods } from '../../src/data/journalData';
import { createPrivateStorage } from '../../src/utils/privateStorage';

const privateStorage = createPrivateStorage({ ownerId: 'local-browser', encryptionEnabled: false });
createRoot(document.getElementById('root')).render(
  <div className="app"><main className="app-container"><MoodGardenGame mood={moods[0]} mainToday={null} privateStorage={privateStorage} /></main></div>
);
