import { useEffect, useRef } from 'react';
import { stickerById } from '../../data/stickers';
import { clampStickerPosition } from '../../utils/stickerUtils';
import { StickerArtwork } from './StickerArtwork';

export function StickerLayer({ placements = [], selectedId, onSelect, onMove, onRemove }) {
  const layerRef = useRef(null);
  const clearGesture = useRef(null);
  useEffect(() => () => clearGesture.current?.(), []);

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
        onMove(placement.id, {
          x: clampStickerPosition((moveEvent.clientX - offsetX - bounds.left) / bounds.width * 100),
          y: clampStickerPosition((moveEvent.clientY - offsetY - bounds.top) / bounds.height * 100)
        });
      } else if (kind === 'size' && startDistance > 0) {
        const distance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
        onMove(placement.id, { size: Math.max(10, Math.min(48, Math.round(placement.size * distance / startDistance))) });
      } else if (kind === 'rotation') {
        const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        const degrees = placement.rotation + (angle - startAngle) * 180 / Math.PI;
        onMove(placement.id, { rotation: Math.max(-180, Math.min(180, Math.round(degrees))) });
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
      {placements.map((placement) => {
        const sticker = stickerById.get(placement.stickerId);
        if (!sticker) return null;
        const longEdge = Math.max(90, Math.min(310, placement.size * 6.5));
        const style = {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
          zIndex: placement.layer + 1
        };
        if (!onMove) return <span aria-label={sticker.name} className="journal-placed-sticker" key={placement.id} role="img" style={style}><StickerArtwork longEdge={longEdge} sticker={sticker} /></span>;
        return (
          <button
            aria-label={`Move ${sticker.name} sticker. Arrow keys move, plus and minus resize, brackets turn, Delete removes.`}
            aria-pressed={selectedId === placement.id}
            className={selectedId === placement.id ? 'journal-placed-sticker selected' : 'journal-placed-sticker'}
            key={placement.id}
            onClick={() => onSelect(placement.id)}
            onDoubleClick={(event) => { event.preventDefault(); onRemove?.(placement.id); }}
            onKeyDown={(event) => {
              if ((event.key === 'Delete' || event.key === 'Backspace') && onRemove) {
                event.preventDefault();
                onRemove(placement.id);
                return;
              }
              if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                onMove(placement.id, { size: Math.min(48, placement.size + 2) });
                return;
              }
              if (event.key === '-') {
                event.preventDefault();
                onMove(placement.id, { size: Math.max(10, placement.size - 2) });
                return;
              }
              if (event.key === '[' || event.key === ']') {
                event.preventDefault();
                onMove(placement.id, { rotation: Math.max(-180, Math.min(180, placement.rotation + (event.key === '[' ? -15 : 15))) });
                return;
              }
              const delta = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[event.key];
              if (!delta) return;
              event.preventDefault();
              onSelect(placement.id);
              onMove(placement.id, {
                x: clampStickerPosition(placement.x + delta[0]),
                y: clampStickerPosition(placement.y + delta[1])
              });
            }}
            onPointerDown={(event) => startGesture(event, placement, 'move')}
            style={style}
            title={sticker.name}
            type="button"
          >
            <StickerArtwork longEdge={longEdge} sticker={sticker} />
            {selectedId === placement.id && <>
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
