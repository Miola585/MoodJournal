import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { getOrbitPrompt, normalizeStoredOrbit, orbitRingLabels, orbitRings, planetSeeds } from './gameUtils';
import { todayKey } from '../../utils/journalUtils';

const ringRadii = { close: 0.17, between: 0.3, far: 0.43 };
const planetLabels = { Emotion: 'Emotions', Thought: 'Thoughts', Goal: 'Goals', Habit: 'Habits', Relationship: 'Relationships' };

export function OrbitGame({ privateStorage }) {
  const today = todayKey();
  const storageKey = `moodOrbit:${today}`;
  const stageRef = useRef(null);
  const dialogRef = useRef(null);
  const dragRef = useRef(null);
  const [planets, setPlanets] = useState(planetSeeds);
  const [selectedPlanet, setSelectedPlanet] = useState('');
  const [draggingPlanet, setDraggingPlanet] = useState('');
  const [activeRing, setActiveRing] = useState('');
  const [reflection, setReflection] = useState('');
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState('');
  const selected = planets.find((planet) => planet.name === selectedPlanet) || null;

  useEffect(() => {
    let active = true;
    privateStorage.read(storageKey, null)
      .then((saved) => {
        if (!active || !saved) return;
        setPlanets(normalizeStoredOrbit(saved));
        if (typeof saved?.reflection === 'string') setReflection(saved.reflection.slice(0, 2000));
      })
      .catch((error) => {
        if (active) setStorageError(error.message);
      });
    return () => {
      active = false;
    };
  }, [privateStorage, storageKey]);

  const movePlanet = (planetName, orbit, angle = null) => {
    setPlanets((current) => current.map((planet) => (
      planet.name === planetName
        ? { ...planet, orbit, angle: angle ?? planet.angle }
        : planet
    )));
    setSelectedPlanet(planetName);
    setMessage('');
  };

  const updateDragTarget = (event, planetName) => {
    if (!stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const dx = (event.clientX - centerX) / bounds.width;
    const dy = (event.clientY - centerY) / bounds.height;
    const distance = Math.hypot(dx, dy);
    const nearestRing = orbitRings.reduce((nearest, orbit) => (
      Math.abs(ringRadii[orbit] - distance) < Math.abs(ringRadii[nearest] - distance) ? orbit : nearest
    ), 'close');
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    setActiveRing(nearestRing);
    movePlanet(planetName, nearestRing, angle);
    return nearestRing;
  };

  const resetOrbit = () => {
    setPlanets(planetSeeds);
    setSelectedPlanet('');
    setReflection('');
    setMessage('Layout reset. Finish orbit to save this arrangement.');
  };

  const finishOrbit = async () => {
    setStorageError('');
    try {
      await privateStorage.write(storageKey, { version: 2, planets, reflection: reflection.trim() });
      setMessage('Saved. You can come back later and see what moved.');
      dialogRef.current?.close();
    } catch (error) {
      setStorageError(error.message);
    }
  };

  return (
    <div className="game-surface orbit-surface">
      <div className={`orbit-map deep-orbit mood-orbit-map ${activeRing ? `active-ring-${activeRing}` : ''}`} ref={stageRef}>
        <svg className="orbit-ring-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {orbitRings.map((orbit) => (
            <ellipse className={`orbit-ring-line ${orbit} ${activeRing === orbit ? 'active' : ''}`} cx="50" cy="50" key={orbit} rx={ringRadii[orbit] * 100} ry={ringRadii[orbit] * 100} />
          ))}
        </svg>
        <span className="orbit-center-glow" aria-hidden="true" />
        <div className="orbit-center" aria-hidden="true"><span>Me today</span></div>
        {orbitRings.map((orbit) => (
          <div className={`orbit-ring ${orbit}`} key={orbit} style={{ '--ring-radius': `${ringRadii[orbit] * 100}%` }}>
            <span>{orbitRingLabels[orbit]}</span>
          </div>
        ))}
        {planets.map((planet) => (
          <button
            aria-label={`Move ${planetLabels[planet.name] || planet.name} planet`}
            aria-pressed={selectedPlanet === planet.name}
            className={`planet ${planet.orbit} ${selectedPlanet === planet.name ? 'selected' : ''} ${draggingPlanet === planet.name ? 'dragging' : ''}`}
            key={planet.name}
            onClick={() => setSelectedPlanet(planet.name)}
            onKeyDown={(event) => {
              const index = Number(event.key) - 1;
              if (index >= 0 && index < orbitRings.length) movePlanet(planet.name, orbitRings[index]);
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              setDraggingPlanet('');
              setActiveRing('');
            }}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { pointerId: event.pointerId, name: planet.name, x: event.clientX, y: event.clientY, moved: false };
              setDraggingPlanet(planet.name);
              setSelectedPlanet(planet.name);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId || drag.name !== planet.name) return;
              if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
              drag.moved = true;
              updateDragTarget(event, planet.name);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              const drag = dragRef.current;
              if (drag?.pointerId === event.pointerId && drag.moved) {
                const orbit = updateDragTarget(event, planet.name);
                if (orbit) setMessage(`${planet.name} feels ${orbitRingLabels[orbit].toLowerCase()} today.`);
              }
              dragRef.current = null;
              setDraggingPlanet('');
              setActiveRing('');
            }}
            style={{
              '--planet-color': planet.color,
              '--planet-size': `${planet.size}px`,
              left: `${50 + Math.cos((planet.angle * Math.PI) / 180) * ringRadii[planet.orbit] * 100}%`,
              top: `${50 + Math.sin((planet.angle * Math.PI) / 180) * ringRadii[planet.orbit] * 100}%`
            }}
            type="button"
          >
            <span>{planetLabels[planet.name] || planet.name}</span>
          </button>
        ))}
      </div>
      <div className="orbit-guidance" aria-live="polite">
        <strong>{selected ? planetLabels[selected.name] || selected.name : 'Choose a planet to explore its place in your day.'}</strong>
        <p>{selected ? getOrbitPrompt(selected) : 'Drag to move it, or use the distance buttons.'}</p>
      </div>
      <div className="orbit-control-panel">
        <div className="orbit-footer-copy"><strong>Your orbit, your pace.</strong><span>Every arrangement belongs here.</span></div>
        <div className="orbit-actions">
          <button className="secondary" onClick={resetOrbit} type="button"><RotateCcw aria-hidden="true" size={16} /> Reset</button>
          <button className="secondary" onClick={() => dialogRef.current?.showModal()} type="button">Reflect</button>
          <button className="primary finish-orbit" onClick={finishOrbit} type="button">Finish orbit</button>
        </div>
      </div>
      {selected && (
        <div className="orbit-ring-buttons" aria-label="Move selected planet" role="group">
          {orbitRings.map((orbit) => (
            <button
              aria-pressed={selected.orbit === orbit}
              className={selected.orbit === orbit ? 'orbit-distance-button selected' : 'orbit-distance-button'}
              key={orbit}
              onClick={() => movePlanet(selected.name, orbit)}
              type="button"
            >
              {orbitRingLabels[orbit]}
            </button>
          ))}
        </div>
      )}
      {message && <p className="orbit-message" role="status">{message}</p>}
      {storageError && <p className="form-error" role="alert">{storageError}</p>}
      <dialog className="orbit-reflection-dialog" ref={dialogRef} aria-labelledby="orbit-reflection-title" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <button className="orbit-dialog-close" onClick={() => dialogRef.current?.close()} type="button" aria-label="Close reflection"><X aria-hidden="true" size={20} /></button>
        <h2 id="orbit-reflection-title">Your orbit today</h2>
        <p>Distance shows presence, not importance. There is no ideal orbit.</p>
        <div className="orbit-reflection-list">
          {orbitRings.map((orbit) => (
            <div className="orbit-reflection-row" key={orbit}>
              <strong>{orbitRingLabels[orbit]}</strong>
              <span>{planets.filter((planet) => planet.orbit === orbit).map((planet) => planet.name).join(', ') || 'Nothing here today'}</span>
            </div>
          ))}
        </div>
        <label htmlFor="orbit-reflection">Anything you would like to remember?</label>
        <textarea id="orbit-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000} rows={3} placeholder="Today I noticed..." />
        <button className="primary" onClick={finishOrbit} type="button">Save orbit and reflection</button>
        {storageError && <p className="form-error" role="alert">{storageError}</p>}
      </dialog>
    </div>
  );
}
