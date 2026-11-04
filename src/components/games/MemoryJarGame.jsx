import { useState } from 'react';
import { buildMemoryView, groupMemoriesByMonth } from './gameUtils';
export { MemoryJarGame } from './MemoryJarExperience';

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
        {groups.map((group) => (
          <article className="memory-month-card" key={group.monthKey}>
            <h3>{group.label}</h3>
            <div className="large-memory-jar svg-jar">
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
        ))}
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
