import { ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isStickerUnlocked, stickerPages, stickers } from '../../data/stickers';
import { StickerArtwork } from './StickerArtwork';

export function useStickerDiscoveries(privateStorage) {
  const [result, setResult] = useState({ owner: null, discoveries: {}, discoveryError: '', loading: true });
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => privateStorage?.read('gameConstellations', []) || [])
      .then((saved) => {
        if (active) setResult({ owner: privateStorage, discoveries: { constellation: Array.isArray(saved) && saved.length > 0 }, discoveryError: '', loading: false });
      }).catch(() => {
        if (active) setResult({ owner: privateStorage, discoveries: {}, discoveryError: 'Sticker discoveries could not be loaded. Reopen the collection to try again.', loading: false });
      });
    return () => { active = false; };
  }, [privateStorage]);
  return result.owner === privateStorage ? result : { discoveries: {}, discoveryError: '', loading: true };
}

export function StickerBook({ pageIndex, onPageChange, discoveries, discoveryError, onChoose, onDropSticker, onClose, placementRegion, onPlacementRegionChange }) {
  const pointer = useRef(null);
  const clearDrag = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1100px)').matches);
  const [headerBottom, setHeaderBottom] = useState(112);
  const [dragPreview, setDragPreview] = useState(null);
  const page = stickerPages[pageIndex] || stickerPages[0];
  const pageStickers = stickers.filter((sticker) => sticker.page === page.id);
  useEffect(() => () => clearDrag.current?.(), []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1100px)');
    const sync = () => setMobile(query.matches);
    query.addEventListener('change', sync);
    const measureHeader = () => {
      const slot = document.getElementById('journal-context-actions');
      const header = slot?.closest('header, .context-header, .journal-subheader, .contextual-subheader') || slot?.parentElement;
      setHeaderBottom(Math.max(58, Math.ceil(header?.getBoundingClientRect().bottom || 112)));
    };
    measureHeader();
    const resize = new ResizeObserver(measureHeader);
    resize.observe(document.body);
    const slot = document.getElementById('journal-context-actions');
    if (slot?.parentElement) resize.observe(slot.parentElement);
    window.addEventListener('scroll', measureHeader, true);
    window.addEventListener('resize', measureHeader);
    return () => {
      query.removeEventListener('change', sync);
      resize.disconnect();
      window.removeEventListener('scroll', measureHeader, true);
      window.removeEventListener('resize', measureHeader);
    };
  }, []);
  useEffect(() => {
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
    if (mobile) panel.showModal();
    const focusable = () => [...panel.querySelectorAll('button:not(:disabled), [href], input, select, [tabindex="0"]')].filter((node) => node.getClientRects().length);
    const focusFirst = () => (focusable()[0] || panel).focus();
    focusFirst();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (!mobile || event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); (last || panel).focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); (first || panel).focus();
      }
    };
    const containFocus = (event) => { if (mobile && !panel.contains(event.target)) focusFirst(); };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', containFocus);
    const previousOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', containFocus);
      if (mobile) document.body.style.overflow = previousOverflow;
      if (mobile) panel.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobile]);

  const startDrag = (event, sticker) => {
    if (event.button !== 0 || mobile || event.pointerType === 'touch') return;
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

  const Panel = mobile ? 'dialog' : 'section';
  return (
    <>
    <Panel aria-label="Sticker Book" aria-modal={mobile ? true : undefined} role={mobile ? 'dialog' : 'region'} tabIndex={-1} ref={panelRef} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
      if (!mobile || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right) onClose();
    }} className="sticker-book editor-sticker-book" id="sticker-book-panel" style={{ '--editor-header-bottom': `${headerBottom}px` }}>
      <div className="sticker-book-topline">
        <span>Sticker Book</span>
        <button aria-label="Close Sticker Book" className="icon-button" onClick={onClose} title="Close Sticker Book" type="button"><X size={18} /></button>
      </div>
      {discoveryError && <p className="sticker-discovery-error" role="alert">{discoveryError}</p>}
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
                  onClick={(event) => { if (mobile || event.detail === 0 || event.nativeEvent.pointerType === 'touch') onChoose(sticker.id); }}
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
        ) : <p className="sticker-book-empty">This collection is waiting for your artwork. Try another page.</p>}
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
    </Panel>
    </>
  );
}
