import { useRef, useState } from 'react';
import { getOrbitBalanceLabel, getOrbitPrompt, getOrbitStability, orbitRingLabels, orbitRings, planetSeeds } from './gameUtils';

const ringRatios = {
  close: 0.18,
  near: 0.32,
  middle: 0.48,
  far: 0.64
};

const ringCssDistances = {
  close: 'clamp(46px, 10vmin, 86px)',
  near: 'clamp(80px, 17vmin, 142px)',
  middle: 'clamp(112px, 25vmin, 206px)',
  far: 'clamp(136px, 33vmin, 270px)'
};

export function OrbitGame() {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `moodOrbit:${today}`;
  const stageRef = useRef(null);
  const [planets, setPlanets] = useState(() => readStoredOrbit(storageKey) || planetSeeds);
  const [selectedPlanet, setSelectedPlanet] = useState(planets[0]?.name || '');
  const [draggingPlanet, setDraggingPlanet] = useState('');
  const [activeRing, setActiveRing] = useState('');
  const [message, setMessage] = useState('');
  const balanceScore = getOrbitStability(planets);
  const balanceLabel = getOrbitBalanceLabel(balanceScore);
  const closest = [...planets].sort((a, b) => orbitRings.indexOf(a.orbit) - orbitRings.indexOf(b.orbit))[0];
  const selected = planets.find((planet) => planet.name === selectedPlanet) || closest;

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
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const nearestRing = getNearestRing(distance / radius);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    setActiveRing(nearestRing);
    setSelectedPlanet(planetName);
    return { orbit: nearestRing, angle };
  };

  const finishDrag = (event, planetName) => {
    const next = updateDragTarget(event, planetName);
    if (next) movePlanet(planetName, next.orbit, next.angle);
    setDraggingPlanet('');
    setActiveRing('');
  };

  const finishOrbit = () => {
    localStorage.setItem(storageKey, JSON.stringify(planets));
    setMessage('Saved. You can come back later and see what moved.');
  };

  return (
    <div className="game-surface orbit-surface">
      <p className="game-instruction">Drag each planet to show what feels closest to you right now.</p>
      <div
        className={`orbit-map deep-orbit mood-orbit-map ${activeRing ? `active-ring-${activeRing}` : ''}`}
        ref={stageRef}
      >
        <div className="orbit-center" aria-hidden="true"><span>Me today</span></div>
        {orbitRings.map((orbit) => (
          <div className={`orbit-ring ${orbit}`} key={orbit}>
            <span>{orbitRingLabels[orbit]}</span>
          </div>
        ))}
        {planets.map((planet) => (
          <button
            aria-label={`Move ${planet.name} planet`}
            className={`planet ${planet.orbit} ${selectedPlanet === planet.name ? 'selected' : ''} ${draggingPlanet === planet.name ? 'dragging' : ''}`}
            key={planet.name}
            onClick={() => setSelectedPlanet(planet.name)}
            onKeyDown={(event) => {
              const index = Number(event.key) - 1;
              if (index >= 0 && index < orbitRings.length) movePlanet(planet.name, orbitRings[index]);
            }}
            onPointerCancel={() => {
              setDraggingPlanet('');
              setActiveRing('');
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggingPlanet(planet.name);
              updateDragTarget(event, planet.name);
            }}
            onPointerMove={(event) => {
              if (draggingPlanet === planet.name) updateDragTarget(event, planet.name);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              finishDrag(event, planet.name);
            }}
            style={{
              '--planet-color': planet.color,
              '--planet-size': `${planet.size}px`,
              '--planet-angle': `${planet.angle}deg`,
              '--planet-distance': ringCssDistances[planet.orbit]
            }}
            type="button"
          >
            {planet.name}
          </button>
        ))}
      </div>
      <div className="orbit-control-panel">
        <div className="orbit-readout">
          <strong>Balance: {balanceLabel}</strong>
          <small>{balanceScore}/100</small>
          <p>{getOrbitPrompt(selected)}</p>
        </div>
        <div className="orbit-ring-buttons" aria-label="Move selected planet" role="group">
          {orbitRings.map((orbit, index) => (
            <button
              className={selected?.orbit === orbit ? 'chip selected' : 'chip'}
              disabled={!selected}
              key={orbit}
              onClick={() => movePlanet(selected.name, orbit)}
              type="button"
            >
              Move {orbitRingLabels[orbit].toLowerCase()}
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
        <button className="primary finish-orbit" onClick={finishOrbit} type="button">Finish orbit</button>
      </div>
      {message && <p className="success-message">{message}</p>}
    </div>
  );
}

function getNearestRing(value) {
  return orbitRings.reduce((nearest, orbit) => (
    Math.abs(ringRatios[orbit] - value) < Math.abs(ringRatios[nearest] - value) ? orbit : nearest
  ), 'close');
}

function readStoredOrbit(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(saved)) return null;
    return planetSeeds.map((seed) => ({ ...seed, ...(saved.find((planet) => planet.name === seed.name) || {}) }));
  } catch {
    return null;
  }
}
