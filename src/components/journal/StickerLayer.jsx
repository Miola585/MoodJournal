import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { stickerById } from '../../data/stickers';
import { clampStickerPosition, fitStickerOnPage, stickerHeightScale, stickerOnPage } from '../../utils/stickerUtils';
import { StickerArtwork } from './StickerArtwork';

export function StickerLayer({ placements = [], selectedId, onSelect, onMove, onRemove, legacyRegions }) {
  const layerRef = useRef(null);
  const [regions, setRegions] = useState(null);
  const [pageBounds, setPageBounds] = useState(null);
  const measuredBounds = useRef(null);
  const clearGesture = useRef(null);
  useEffect(() => () => clearGesture.current?.(), []);
  useLayoutEffect(() => {
    const measure = () => {
      const page = layerRef.current?.getBoundingClientRect();
      if (!page?.width || !page?.height) return;
      if (measuredBounds.current && (page.width !== measuredBounds.current.width || page.height !== measuredBounds.current.height)) clearGesture.current?.();
      measuredBounds.current = { width: page.width, height: page.height };
      setPageBounds({ width: page.width, height: page.height });
      const next = {};
      for (const key of ['details', 'writing']) {
        const bounds = legacyRegions?.[key]?.current?.querySelector('.journal-sticker-origin')?.getBoundingClientRect();
        if (bounds) next[key] = { x: (bounds.left - page.left) / page.width * 100, y: (bounds.top - page.top) / page.height * 100, width: bounds.width / page.width, height: bounds.height / page.height };
      }
      setRegions(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [layerRef.current, legacyRegions?.details?.current, legacyRegions?.writing?.current].filter(Boolean).forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [legacyRegions?.details, legacyRegions?.writing]);
  const changePlacement = (placement, change) => {
    const next = { ...placement, ...change };
    const frame = fitStickerOnPage(next, stickerById.get(placement.stickerId).crop, pageBounds);
    onMove(placement.id, { ...(legacyRegions ? { region: 'page' } : {}), ...change, x: frame.x, y: frame.y });
  };

  const startGesture = (event, placement, kind) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = layerRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return;
    clearGesture.current?.();
    const pointerId = event.pointerId;
    const centerX = bounds.left + bounds.width * placement.x / 100;
    const centerY = bounds.top + bounds.height * placement.y / 100;
    const offsetX = event.clientX - centerX;
    const offsetY = event.clientY - centerY;
    const startDistance = Math.hypot(offsetX, offsetY);
    const startAngle = Math.atan2(offsetY, offsetX);
    onSelect(placement.id);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (kind === 'move') {
        changePlacement(placement, {
          x: clampStickerPosition((moveEvent.clientX - offsetX - bounds.left) / bounds.width * 100),
          y: clampStickerPosition((moveEvent.clientY - offsetY - bounds.top) / bounds.height * 100)
        });
      } else if (kind === 'size' && startDistance > 0) {
        const distance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
        changePlacement(placement, { size: Math.max(10, Math.min(48, Math.round(placement.size * distance / startDistance))) });
      } else if (kind === 'height') {
        const radians = placement.rotation * Math.PI / 180;
        const localY = (x, y) => -Math.sin(radians) * x + Math.cos(radians) * y;
        const start = localY(offsetX, offsetY);
        if (Math.abs(start) > 1) changePlacement(placement, { heightScale: stickerHeightScale(stickerHeightScale(placement.heightScale) * localY(moveEvent.clientX - centerX, moveEvent.clientY - centerY) / start) });
      } else if (kind === 'rotation') {
        const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        const degrees = placement.rotation + (angle - startAngle) * 180 / Math.PI;
        changePlacement(placement, { rotation: Math.max(-180, Math.min(180, Math.round(degrees))) });
      }
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      clearGesture.current = null;
    };
    const finish = (endEvent) => {
      if (endEvent.pointerId !== undefined && endEvent.pointerId !== pointerId) return;
      cleanup();
    };
    clearGesture.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', finish);
  };

  return (
    <div className="journal-sticker-layer" ref={layerRef}>
      {placements.map((storedPlacement) => {
        const mapped = stickerOnPage(storedPlacement, regions);
        const sticker = stickerById.get(mapped.stickerId);
        if (!sticker) return null;
        const frame = fitStickerOnPage(mapped, sticker.crop, pageBounds);
        const placement = { ...mapped, x: frame.x, y: frame.y };
        const longEdge = frame.longEdge;
        const style = {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
          zIndex: placement.layer + 1
        };
        if (!onMove) return <span aria-label={sticker.name} className="journal-placed-sticker" key={placement.id} role="img" style={style}><StickerArtwork heightScale={placement.heightScale} longEdge={longEdge} sticker={sticker} /></span>;
        return (
          <button
            aria-label={`Move ${sticker.name} sticker. Arrow keys move, plus and minus resize, Alt and up or down change height, brackets turn, Delete removes.`}
            aria-pressed={selectedId === placement.id}
            className={selectedId === placement.id ? 'journal-placed-sticker selected' : 'journal-placed-sticker'}
            key={placement.id}
            onClick={() => onSelect(placement.id)}
            onDoubleClick={(event) => { event.preventDefault(); onRemove?.(placement.id); }}
            onKeyDown={(event) => {
              if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                changePlacement(placement, { heightScale: stickerHeightScale(stickerHeightScale(placement.heightScale) + (event.key === 'ArrowUp' ? -.05 : .05)) });
                return;
              }
              if ((event.key === 'Delete' || event.key === 'Backspace') && onRemove) {
                event.preventDefault();
                onRemove(placement.id);
                return;
              }
              if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                changePlacement(placement, { size: Math.min(48, placement.size + 2) });
                return;
              }
              if (event.key === '-') {
                event.preventDefault();
                changePlacement(placement, { size: Math.max(10, placement.size - 2) });
                return;
              }
              if (event.key === '[' || event.key === ']') {
                event.preventDefault();
                changePlacement(placement, { rotation: Math.max(-180, Math.min(180, placement.rotation + (event.key === '[' ? -15 : 15))) });
                return;
              }
              const delta = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[event.key];
              if (!delta) return;
              event.preventDefault();
              onSelect(placement.id);
              changePlacement(placement, {
                x: clampStickerPosition(placement.x + delta[0]),
                y: clampStickerPosition(placement.y + delta[1])
              });
            }}
            onPointerDown={(event) => startGesture(event, placement, 'move')}
            style={style}
            title={sticker.name}
            type="button"
          >
            <StickerArtwork heightScale={placement.heightScale} longEdge={longEdge} sticker={sticker} />
            {selectedId === placement.id && <>
              <span aria-hidden="true" className="journal-sticker-handle journal-sticker-height-handle" title="Change sticker height (Alt + Up/Down)" onPointerDown={(event) => startGesture(event, placement, 'height')} />
              <span
                aria-hidden="true"
                className="journal-sticker-handle journal-sticker-rotate-handle"
                onPointerDown={(event) => startGesture(event, placement, 'rotation')}
              />
              <span
                aria-hidden="true"
                className="journal-sticker-handle journal-sticker-size-handle"
                onPointerDown={(event) => startGesture(event, placement, 'size')}
              />
            </>}
          </button>
        );
      })}
    </div>
  );
}
