import { useState } from 'react';
import {
  buildConnections,
  constellationStars,
  detectConstellationArchetype,
  getMoodColor,
  getStarColor,
  parseGamePayload,
  stripGameData
} from './gameUtils';

export function ConstellationGallery({ entries, moods }) {
  const constellations = entries.filter((entry) => (entry.tags || []).includes('constellation'));
  return (
    <section className="collection-card">
      <h2>Saved Constellations</h2>
      {constellations.length === 0 ? <p>No constellations saved yet.</p> : constellations.slice(0, 4).map((entry) => {
        const payload = parseGamePayload(entry);
        const stars = payload?.stars || constellationStars.slice(0, 6);
        const connections = payload?.connections || buildConnections(stars.map((star) => star.id));
        return (
          <article className="saved-constellation" key={entry.id}>
            <ConstellationPreview stars={stars} connections={connections} mood={entry.mood} moods={moods} />
            <p>{stripGameData(entry.note)}</p>
          </article>
        );
      })}
    </section>
  );
}

export function ConstellationGame({ mood }) {
  const [selectedStars, setSelectedStars] = useState([]);
  const [connections, setConnections] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const selectedStarData = constellationStars.filter((star) => selectedStars.includes(star.id));
  const archetype = detectConstellationArchetype(selectedStarData, connections);
  const addStar = (starId) => setSelectedStars((current) => current.includes(starId) ? current : [...current, starId]);
  const connectStars = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    addStar(fromId);
    addStar(toId);
    setConnections((current) => {
      const exists = current.some(([from, to]) => (
        (from === fromId && to === toId) || (from === toId && to === fromId)
      ));
      return exists ? current : [...current, [fromId, toId]];
    });
  };
  const removeLastConnection = () => {
    setConnections((current) => current.slice(0, -1));
  };
  const finishConstellation = () => {
    setMessage(`${name.trim()} is a ${archetype} constellation for ${mood.key}.`);
  };
  return (
    <article className="minigame-card">
      <h3>Daily Constellation</h3>
      <p>Press a star, drag to another star, and release to connect them.</p>
      <div className="star-map constellation-builder">
        <ConstellationLines stars={selectedStarData} connections={connections} mood={mood.key} moods={[mood]} />
        {constellationStars.map((star) => (
          <button
            className={`${selectedStars.includes(star.id) ? 'star selected' : 'star'} ${dragStart === star.id ? 'dragging' : ''}`}
            key={star.id}
            onPointerDown={(event) => {
              event.preventDefault();
              setDragStart(star.id);
              addStar(star.id);
            }}
            onPointerUp={() => {
              connectStars(dragStart, star.id);
              setDragStart(null);
            }}
            onPointerCancel={() => setDragStart(null)}
            style={{ '--star-left': `${star.x}%`, '--star-top': `${star.y}%`, '--star-color': mood.color }}
            type="button"
            aria-label={`Drag from or to star ${star.id}`}
          />
        ))}
      </div>
      <p className="mini-insight">Shape: {archetype} · {connections.length} connection{connections.length === 1 ? '' : 's'}</p>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Constellation name" />
      <div className="game-action-row">
        <button disabled={connections.length === 0} onClick={removeLastConnection} type="button">Undo line</button>
        <button disabled={!name.trim() || selectedStars.length === 0} onClick={finishConstellation} type="button">Finish constellation</button>
      </div>
      {message && <p className="success-message">{message}</p>}
    </article>
  );
}

function ConstellationLines({ stars, connections, mood, moods = [] }) {
  return (
    <svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {connections.map(([fromId, toId]) => {
        const from = stars.find((star) => star.id === fromId);
        const to = stars.find((star) => star.id === toId);
        if (!from || !to) return null;
        return <line key={`${fromId}-${toId}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ '--line-color': getMoodColor(moods, mood) }} />;
      })}
    </svg>
  );
}

function ConstellationPreview({ stars, connections, mood, moods }) {
  return (
    <div className="mini-sky">
      <ConstellationLines stars={stars} connections={connections} mood={mood} moods={moods} />
      {stars.map((star) => <span key={star.id} style={{ left: `${star.x}%`, top: `${star.y}%`, '--star-color': getStarColor(moods.find((item) => item.key === mood), 7) }} />)}
    </div>
  );
}
