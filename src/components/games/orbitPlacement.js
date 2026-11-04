export const orbitRingRadii = { close: 0.17, between: 0.3, far: 0.43 };

function boundsAt(planet, size, stage) {
  const radians = planet.angle * Math.PI / 180;
  const radius = orbitRingRadii[planet.orbit];
  const x = (0.5 + Math.cos(radians) * radius) * stage.width;
  const y = (0.5 + Math.sin(radians) * radius) * stage.height;
  return { left: x - size.halfWidth, right: x + size.halfWidth, top: y - size.top, bottom: y + size.bottom };
}

const overlaps = (a, b) => a.left < b.right + 4 && a.right + 4 > b.left && a.top < b.bottom + 4 && a.bottom + 4 > b.top;

// Search around the requested point without changing anyone else's distance or position.
export function findOpenOrbitAngle({ planets, name, orbit, angle, stage, sizes, centerSize }) {
  if (!orbitRingRadii[orbit] || !Number.isFinite(angle) || !(stage.width > 0 && stage.height > 0) || !sizes[name]) return null;
  const obstacles = planets.filter((planet) => planet.name !== name).map((planet) => boundsAt(planet, sizes[planet.name], stage));
  if (centerSize) obstacles.push({
    left: stage.width / 2 - centerSize.halfWidth, right: stage.width / 2 + centerSize.halfWidth,
    top: stage.height / 2 - centerSize.top, bottom: stage.height / 2 + centerSize.bottom
  });
  for (let offset = 0; offset <= 180; offset += 1) {
    for (const candidate of offset ? [angle + offset, angle - offset] : [angle]) {
      const bounds = boundsAt({ orbit, angle: candidate }, sizes[name], stage);
      if (obstacles.every((other) => !overlaps(bounds, other))) return candidate;
    }
  }
  return null;
}
