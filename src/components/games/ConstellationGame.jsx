import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import { todayKey } from '../../utils/journalUtils';
import { ConstellationDecal } from '../journal/ConstellationDecal';
import { useGameStorageState } from '../../hooks/useGameStorageState';
import { normalizeConstellations } from './gameArchiveData';
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
  const completionRef = useRef(null);
  const toolbarRef = useRef(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  useEffect(() => {
    const surface = starfieldRef.current.parentElement;
    const heading = surface.closest('.standalone-game-screen')?.querySelector('.immersive-route-header');
    const intro = heading?.querySelector('.immersive-game-intro');
    const toolbar = toolbarRef.current;
    let frame;
    const update = () => {
      const bounds = surface.getBoundingClientRect();
      const headingBottom = heading ? Math.max(heading.getBoundingClientRect().bottom, intro?.getBoundingClientRect().bottom || 0) - bounds.top : 0;
      surface.style.setProperty('--constellation-heading-bottom', `${headingBottom}px`);
      surface.style.setProperty('--constellation-controls-height', `${toolbar.offsetHeight}px`);
      // Keep the existing saved coordinate system while fitting its occupied region between controls.
      const top = headingBottom + 32;
      const bottom = toolbar.getBoundingClientRect().top - bounds.top - 32;
      const minY = Math.min(...constellationStars.map((star) => star.y)) / 100;
      const maxY = Math.max(...constellationStars.map((star) => star.y)) / 100;
      const height = Math.max(1, (bottom - top) / (maxY - minY));
      surface.style.setProperty('--constellation-stage-top', `${top - minY * height}px`);
      surface.style.setProperty('--constellation-stage-height', `${height}px`);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    observer.observe(surface);
    observer.observe(toolbar);
    if (heading) observer.observe(heading);
    if (intro) observer.observe(intro);
    update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    if (!completionOpen) return;
    const dialog = completionRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (trigger?.isConnected) trigger.focus(); };
  }, [completionOpen]);
  const [, setStoredConstellations, storageError, canSave] = useGameStorageState(
    privateStorage,
    constellationStorageKey,
    normalizeConstellations
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

  const finishConstellation = async () => {
    if (connections.length === 0 || !canSave) return;
    const finalName = name.trim() || 'Today\'s constellation';
    const constellation = {
      id: crypto.randomUUID(),
      name: finalName,
      mood: mood.key,
      archetype,
      createdAt: new Date().toISOString(),
      dateKey: todayKey(),
      aspectRatio: starfieldRef.current?.clientHeight ? starfieldRef.current.clientWidth / starfieldRef.current.clientHeight : 1,
      stars: selectedStars,
      starPositions: selectedStarData,
      connections
    };
    if (await setStoredConstellations((current) => [constellation, ...current])) {
      setSavedConstellation(constellation);
      setCompletionOpen(true);
    }
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
      <div className="constellation-toolbar" ref={toolbarRef}>
        <span className="mini-insight">{connections.length} connection{connections.length === 1 ? '' : 's'} · {archetype}</span>
        <input value={name} onChange={(event) => { setName(event.target.value); setSavedConstellation(null); }} placeholder="Name your constellation" />
        <button className="secondary constellation-undo" disabled={connections.length === 0} onClick={removeLastConnection} type="button" title="Undo last connection"><Undo2 aria-hidden="true" size={17} /> Undo</button>
        <button className="primary" disabled={connections.length === 0 || !canSave || Boolean(savedConstellation)} onClick={finishConstellation} type="button">Finish constellation</button>
      </div>
      {savedPreview && (
        <article className="game-success-card">
          <strong>{savedPreview.name === 'Today\'s constellation' ? 'Constellation saved.' : `Today's constellation: ${savedPreview.name}`}</strong>
          <ConstellationPreview stars={savedPreview.stars} connections={savedPreview.connections} mood={savedPreview.mood} moods={[mood]} />
        </article>
      )}
      {storageError && <p className="form-error" role="alert">{storageError}</p>}
      {completionOpen && savedConstellation && <dialog ref={completionRef} className="constellation-complete-dialog" aria-labelledby="constellation-complete-title" onCancel={() => setCompletionOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setCompletionOpen(false); } }}>
        <span className="sky-decal"><ConstellationDecal constellation={savedConstellation} /></span>
        <p className="app-eyebrow">A little sky, kept</p><h2 id="constellation-complete-title">{savedConstellation.name}</h2>
        <p>Saved on this device, beside today's pages.</p>
        <Link className="primary-button" to={`/journal/library?month=${savedConstellation.dateKey.slice(0, 7)}&day=${savedConstellation.dateKey}`}>Open monthly book</Link>
        <button className="ghost-button" type="button" onClick={() => setCompletionOpen(false)}>Back to the stars</button>
      </dialog>}
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
        <img
          key={star.id}
          src={starSprites[(star.id + 2) % starSprites.length]}
          alt=""
          draggable={false}
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
