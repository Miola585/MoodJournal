import Matter from 'matter-js';
import { restingMarbles } from './memoryJarData.js';

const { Engine, Bodies, Body, Composite, Sleeping } = Matter;
export const MARBLE_RADIUS = 18;
export const JAR_WALL = [[64, 158], [256, 158], [256, 344], [248, 374], [225, 396], [95, 396], [72, 374], [64, 344]];

export function containMarble(point) {
  const result = { ...point };
  for (let pass = 0; pass < 3; pass += 1) {
    JAR_WALL.forEach(([x, y], index) => {
      const [nextX, nextY] = JAR_WALL[(index + 1) % JAR_WALL.length];
      const length = Math.hypot(nextX - x, nextY - y);
      const nx = -(nextY - y) / length, ny = (nextX - x) / length;
      const distance = (result.x - x) * nx + (result.y - y) * ny;
      if (distance < MARBLE_RADIUS) {
        result.x += nx * (MARBLE_RADIUS - distance);
        result.y += ny * (MARBLE_RADIUS - distance);
      }
    });
  }
  return result;
}

export function createJarPhysics(count, positions, dropIndex = -1) {
  const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
  engine.gravity.y = 1;
  const walls = JAR_WALL.map(([x, y], index) => {
    const [nextX, nextY] = JAR_WALL[(index + 1) % JAR_WALL.length];
    const length = Math.hypot(nextX - x, nextY - y);
    return Bodies.rectangle((x + nextX) / 2 + (nextY - y) / length * 8, (y + nextY) / 2 - (nextX - x) / length * 8, length + 16, 16, { isStatic: true, angle: Math.atan2(nextY - y, nextX - x), friction: .25 });
  });
  const initial = positions || restingMarbles(count);
  const bodies = initial.map((position, index) => Bodies.circle(index === dropIndex ? 160 : position.x, index === dropIndex ? 180 : position.y, MARBLE_RADIUS, { restitution: .28, friction: .18, frictionAir: .025, sleepThreshold: 50, angle: position.angle || 0 }));
  Composite.add(engine.world, [...walls, ...bodies]);
  let dragged = null;
  const read = () => bodies.map((body) => ({ x: body.position.x, y: body.position.y, angle: body.angle }));
  const tick = () => {
    for (const body of bodies) {
      if (body.speed > 6) Body.setVelocity(body, { x: body.velocity.x / body.speed * 6, y: body.velocity.y / body.speed * 6 });
    }
    Engine.update(engine, 1000 / 120);
    Engine.update(engine, 1000 / 120);
    for (const body of bodies) {
      const point = containMarble(body.position);
      if (Math.hypot(point.x - body.position.x, point.y - body.position.y) > .01) {
        Body.setPosition(body, point);
        Body.setVelocity(body, { x: body.velocity.x * .3, y: body.velocity.y * .3 });
      }
    }
    return read();
  };
  const release = () => {
    if (dragged !== null) { Body.setStatic(bodies[dragged], false); Sleeping.set(bodies[dragged], false); }
    dragged = null;
  };
  return {
    read, tick,
    sleeping: () => bodies.every((body) => body.isSleeping),
    settle: () => { for (let i = 0; i < 240; i += 1) tick(); return read(); },
    shuffle: () => bodies.forEach((body) => { Sleeping.set(body, false); Body.setVelocity(body, { x: (Math.random() - .5) * 5, y: -2 - Math.random() * 3 }); }),
    drag: (index, point) => {
      if (dragged !== index) { release(); dragged = index; Body.setStatic(bodies[index], true); }
      Body.setPosition(bodies[index], containMarble(point));
    },
    release,
    dispose: () => { Composite.clear(engine.world, false); Engine.clear(engine); }
  };
}
