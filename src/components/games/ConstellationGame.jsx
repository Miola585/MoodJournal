import { useMemo, useRef, useState } from 'react';
import {
  buildConnections,
  constellationStars,
  detectConstellationArchetype,
  getMoodColor,
  getStarColor,
  parseGamePayload,
  stripGameData
} from './gameUtils';

const constellationStorageKey = 'gameConstellations';
const starSprites = [
  new URL('../../../img/stars/trimmed/four_point_star.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/four_point_star_purple.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/inv_fp.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/inv_purp.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/p_star.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/purple_star.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star1.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star2.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star3.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star4.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star5.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star6.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star7.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star8.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star9.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star10.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star11.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star12.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star13.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star14.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star15.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star16.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star17.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/star18.png', import.meta.url).href,
  new URL('../../../img/stars/trimmed/yellow_star.png', import.meta.url).href
];
const promptChips = ['Make a path', 'Make a shelter', 'Make something steady', 'Make today\'s shape'];

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
  const starfieldRef = useRef(null);
  const [selectedStars, setSelectedStars] = useState([]);
  const [connections, setConnections] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [targetStar, setTargetStar] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);
  const [fadingPreview, setFadingPreview] = useState(null);
  const [pulsingStars, setPulsingStars] = useState([]);
  const [name, setName] = useState('');
  const [savedConstellation, setSavedConstellation] = useState(null);
  const selectedStarData = constellationStars.filter((star) => selectedStars.includes(star.id));
  const archetype = detectConstellationArchetype(selectedStarData, connections);
  const lineColor = getMoodColor([mood], mood.key);
  const previewStart = constellationStars.find((star) => star.id === dragStart);

  const savedPreview = useMemo(() => {
    if (!savedConstellation) return null;
    return {
      ...savedConstellation,
      stars: constellationStars.filter((star) => savedConstellation.stars.includes(star.id))
    };
  }, [savedConstellation]);

  const addStar = (starId) => setSelectedStars((current) => current.includes(starId) ? current : [...current, starId]);

  const updatePreviewPoint = (event) => {
    if (!dragStart || !starfieldRef.current) return;
    const bounds = starfieldRef.current.getBoundingClientRect();
    setPreviewPoint({
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))
    });
  };

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
    setPulsingStars([fromId, toId]);
    window.setTimeout(() => setPulsingStars([]), 520);
  };

  const stopDragging = () => {
    setDragStart(null);
    setTargetStar(null);
    setPreviewPoint(null);
  };

  const fadeInvalidPreview = () => {
    if (previewStart && previewPoint) {
      setFadingPreview({ id: `${dragStart}-${Date.now()}`, from: previewStart, to: previewPoint });
      window.setTimeout(() => setFadingPreview(null), 280);
    }
    stopDragging();
  };

  const removeLastConnection = () => {
    setConnections((current) => current.slice(0, -1));
    setSavedConstellation(null);
  };

  const finishConstellation = () => {
    if (connections.length === 0) return;
    const finalName = name.trim() || 'Today\'s constellation';
    const constellation = {
      id: crypto.randomUUID(),
      name: finalName,
      mood: mood.key,
      archetype,
      createdAt: new Date().toISOString(),
      stars: selectedStars,
      connections
    };
    const saved = readStoredList(constellationStorageKey);
    localStorage.setItem(constellationStorageKey, JSON.stringify([constellation, ...saved].slice(0, 12)));
    setSavedConstellation(constellation);
  };

  return (
    <div className="game-surface constellation-surface">
      <p className="game-instruction">Drag from one star to another to connect them.</p>
      <div className="constellation-prompt-chips" aria-label="Constellation shape ideas">
        <span>Try:</span>
        {promptChips.map((chip) => <span key={chip}>{chip}</span>)}
      </div>
      <div
        className="star-map constellation-builder constellation-stage"
        onPointerMove={updatePreviewPoint}
        onPointerLeave={fadeInvalidPreview}
        onPointerUp={fadeInvalidPreview}
        ref={starfieldRef}
      >
        <ConstellationLines stars={selectedStarData} connections={connections} mood={mood.key} moods={[mood]} />
        {previewStart && previewPoint && (
          <svg className="constellation-lines preview-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
              x1={previewStart.x}
              y1={previewStart.y}
              x2={targetStar ? constellationStars.find((star) => star.id === targetStar)?.x : previewPoint.x}
              y2={targetStar ? constellationStars.find((star) => star.id === targetStar)?.y : previewPoint.y}
              style={{ '--line-color': lineColor }}
            />
          </svg>
        )}
        {fadingPreview && (
          <svg className="constellation-lines fading-preview-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
              x1={fadingPreview.from.x}
              y1={fadingPreview.from.y}
              x2={fadingPreview.to.x}
              y2={fadingPreview.to.y}
              style={{ '--line-color': lineColor }}
            />
          </svg>
        )}
        {constellationStars.map((star) => {
          const connected = selectedStars.includes(star.id);
          const validTarget = dragStart && dragStart !== star.id && targetStar === star.id;
          return (
            <button
              aria-label={`Star ${star.id}`}
              aria-pressed={connected}
              className={`${connected ? 'star selected' : 'star'} ${dragStart === star.id ? 'dragging' : ''} ${validTarget ? 'valid-target' : ''} ${pulsingStars.includes(star.id) ? 'pulse' : ''}`}
              key={star.id}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (dragStart && dragStart !== star.id) {
                  connectStars(dragStart, star.id);
                  stopDragging();
                  return;
                }
                setDragStart(star.id);
                addStar(star.id);
                setPreviewPoint({ x: star.x, y: star.y });
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                setDragStart(star.id);
                addStar(star.id);
                updatePreviewPoint(event);
              }}
              onPointerEnter={() => {
                if (dragStart && dragStart !== star.id) setTargetStar(star.id);
              }}
              onPointerLeave={() => {
                if (targetStar === star.id) setTargetStar(null);
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
                connectStars(dragStart, star.id);
                stopDragging();
              }}
              onPointerCancel={stopDragging}
              style={{
                '--star-left': `${star.x}%`,
                '--star-top': `${star.y}%`,
                '--star-color': getStarColor(mood, mood.score),
                '--star-size': `${star.size}px`,
                '--star-glow': `${star.glow}px`,
                '--star-opacity': star.opacity,
                '--star-sprite': `url("${starSprites[star.id % starSprites.length]}")`,
                '--star-hover-sprite': `url("${starSprites[(star.id + 2) % starSprites.length]}")`,
                '--star-connected-sprite': `url("${starSprites[(star.id + 7) % starSprites.length]}")`
              }}
              type="button"
            >
              <span className="star-hit-label">{connected ? `Connected star ${star.id}` : `Star ${star.id}`}</span>
              <span className="playable-star-sprite default" aria-hidden="true" />
              <span className="playable-star-sprite hover" aria-hidden="true" />
              <span className="playable-star-sprite connected" aria-hidden="true" />
              {pulsingStars.includes(star.id) && <span className="endpoint-sparkle" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="constellation-toolbar">
        <span className="mini-insight">{connections.length} connection{connections.length === 1 ? '' : 's'} · {archetype}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name your constellation" />
        <button className="secondary" disabled={connections.length === 0} onClick={removeLastConnection} type="button">Undo line</button>
        <button className="primary" disabled={connections.length === 0} onClick={finishConstellation} type="button">Finish constellation</button>
      </div>
      {savedPreview && (
        <article className="game-success-card">
          <strong>{savedPreview.name === 'Today\'s constellation' ? 'Constellation saved.' : `Today's constellation: ${savedPreview.name}`}</strong>
          <ConstellationPreview stars={savedPreview.stars} connections={savedPreview.connections} mood={savedPreview.mood} moods={[mood]} />
        </article>
      )}
    </div>
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
      {stars.map((star) => (
        <span
          key={star.id}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            '--star-color': getStarColor(moods.find((item) => item.key === mood), 7)
          }}
        />
      ))}
    </div>
  );
}

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
