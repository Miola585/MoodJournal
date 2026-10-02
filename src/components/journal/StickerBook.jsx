import { ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isStickerUnlocked, stickerPages, stickers } from '../../data/stickers';
import { StickerArtwork } from './StickerArtwork';

export function StickerBook({ pageIndex, onPageChange, discoveries, onChoose, onDropSticker, onClose, placementRegion, onPlacementRegionChange }) {
  const pointer = useRef(null);
  const clearDrag = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);
  const page = stickerPages[pageIndex];
  const pageStickers = stickers.filter((sticker) => sticker.page === page.id);
  useEffect(() => () => clearDrag.current?.(), []);

  const startDrag = (event, sticker) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    pointer.current = { id: sticker.id, startX: event.clientX, startY: event.clientY, moved: false };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      pointer.current = null;
      setDragPreview(null);
      clearDrag.current = null;
    };
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId || !pointer.current) return;
      if (Math.hypot(moveEvent.clientX - pointer.current.startX, moveEvent.clientY - pointer.current.startY) > 5) pointer.current.moved = true;
      if (pointer.current.moved) setDragPreview({ sticker, x: moveEvent.clientX, y: moveEvent.clientY });
    };
    const finish = (upEvent) => {
      if (upEvent.pointerId !== pointerId || !pointer.current) return;
      const moved = pointer.current.moved;
      cleanup();
      if (moved) onDropSticker(sticker.id, upEvent.clientX, upEvent.clientY);
      else onChoose(sticker.id);
    };
    const cancel = () => cleanup();
    clearDrag.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
  };

  return (
    <section aria-label="Sticker Book" className="sticker-book" id="sticker-book-panel">
      <div className="sticker-book-topline">
        <span>Sticker Book</span>
        <button aria-label="Close Sticker Book" className="icon-button" onClick={onClose} title="Close Sticker Book" type="button"><X size={18} /></button>
      </div>
      <div aria-label="Place sticker on" className="sticker-book-location" role="group">
        <button aria-pressed={placementRegion !== 'details'} onClick={() => onPlacementRegionChange('writing')} type="button">Writing</button>
        <button aria-pressed={placementRegion === 'details'} onClick={() => onPlacementRegionChange('details')} type="button">Page details</button>
      </div>
      <div className="sticker-book-page" key={page.id}>
        <header>
          <span>Collection {pageIndex + 1} of {stickerPages.length}</span>
          <h3>{page.title}</h3>
        </header>
        {pageStickers.length ? (
          <div className="sticker-book-grid">
            {pageStickers.map((sticker) => {
              const unlocked = isStickerUnlocked(sticker, discoveries);
              return unlocked ? (
                <button
                  className="sticker-book-choice"
                  draggable="false"
                  key={sticker.id}
                  onClick={(event) => { if (event.detail === 0) onChoose(sticker.id); }}
                  onDragStart={(event) => event.preventDefault()}
                  onPointerDown={(event) => startDrag(event, sticker)}
                  title={`Place ${sticker.name}`}
                  type="button"
                >
                  <StickerArtwork longEdge={96} sticker={sticker} />
                  <span>{sticker.name}</span>
                </button>
              ) : (
                <div className="sticker-book-choice locked" key={sticker.id}>
                  <span className="sticker-book-locked-art"><Lock aria-hidden="true" size={23} /></span>
                  <span>{sticker.name}</span>
                  <small>Discover in Daily Constellation</small>
                </div>
              );
            })}
          </div>
        ) : <p className="sticker-book-empty">No stickers on this page yet.</p>}
      </div>
      <nav aria-label="Sticker Book pages" className="sticker-book-turn">
        <button aria-label="Previous sticker page" disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)} title="Previous page" type="button"><ChevronLeft aria-hidden="true" size={18} /></button>
        <span>Page {pageIndex + 1} / {stickerPages.length}</span>
        <button aria-label="Next sticker page" disabled={pageIndex === stickerPages.length - 1} onClick={() => onPageChange(pageIndex + 1)} title="Next page" type="button"><ChevronRight aria-hidden="true" size={18} /></button>
      </nav>
      {dragPreview && createPortal(
        <StickerArtwork className="sticker-drag-preview" longEdge={208} sticker={dragPreview.sticker} style={{ left: dragPreview.x, top: dragPreview.y }} />,
        document.body
      )}
    </section>
  );
}
