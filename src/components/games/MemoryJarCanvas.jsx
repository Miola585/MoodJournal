import { useEffect, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { MemoryJarSvg } from './MemoryJarSvg';
import { memoryDateLabel, restingMarbles } from './memoryJarData';

export function MemoryJarCanvas({ memories, selected, onSelect, reduceMotion, newId, onReload }) {
  const root = useRef(null);
  const buttons = useRef([]);
  const controls = useRef(null);
  const drag = useRef(null);
  const positions = useRef(restingMarbles(memories.length));
  const dropPending = useRef(newId);
  const suppressClick = useRef(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const paused = useRef(false);
  paused.current = Boolean(selected || focused);

  useEffect(() => {
    let disposed = false, simulation, frame = 0, visible = true, quiet = 0;
    const element = root.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => reduceMotion || media.matches;
    const paint = (points) => {
      positions.current = points;
      points.forEach((point, index) => {
        const button = buttons.current[index];
        if (!button) return;
        button.style.left = `${point.x / 320 * 100}%`;
        button.style.top = `${point.y / 420 * 100}%`;
        button.style.setProperty('--marble-angle', `${point.angle || 0}rad`);
      });
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; element.dataset.moving = 'false'; };
    const run = () => {
      frame = 0;
      if (disposed || !simulation || paused.current || !visible || document.hidden || reduced()) { stop(); return; }
      const before = positions.current;
      const next = simulation.tick();
      const delta = next.reduce((max, point, index) => Math.max(max, Math.hypot(point.x - before[index].x, point.y - before[index].y)), 0);
      quiet = delta < .04 && !drag.current?.moved ? quiet + 1 : 0;
      paint(next);
      if (quiet > 45 || simulation.sleeping()) { stop(); return; }
      element.dataset.moving = 'true';
      frame = requestAnimationFrame(run);
    };
    const wake = () => { if (!frame && !disposed) { quiet = 0; frame = requestAnimationFrame(run); } };
    const cancelDrag = () => {
      const wasMoving = drag.current?.moved;
      if (drag.current) {
        if (drag.current.moved) suppressClick.current = true;
        const button = buttons.current[drag.current.index];
        if (button?.hasPointerCapture(drag.current.id)) button.releasePointerCapture(drag.current.id);
      }
      drag.current = null;
      simulation?.release();
      if (wasMoving && !disposed) {
        if (reduced()) paint(simulation.settle()); else wake();
      }
    };
    const visibility = () => { if (document.hidden) { cancelDrag(); stop(); } else wake(); };
    const preference = () => { cancelDrag(); if (reduced()) { stop(); paint(simulation?.settle() || positions.current); } else wake(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); else { cancelDrag(); stop(); } });
    observer.observe(element);
    const resize = new ResizeObserver(cancelDrag);
    resize.observe(element);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', preference);
    paint(positions.current);
    setError(false);
    setReady(false);
    import('./memoryJarPhysics').then(({ createJarPhysics }) => {
      if (disposed) return;
      simulation = createJarPhysics(memories.length, positions.current, reduced() ? -1 : memories.findIndex((item) => item.record?.id === dropPending.current));
      dropPending.current = null;
      controls.current = {
        wake, stop, cancelDrag,
        move: (index, point) => { simulation.drag(index, point); paint(simulation.read()); wake(); },
        shuffle: () => { simulation.shuffle(); if (reduced()) paint(simulation.settle()); else wake(); }
      };
      setReady(true);
      if (reduced()) paint(simulation.settle()); else wake();
    }).catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true; cancelDrag(); stop(); simulation?.dispose(); controls.current = null;
      observer.disconnect(); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', preference);
    };
  }, [memories, reduceMotion, newId]);

  useEffect(() => {
    if (selected || focused) { controls.current?.cancelDrag(); controls.current?.stop(); }
    else controls.current?.wake();
  }, [selected, focused]);

  const pointerDown = (event, index) => {
    if (selected || !controls.current || event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { index, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 7) current.moved = true;
    if (!current.moved) return;
    const rect = root.current.getBoundingClientRect();
    controls.current?.move(current.index, { x: (event.clientX - rect.left) / rect.width * 320, y: (event.clientY - rect.top) / rect.height * 420 });
  };
  const pointerUp = (event) => {
    if (!drag.current) return;
    const { moved, index } = drag.current;
    const tapped = !moved && event.type !== 'pointercancel';
    suppressClick.current = !tapped;
    controls.current?.cancelDrag();
    // Touch browsers may omit the compatibility click after pointer capture.
    if (tapped && event.pointerType === 'touch') {
      suppressClick.current = true;
      event.currentTarget.focus({ preventScroll: true });
      onSelect(memories[index]);
    }
  };
  return <div className="jar-display">
    <div className="jar-canvas" ref={root} aria-label="Memory jar" data-moving="false">
      <MemoryJarSvg />
      {!memories.length && <p className="jar-invitation">A little good,<br />kept for later.</p>}
      {memories.map((memory, index) => <button key={memory.key} ref={(node) => { buttons.current[index] = node; }}
        className="memory-marble jar-marble" type="button" style={{ '--memory-color': memory.color }}
        aria-label={`Memory ${index + 1} from ${memoryDateLabel(memory.dateKey)}`} aria-pressed={selected === memory.key}
        onFocus={(event) => setFocused(event.currentTarget.matches(':focus-visible'))} onBlur={() => setFocused(false)}
        onKeyDown={() => setFocused(true)} onPointerDown={(event) => pointerDown(event, index)} onPointerMove={pointerMove}
        onPointerUp={pointerUp} onPointerCancel={pointerUp}
        onClick={() => { if (!suppressClick.current) onSelect(memory); suppressClick.current = false; }}><span /></button>)}
    </div>
    <button className="jar-shuffle" type="button" disabled={!memories.length || Boolean(selected) || !ready || error} onClick={() => controls.current?.shuffle()}><Shuffle size={17} /> Shuffle</button>
    {error && <p role="alert">Movement could not load. Your memories are still available below. <button type="button" onClick={onReload}>Reload page</button></p>}
  </div>;
}
