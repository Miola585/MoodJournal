import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '../../src/styles.css';
import { GameArchive } from '../../src/components/games/GameArchive';
import { createPrivateStorage } from '../../src/utils/privateStorage';

const privateStorage = createPrivateStorage({ ownerId: 'local-browser', encryptionEnabled: false });
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={[`/game-archive${window.location.search}`]}>
    <div className="app"><main className="app-container"><Routes><Route path="/game-archive" element={<GameArchive privateStorage={privateStorage} />} /></Routes></main></div>
  </MemoryRouter>
);
