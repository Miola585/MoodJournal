import { useState } from 'react';
import {
  buildMemoryView,
  detectMemoryCategory,
  groupMemoriesByMonth,
  jarAssets
} from './gameUtils';

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

export function MemoryJarGame({ entries, moods, todayKey, onSave }) {
  const [memory, setMemory] = useState('');
  const [message, setMessage] = useState('');
  const memoryText = memory.trim();
  const previousMemories = entries.filter((entry) => (entry.tags || []).includes('memory-jar')).map((entry) => buildMemoryView(entry, moods)).slice(0, 3);
  const duplicateToday = memoryText && entries.some((entry) => (
    entry.dateKey === todayKey()
    && (entry.tags || []).includes('memory-jar')
    && buildMemoryView(entry, moods).text.toLowerCase() === memoryText.toLowerCase()
  ));
  const saveMemory = async () => {
    if (!memoryText || duplicateToday) return;
    const category = detectMemoryCategory(memoryText);
    await onSave('Memory Jar', memoryText, ['memory-jar', 'positive-moment', `category-${category}`], { text: memoryText, category });
    setMemory('');
    setMessage('Memory saved to your jar.');
  };
  return (
    <article className="minigame-card">
      <h3>Memory Jar</h3>
      <p>Add one small positive moment to revisit later.</p>
      <div className="memory-jar svg-jar" style={{ '--jar-image': `url("${jarAssets[0]}")`, '--jar-position': 'left center' }}>
        {memory ? <span>{memory}</span> : previousMemories.length > 0 ? previousMemories.map((entry) => <span key={entry.id} style={{ '--memory-color': entry.color }}>{entry.day}</span>) : <span>Write a memory below</span>}
      </div>
      <textarea value={memory} onChange={(event) => { setMemory(event.target.value); setMessage(''); }} placeholder="A tiny good thing from today..." />
      {duplicateToday && <p className="form-error">That memory is already in today's jar.</p>}
      {message && <p className="success-message">{message}</p>}
      <button disabled={!memoryText || duplicateToday} onClick={saveMemory} type="button">Save memory</button>
    </article>
  );
}
