import { useLayoutEffect, useRef, useState } from 'react';
import { Move, X } from 'lucide-react';
import { MAX_JOURNAL_NOTE_LENGTH } from '../../utils/journalNotes';

const clamp = (value) => Math.max(0, Math.min(1, value));

export function StickyNote({ note, paperStyle, onChange, onRemove, focusOnMount = false, readOnly = false, title = 'Little Thought', placeholder = 'A thought for later, a tiny intention, a little reminder…', maxLength = MAX_JOURNAL_NOTE_LENGTH, removeLabel = 'Remove Little Thought note' }) {
  const noteRef = useRef(null);
  const textareaRef = useRef(null);
  const dragRef = useRef(null);
  const [travel, setTravel] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const element = noteRef.current;
    const parent = element?.parentElement;
    if (!element || !parent) return undefined;
    const measure = () => setTravel({
      x: Math.max(0, parent.clientWidth - element.offsetWidth),
      y: Math.max(0, parent.clientHeight - element.offsetHeight)
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (focusOnMount && !readOnly) textareaRef.current?.focus();
  }, [focusOnMount, readOnly]);

  const moveTo = (x, y) => onChange?.({ ...note, x: clamp(x), y: clamp(y) });
  const startDrag = (event) => {
    if (readOnly || event.button !== 0 || event.target.closest('button')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: note.x * travel.x,
      y: note.y * travel.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event) => {
    const start = dragRef.current;
    if (!start || event.pointerId !== start.pointerId) return;
    moveTo(
      travel.x ? (start.x + event.clientX - start.clientX) / travel.x : 0,
      travel.y ? (start.y + event.clientY - start.clientY) / travel.y : 0
    );
  };
  const stopDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const moveWithKeyboard = (event) => {
    const steps = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
    const step = steps[event.key];
    if (!step || readOnly) return;
    event.preventDefault();
    moveTo(
      travel.x ? note.x + step[0] / travel.x : 0,
      travel.y ? note.y + step[1] / travel.y : 0
    );
  };

  return (
    <aside className={`journal-sticky-note${paperStyle === 'plain' ? ' journal-sticky-plain' : ''}${readOnly ? ' journal-sticky-read-only' : ''}`} ref={noteRef} style={{ left: note.x * travel.x, top: note.y * travel.y }}>
      <span aria-hidden="true" className="journal-sticky-tape" />
      <div aria-label={readOnly ? undefined : `Move ${title} note with arrow keys or drag`} className="journal-sticky-heading" onKeyDown={moveWithKeyboard} onPointerCancel={stopDrag} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} tabIndex={readOnly ? undefined : 0}>
        <Move aria-hidden="true" size={15} />
        <strong>{title}</strong>
        {!readOnly && <button aria-label={removeLabel} onClick={() => onRemove(note.uid)} title={removeLabel} type="button"><X aria-hidden="true" size={16} /></button>}
      </div>
      {readOnly ? <p className="journal-sticky-readonly">{note.text}</p> : (
        <textarea aria-label={title} maxLength={maxLength} onChange={(event) => onChange({ ...note, text: event.target.value })} placeholder={placeholder} ref={textareaRef} value={note.text} />
      )}
      <div className="journal-sticky-footer"><span>{note.text.length}/{maxLength}</span></div>
    </aside>
  );
}
