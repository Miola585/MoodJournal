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

export function ConstellationGame({ mood, onSave }) {
  const [selectedStars, setSelectedStars] = useState([]);
  const [name, setName] = useState('');
  const selectedStarData = constellationStars.filter((star) => selectedStars.includes(star.id));
  const connections = buildConnections(selectedStars);
  const archetype = detectConstellationArchetype(selectedStarData, connections);
  const toggleStar = (starId) => setSelectedStars((current) => current.includes(starId) ? current.filter((item) => item !== starId) : [...current, starId]);
  const saveConstellation = () => {
    const payload = {
      name: name.trim(),
      stars: selectedStarData,
      connections,
      mood: mood.key,
      archetype
    };
    onSave('Daily Constellation', `${name.trim()} is a ${archetype} for ${mood.key}.`, ['constellation'], payload);
  };
  return (
    <article className="minigame-card">
      <h3>Featured: Daily Constellation</h3>
      <p>Tap stars, name the shape, and save it to today's journal.</p>
      <div className="star-map constellation-builder">
        <ConstellationLines stars={selectedStarData} connections={connections} mood={mood.key} moods={[mood]} />
        {constellationStars.map((star) => (
          <button
            className={selectedStars.includes(star.id) ? 'star selected' : 'star'}
            key={star.id}
            onClick={() => toggleStar(star.id)}
            style={{ '--star-left': `${star.x}%`, '--star-top': `${star.y}%`, '--star-color': getStarColor(mood, selectedStars.includes(star.id) ? 9 : 5) }}
            type="button"
            aria-label={`Star ${star.id}`}
          />
        ))}
      </div>
      <p className="mini-insight">Shape: {archetype}</p>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Constellation name" />
      <button disabled={!name.trim() || selectedStars.length === 0} onClick={saveConstellation} type="button">Save constellation</button>
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
