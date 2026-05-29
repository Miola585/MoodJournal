import { useState } from 'react';
import { getOrbitPrompt, getOrbitStability, orbitRings, planetSeeds } from './gameUtils';

export function OrbitGame({ onSave }) {
  const [planets, setPlanets] = useState(planetSeeds);
  const stability = getOrbitStability(planets);
  const closest = planets.find((planet) => planet.orbit === 'near') || planets[0];
  const movePlanet = (planetName, orbit) => setPlanets((current) => current.map((planet) => planet.name === planetName ? { ...planet, orbit, velocity: orbit === 'near' ? 3 : orbit === 'middle' ? 2 : 1 } : planet));
  const cyclePlanet = (planetName) => {
    const planet = planets.find((item) => item.name === planetName);
    const nextOrbit = orbitRings[(orbitRings.indexOf(planet.orbit) + 1) % orbitRings.length];
    movePlanet(planetName, nextOrbit);
  };
  const saveOrbit = () => onSave(
    'Orbit Simulator',
    `Stability ${stability}/100. Closest: ${closest.name}.`,
    ['orbit-simulator'],
    { planets, stability, prompt: getOrbitPrompt(closest) }
  );
  return (
    <article className="minigame-card">
      <h3>Featured: Orbit Simulator</h3>
      <p>Move each planet between rings until your emotional system feels balanced.</p>
      <div className="orbit-map deep-orbit">
        {orbitRings.map((orbit) => (
          <div
            className={`orbit-ring ${orbit}`}
            key={orbit}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => movePlanet(event.dataTransfer.getData('text/plain'), orbit)}
          >
            <span>{orbit}</span>
          </div>
        ))}
        {planets.map((planet, index) => (
          <button
            className={`planet ${planet.orbit}`}
            draggable
            key={planet.name}
            onClick={() => cyclePlanet(planet.name)}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', planet.name)}
            style={{ '--planet-color': planet.color, '--planet-size': `${planet.size}px`, '--planet-angle': `${index * 58}deg` }}
            type="button"
          >
            {planet.name}
          </button>
        ))}
      </div>
      <div className="orbit-readout">
        <strong>Stability: {stability}/100</strong>
        <p>{getOrbitPrompt(closest)}</p>
      </div>
      <button onClick={saveOrbit} type="button">Save orbit</button>
    </article>
  );
}
