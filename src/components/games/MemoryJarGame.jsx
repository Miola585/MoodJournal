import { useEffect, useState } from 'react';
import {
  buildMemoryView,
  detectMemoryCategory,
  groupMemoriesByMonth,
  jarAssets
} from './gameUtils';
import { MemoryJarSvg } from './MemoryJarSvg';
import { usePrivateStorageState } from '../../hooks/usePrivateStorageState';

const memoryStorageKey = 'gameMemoryJar';
const marbleColors = ['#e6ad35', '#d95f6d', '#329a9f', '#7868d4', '#df7841', '#6f9f4f', '#c9589c', '#397dbd'];
const marbleTilts = [-5, 4, -2, 6, 2, -6, 3, -3];

export function MemoryJarCollection({ entries, moods }) {
  const memories = entries
    .filter((entry) => (entry.tags || []).includes('memory-jar') || (entry.tags || []).includes('positive-moment'))
    .map((entry) => buildMemoryView(entry, moods))
    .sort((a, b) => new Date(b.created) - new Date(a.created));
  const groups = groupMemoriesByMonth(memories);
  const [selectedMemory, setSelectedMemory] = useState(memories[0] || null);
  const recallMemory = () => {
    if (memories.length === 0) return;
    setSelectedMemory(memories[Math.floor(Math.random() * memories.length)]);
  };
  return (
    <section className="collection-card">
      <h2>Memory Jar</h2>
      <div className="memory-toolbar">
        <button disabled={memories.length === 0} onClick={recallMemory} type="button">Random recall</button>
        <span>{memories.length} saved memor{memories.length === 1 ? 'y' : 'ies'}</span>
      </div>
      {groups.length === 0 ? <p>Add a positive memory from the featured game.</p> : <div className="memory-month-grid">
        {groups.map((group, index) => {
          const jarImage = jarAssets[index % jarAssets.length];
          const jarPosition = index % 2 === 0 ? 'left center' : 'right center';
          return (
            <article className="memory-month-card" key={group.monthKey}>
              <h3>{group.label}</h3>
              <div className="large-memory-jar svg-jar" style={{ '--jar-image': `url("${jarImage}")`, '--jar-position': jarPosition }}>
                {group.memories.map((memory) => (
                  <button
                    className={`memory-ball rarity-${memory.rarity}`}
                    key={memory.id}
                    onClick={() => setSelectedMemory(memory)}
                    style={{ '--memory-color': memory.color }}
                    title={memory.text}
                    type="button"
                  >
                    {memory.day}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>}
      {selectedMemory && <article className="memory-detail">
        <span className={`memory-rarity rarity-${selectedMemory.rarity}`}>{selectedMemory.rarity}</span>
        <h3>{selectedMemory.monthLabel} {selectedMemory.day}</h3>
        <p>{selectedMemory.text}</p>
        <div className="meta">
          <span>{selectedMemory.mood}</span>
          <span>{selectedMemory.category}</span>
          <span>{selectedMemory.intensity}/10</span>
        </div>
      </article>}
    </section>
  );
}

export function MemoryJarGame({ mood, mainToday, privateStorage }) {
  const [memory, setMemory] = useState('');
  const [message, setMessage] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [memories, setMemories, storageError] = usePrivateStorageState(
    privateStorage,
    memoryStorageKey,
    [],
    normalizeStoredMemories
  );
  const memoryText = memory.trim();
  const duplicateToday = memoryText && memories.some((entry) => entry.text.toLowerCase() === memoryText.toLowerCase());

  useEffect(() => {
    if (!selectedMemory) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedMemory(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedMemory]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const addMemory = () => {
    if (!memoryText || duplicateToday) return;
    const category = detectMemoryCategory(memoryText);
    const nextMemory = {
      id: crypto.randomUUID(),
      text: memoryText,
      createdAt: new Date().toISOString(),
      category,
      mood: mood.key,
      intensity: Number(mainToday?.intensity || mood.score || 5)
    };
    setMemories((current) => {
      return layoutMemories([nextMemory, ...current].slice(0, 24));
    });
    setSelectedMemory(nextMemory);
    setMemory('');
    setMessage('Saved to jar.');
  };
  const removeMemory = (id) => {
    if (!window.confirm('Remove this memory from the jar?')) return;
    setMemories((current) => {
      return layoutMemories(current.filter((entry) => entry.id !== id));
    });
    setSelectedMemory(null);
    setMessage('');
  };
  return (
    <div className="game-surface memory-surface">
      <div className="memory-count">{memories.length} memor{memories.length === 1 ? 'y' : 'ies'} saved</div>
      <div className="memory-jar-scene" style={{ '--jar-light': mood.color }}>
        <div className="css-memory-jar" aria-label="Memory jar">
          <MemoryJarSvg />
          <div className="jar-body">
            {memories.length === 0 && <span className="jar-empty-text">A tiny good thing can live here.</span>}
            {memories.map((entry) => (
              <button
                aria-label={`Memory from ${formatMemoryDate(entry.createdAt)}`}
                aria-pressed={selectedMemory?.id === entry.id}
                className={selectedMemory?.id === entry.id ? 'memory-marble selected' : 'memory-marble'}
                key={entry.id}
                onClick={() => setSelectedMemory(entry)}
                style={{
                  '--memory-color': entry.color,
                  '--marble-x': `${entry.x}%`,
                  '--marble-y': `${entry.y}%`,
                  '--marble-tilt': `${entry.tilt}deg`
                }}
                title={entry.text}
                type="button"
              />
            ))}
          </div>
          {selectedMemory && (
            <article className="memory-popover" role="dialog" aria-label="Saved memory" aria-modal="false">
              <span>{formatMemoryDate(selectedMemory.createdAt)}</span>
              <p>{selectedMemory.text}</p>
              <div className="game-action-row">
                <button className="secondary" onClick={() => setSelectedMemory(null)} type="button">Close</button>
                <button className="secondary" onClick={() => removeMemory(selectedMemory.id)} type="button">Remove</button>
              </div>
            </article>
          )}
        </div>
      </div>
      <div className="memory-input-panel">
        <textarea value={memory} onChange={(event) => { setMemory(event.target.value); setMessage(''); }} placeholder="A tiny good thing from today..." />
        <div className="memory-input-actions">
          <button className="primary" disabled={!memoryText || duplicateToday} onClick={addMemory} type="button">Add to jar</button>
          {duplicateToday && <p className="form-error">That memory is already in today's jar.</p>}
          <div className="memory-feedback-slot" aria-live="polite">
            {message && <p className="success-message">{message}</p>}
          </div>
        </div>
      </div>
      {storageError && <p className="form-error" role="alert">{storageError}</p>}
    </div>
  );
}

function formatMemoryDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function getMarblePosition(index) {
  const rows = [
    { y: 88, x: [20, 40, 60, 80] },
    { y: 77, x: [29, 50, 71] },
    { y: 66, x: [20, 40, 60, 80] },
    { y: 55, x: [29, 50, 71] },
    { y: 44, x: [20, 40, 60, 80] },
    { y: 33, x: [29, 50, 71] },
    { y: 22, x: [29, 50, 71] }
  ];
  let remaining = index % 24;
  for (const row of rows) {
    if (remaining < row.x.length) return { x: row.x[remaining], y: row.y };
    remaining -= row.x.length;
  }
  return { x: 50, y: 22 };
}

function layoutMemories(entries) {
  const slotById = new Map(
    [...entries]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((entry, index) => [entry.id, index])
  );
  return entries.map((entry) => {
    const slot = slotById.get(entry.id) ?? 0;
    const position = getMarblePosition(slot);
    return {
      ...entry,
      slot,
      color: marbleColors[slot % marbleColors.length],
      tilt: marbleTilts[slot % marbleTilts.length],
      x: position.x,
      y: position.y
    };
  });
}

function normalizeStoredMemories(value) {
  if (!Array.isArray(value)) return [];
  const normalized = value.map((entry) => ({
    ...entry,
    id: entry.id || crypto.randomUUID(),
    text: entry.text || '',
    createdAt: entry.createdAt || new Date().toISOString()
  })).filter((entry) => entry.text).slice(0, 24);
  return layoutMemories(normalized);
}
