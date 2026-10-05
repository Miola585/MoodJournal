import { useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { usePrivateStorageState } from '../../hooks/usePrivateStorageState';
import { constellationArtwork as starSprites } from './gameArtwork';
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

export function ConstellationGame({ mood, privateStorage }) {
  const starfieldRef = useRef(null);
  const previewLineRef = useRef(null);
  const pointerGestureRef = useRef(null);
  const [connections, setConnections] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [targetStar, setTargetStar] = useState(null);
  const [pulsingStars, setPulsingStars] = useState([]);
  const [name, setName] = useState('');
  const [savedConstellation, setSavedConstellation] = useState(null);
  const [, setStoredConstellations, storageError] = usePrivateStorageState(
    privateStorage,
    constellationStorageKey,
    [],
    (value) => Array.isArray(value) ? value.slice(0, 12) : []
  );
  const selectedStars = [...new Set(connections.flat())];
  const selectedStarData = constellationStars.filter((star) => selectedStars.includes(star.id));
  const archetype = detectConstellationArchetype(selectedStarData, connections);

  const savedPreview = useMemo(() => {
    if (!savedConstellation) return null;
    return {
      ...savedConstellation,
      stars: constellationStars.filter((star) => savedConstellation.stars.includes(star.id))
    };
  }, [savedConstellation]);

  const nearestStar = (clientX, clientY, excludeId) => {
    const bounds = starfieldRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    let nearest = null;
    let distance = 34;
    for (const star of constellationStars) {
      if (star.id === excludeId) continue;
      const nextDistance = Math.hypot(
        bounds.left + (star.x / 100) * bounds.width - clientX,
        bounds.top + (star.y / 100) * bounds.height - clientY
      );
      if (nextDistance < distance) {
        nearest = star;
        distance = nextDistance;
      }
    }
    return nearest;
  };

  const hidePreview = () => {
    previewLineRef.current?.setAttribute('visibility', 'hidden');
    setTargetStar(null);
  };

  const hasConnection = (fromId, toId) => connections.some(([from, to]) => (
    (from === fromId && to === toId) || (from === toId && to === fromId)
  ));

  const updatePreview = (event) => {
    const gesture = pointerGestureRef.current;
    if (gesture && gesture.pointerId !== event.pointerId) return;
    const fromId = gesture?.fromId || dragStart;
    const from = constellationStars.find((star) => star.id === fromId);
    const bounds = starfieldRef.current?.getBoundingClientRect();
    const line = previewLineRef.current;
    if (!from || !bounds || !line) return;
    const target = nearestStar(event.clientX, event.clientY, fromId);
    if (target && hasConnection(fromId, target.id)) {
      hidePreview();
      return;
    }
    const x = target?.x ?? Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = target?.y ?? Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y);
    line.style.setProperty('--preview-color', target ? '#ffe2a3' : '#d8c8ff');
    line.setAttribute('visibility', 'visible');
    setTargetStar((current) => current === target?.id ? current : target?.id || null);
  };

  const connectStars = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId || hasConnection(fromId, toId)) return;
    setSavedConstellation(null);
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
    hidePreview();
  };

  const finishPointerGesture = (event) => {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    pointerGestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const target = nearestStar(event.clientX, event.clientY, gesture.fromId);
    if (target) {
      connectStars(gesture.fromId, target.id);
      stopDragging();
    } else if (gesture.hadSelection || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 8) {
      stopDragging();
    } else {
      hidePreview();
    }
  };

  const removeLastConnection = () => {
    setConnections((current) => current.slice(0, -1));
    stopDragging();
    setPulsingStars([]);
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
    setStoredConstellations((current) => [constellation, ...current].slice(0, 12));
    setSavedConstellation(constellation);
  };

  return (
    <div className="game-surface constellation-surface">
      <div
        className="star-map constellation-builder constellation-stage"
        onPointerMove={updatePreview}
        onPointerLeave={() => { if (!pointerGestureRef.current) hidePreview(); }}
        onPointerUp={finishPointerGesture}
        onPointerCancel={() => { pointerGestureRef.current = null; stopDragging(); }}
        ref={starfieldRef}
      >
        <ConstellationLines stars={selectedStarData} connections={connections} mood={mood.key} moods={[mood]} />
        <svg className="constellation-lines preview-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line ref={previewLineRef} visibility="hidden" />
        </svg>
        {constellationStars.map((star) => {
          const connected = selectedStars.includes(star.id);
          const validTarget = dragStart && dragStart !== star.id && targetStar === star.id;
          return (
            <button
              aria-label={`Star ${star.id}`}
              aria-pressed={connected}
              className={`${connected || dragStart === star.id ? 'star selected' : 'star'} ${dragStart === star.id ? 'dragging' : ''} ${validTarget ? 'valid-target' : ''} ${pulsingStars.includes(star.id) ? 'pulse' : ''}`}
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
              }}
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0 || pointerGestureRef.current) return;
                event.preventDefault();
                starfieldRef.current?.setPointerCapture(event.pointerId);
                pointerGestureRef.current = {
                  pointerId: event.pointerId,
                  fromId: dragStart || star.id,
                  hadSelection: Boolean(dragStart),
                  x: event.clientX,
                  y: event.clientY
                };
                if (!dragStart) {
                  setDragStart(star.id);
                }
              }}
              style={{
                '--star-left': `${star.x}%`,
                '--star-top': `${star.y}%`,
                '--star-color': getStarColor(mood, mood.score),
                '--star-size': `${star.size}px`,
                '--star-glow': `${star.glow}px`,
                '--star-opacity': star.opacity,
                '--star-sprite': `url("${starSprites[star.id % starSprites.length]}")`,
                '--star-active-sprite': `url("${starSprites[(star.id + 2) % starSprites.length]}")`
              }}
              type="button"
            >
              <span className="star-hit-label">{connected ? `Connected star ${star.id}` : `Star ${star.id}`}</span>
              <span className="playable-star-sprite" aria-hidden="true" />
              {pulsingStars.includes(star.id) && <span className="endpoint-sparkle" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="constellation-toolbar">
        <span className="mini-insight">{connections.length} connection{connections.length === 1 ? '' : 's'} · {archetype}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name your constellation" />
        <button className="secondary constellation-undo" disabled={connections.length === 0} onClick={removeLastConnection} type="button" title="Undo last connection"><Undo2 aria-hidden="true" size={17} /> Undo</button>
        <button className="primary" disabled={connections.length === 0} onClick={finishConstellation} type="button">Finish constellation</button>
      </div>
      {savedPreview && (
        <article className="game-success-card">
          <strong>{savedPreview.name === 'Today\'s constellation' ? 'Constellation saved.' : `Today's constellation: ${savedPreview.name}`}</strong>
          <ConstellationPreview stars={savedPreview.stars} connections={savedPreview.connections} mood={savedPreview.mood} moods={[mood]} />
        </article>
      )}
      {storageError && <p className="form-error" role="alert">{storageError}</p>}
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
