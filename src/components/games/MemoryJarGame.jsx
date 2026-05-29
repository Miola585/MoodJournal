import { useState } from 'react';
import {
  buildMemoryView,
  detectMemoryCategory,
  groupMemoriesByMonth,
  jarAssets
} from './gameUtils';

const jarLayerUrls = {
  cafe: new URL('../../../img/Jar Layers/Cafe.png', import.meta.url).href,
  garden: new URL('../../../img/Jar Layers/Garden.jpg', import.meta.url).href,
  night: new URL('../../../img/Jar Layers/Night Background.png', import.meta.url).href,
  ocean: new URL('../../../img/Jar Layers/Sea.png', import.meta.url).href,
  sunset: new URL('../../../img/Jar Layers/Sunset.png', import.meta.url).href
};

const getJarLayer = (moodKey = '') => {
  const key = moodKey.toLowerCase();
  if (['calm', 'content', 'numb'].includes(key)) return jarLayerUrls.cafe;
  if (['happy', 'grateful'].includes(key)) return jarLayerUrls.garden;
  if (['sad', 'lonely', 'tired'].includes(key)) return jarLayerUrls.night;
  if (['anxious', 'panic', 'overwhelmed'].includes(key)) return jarLayerUrls.ocean;
  return jarLayerUrls.sunset;
};

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

export function MemoryJarGame({ mood, mainToday }) {
  const [memory, setMemory] = useState('');
  const [message, setMessage] = useState('');
  const [memories, setMemories] = useState([]);
  const memoryText = memory.trim();
  const duplicateToday = memoryText && memories.some((entry) => entry.text.toLowerCase() === memoryText.toLowerCase());
  const addMemory = () => {
    if (!memoryText || duplicateToday) return;
    const category = detectMemoryCategory(memoryText);
    setMemories((current) => [{
      id: crypto.randomUUID(),
      text: memoryText,
      category,
      mood: mood.key,
      intensity: Number(mainToday?.intensity || mood.score || 5)
    }, ...current].slice(0, 6));
    setMemory('');
    setMessage('Memory added to this reflection jar.');
  };
  return (
    <article className="minigame-card memory-scrapbook-card">
      <h3>Memory Jar</h3>
      <p>Add small moments to this reflection jar. These stay on this page for now and do not create journal entries.</p>
      <div
        className="memory-scrapbook-jar"
        style={{
          '--jar-layer': `url("${getJarLayer(mood.key)}")`,
          '--jar-light': mood.color
        }}
      >
        <div className="memory-jar-glow" />
        <div className="memory-jar-layer" />
        <div className="memory-note-layer">
          {memories.length === 0 && <span className="memory-note empty">A tiny good thing can live here.</span>}
          {memories.map((entry, index) => (
            <button
              className="floating-memory-note"
              key={entry.id}
              style={{ '--note-index': index, '--note-color': mood.color }}
              title={entry.text}
              type="button"
            >
              {entry.text.slice(0, 28)}{entry.text.length > 28 ? '...' : ''}
            </button>
          ))}
        </div>
      </div>
      <textarea value={memory} onChange={(event) => { setMemory(event.target.value); setMessage(''); }} placeholder="A tiny good thing from today..." />
      {duplicateToday && <p className="form-error">That memory is already in today's jar.</p>}
      {message && <p className="success-message">{message}</p>}
      <button disabled={!memoryText || duplicateToday} onClick={addMemory} type="button">Add to jar</button>
    </article>
  );
}
