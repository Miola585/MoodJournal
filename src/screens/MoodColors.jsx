import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eraser, Plus, Save, Undo2 } from 'lucide-react';
import { DraftRecoveryNotice } from '../components/journal/DraftRecoveryNotice';
import { useGameStorageState } from '../hooks/useGameStorageState';
import { useJournalDraft } from '../hooks/useJournalDraft';
import {
  createMoodColorsMap, moodColors, moodColorsProportions, moveMoodColorsFocus,
  normalizeMoodColorsMap, normalizeMoodColorsRecords, MOOD_COLORS_COLUMNS,
  MOOD_COLORS_ROWS, MOOD_COLORS_NOTE_LIMIT, MOOD_COLORS_STORAGE_KEY
} from '../utils/moodColors';

export function MoodColors({ privateStorage }) {
  return <MoodColorsEditor key={`${privateStorage.ownerId || 'local-browser'}:${privateStorage.encrypted}`} privateStorage={privateStorage} />;
}

function MoodColorsEditor({ privateStorage }) {
  const [draft, setDraft] = useState(createMoodColorsMap);
  const [selectedColor, setSelectedColor] = useState('calm');
  const [history, setHistory] = useState([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const pending = useRef(false);
  const cells = useRef([]);
  const session = useRef(null);
  const [records, saveRecords, storageError, canSave] = useGameStorageState(
    privateStorage, MOOD_COLORS_STORAGE_KEY, normalizeMoodColorsRecords
  );
  const restore = useCallback((value) => {
    const restored = normalizeMoodColorsMap(value);
    if (!restored) {
      setError('This draft is damaged and could not be restored.');
      return;
    }
    setDraft(restored);
    setHistory([]);
    setMessage('Draft restored.');
  }, []);
  const draftState = useJournalDraft({ privateStorage, formId: 'mood-colors', draft, setDraft: restore });
  useEffect(() => {
    const current = {};
    session.current = current;
    return () => { if (session.current === current) session.current = null; };
  }, [privateStorage]);

  const proportions = moodColorsProportions(draft.tiles);
  const paintedCount = proportions.reduce((sum, mood) => sum + mood.count, 0);
  const editing = records.some(({ id }) => id === draft.id);
  const blocked = !draftState.draftReady || working || Boolean(draftState.storedDraft);
  const changeTiles = (tiles) => {
    if (blocked || tiles.every((tile, index) => tile === draft.tiles[index])) return;
    setHistory((previous) => [...previous, draft.tiles].slice(-100));
    setDraft((previous) => ({ ...previous, tiles }));
    setMessage('');
  };
  const undo = () => {
    if (blocked || !history.length) return;
    setDraft((previous) => ({ ...previous, tiles: history.at(-1) }));
    setHistory((previous) => previous.slice(0, -1));
    setMessage('');
  };
  const switchMap = async (next) => {
    if (blocked || pending.current || !draftState.confirmDiscard()) return;
    const current = session.current;
    pending.current = true;
    setWorking(true);
    setError('');
    try {
      await draftState.clearDraft(next);
      if (session.current !== current) return;
      setDraft(normalizeMoodColorsMap(next));
      setHistory([]);
      setMessage('');
    } catch {
      if (session.current === current) setError('The previous device draft could not be cleared. Please try again.');
    } finally {
      if (session.current === current) { pending.current = false; setWorking(false); }
    }
  };
  const keepMap = async () => {
    if (!canSave || blocked || pending.current || !paintedCount || !draftState.dirty) return;
    const current = session.current;
    const saved = { ...draft, updatedAt: new Date(Math.max(Date.now(), Date.parse(draft.createdAt))).toISOString() };
    pending.current = true;
    setWorking(true);
    setError('');
    setMessage('');
    const success = await saveRecords((previous) => normalizeMoodColorsRecords([
      saved, ...previous.filter(({ id }) => id !== saved.id)
    ]));
    if (session.current !== current) return;
    if (success) {
      try {
        await draftState.clearDraft(saved);
      } catch {
        if (session.current === current) setError('Your map was kept, but its device draft could not be removed.');
      }
      if (session.current !== current) return;
      setDraft(saved);
      setHistory([]);
      setMessage('Map kept.');
    }
    pending.current = false;
    setWorking(false);
  };
  const discardRecovery = async () => {
    try { await draftState.discardDraft(); }
    catch { setError('The device draft could not be removed. Please try again.'); }
  };
  const moveFocus = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = moveMoodColorsFocus(index, event.key);
    setFocusIndex(next);
    cells.current[next]?.focus();
  };

  return (
    <section className="screen app-screen mood-colors-screen" aria-labelledby="mood-colors-title">
      <header className="mood-colors-header">
        <div><h1 id="mood-colors-title">Mood Colors</h1><time dateTime={draft.dateKey}>{new Date(`${draft.dateKey}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}</time></div>
        <button type="button" disabled={blocked} onClick={() => switchMap(createMoodColorsMap())}><Plus size={18} aria-hidden="true" />New map</button>
      </header>
      <DraftRecoveryNotice record={draftState.draftReady ? draftState.storedDraft : null} onRestore={draftState.restoreDraft} onDiscard={discardRecovery} />
      {(error || storageError) && <p role="alert">{error || storageError}</p>}
      {draftState.draftStatus === 'error' && <p role="alert">Your device draft could not be saved. Your current map is still here.</p>}
      <div className="mood-colors-workspace" aria-busy={!draftState.draftReady}>
        <div className="mood-colors-palette" role="group" aria-label="Mood colors">
          {moodColors.map((mood) => <button type="button" key={mood.key} aria-pressed={selectedColor === mood.key} disabled={blocked} onClick={() => setSelectedColor(mood.key)}>
            <span className="mood-colors-swatch" style={{ '--mood-color': mood.color }} aria-hidden="true">{selectedColor === mood.key ? <Check size={18} /> : null}</span>
            {mood.label}
          </button>)}
        </div>
        <div className="mood-colors-canvas">
          <div className="mood-colors-grid" role="grid" aria-label="Mood map" aria-rowcount={MOOD_COLORS_ROWS} aria-colcount={MOOD_COLORS_COLUMNS}>
            {Array.from({ length: MOOD_COLORS_ROWS }, (_, row) => <div role="row" className="mood-colors-row" key={row}>
              {draft.tiles.slice(row * MOOD_COLORS_COLUMNS, (row + 1) * MOOD_COLORS_COLUMNS).map((tile, column) => {
                const index = row * MOOD_COLORS_COLUMNS + column;
                const mood = moodColors.find(({ key }) => key === tile);
                return <div role="gridcell" key={column}><button type="button" className="mood-colors-tile"
                  ref={(element) => { cells.current[index] = element; }} tabIndex={index === focusIndex ? 0 : -1}
                  aria-label={`Row ${row + 1}, column ${column + 1}: ${mood?.label || 'Empty'}`}
                  style={{ '--tile-color': mood?.color || 'var(--surface-major)' }} data-painted={Boolean(mood)}
                  disabled={blocked} onFocus={() => setFocusIndex(index)} onKeyDown={(event) => moveFocus(event, index)}
                  onClick={() => changeTiles(draft.tiles.map((value, tileIndex) => tileIndex === index ? selectedColor : value))}>
                  <span aria-hidden="true">{mood?.mark || ''}</span>
                </button></div>;
              })}
            </div>)}
          </div>
          <div className="mood-colors-toolbar">
            <span>{paintedCount} / 35 painted</span>
            <button type="button" aria-label="Undo" title="Undo" disabled={blocked || !history.length} onClick={undo}><Undo2 size={20} aria-hidden="true" /></button>
            <button type="button" aria-label="Clear map" title="Clear map" disabled={blocked || !paintedCount} onClick={() => changeTiles(draft.tiles.map(() => null))}><Eraser size={20} aria-hidden="true" /></button>
          </div>
          <section className="mood-colors-summary" aria-labelledby="mood-colors-proportions-title">
            <h2 id="mood-colors-proportions-title">Color proportions</h2>
            <ul className="mood-colors-proportions" aria-label="Proportions of painted tiles">
              {proportions.map((mood) => <li key={mood.key}>
                <span className="mood-colors-swatch" style={{ '--mood-color': mood.color }} aria-hidden="true">{mood.mark}</span>
                <span>{mood.label}</span><span>{mood.percent}% <small>({mood.count})</small></span>
              </li>)}
            </ul>
          </section>
        </div>
        <div className="mood-colors-details">
          <label htmlFor="mood-colors-note">A note (optional)</label>
          <textarea id="mood-colors-note" rows={4} maxLength={MOOD_COLORS_NOTE_LIMIT} value={draft.note} disabled={blocked}
            onChange={(event) => { setDraft((previous) => ({ ...previous, note: event.target.value })); setMessage(''); }} />
          <button className="mood-colors-save" type="button" disabled={!canSave || blocked || !paintedCount || !draftState.dirty} onClick={keepMap}>
            <Save size={18} aria-hidden="true" />{working ? 'Saving...' : 'Keep this map'}
          </button>
          <p className="mood-colors-status" role="status">{!draftState.draftReady ? 'Checking device draft...' : message || (draftState.dirty ? 'Unsaved changes' : editing ? 'Saved map' : '')}</p>
        </div>
      </div>
      <section className="mood-colors-saved" aria-labelledby="mood-colors-saved-title">
        <h2 id="mood-colors-saved-title">Saved maps</h2>
        {!records.length && <p>No saved maps yet.</p>}
        <div className="mood-colors-previews">
          {records.map((record) => <button type="button" className="mood-colors-preview" key={record.id} disabled={blocked}
            aria-label={`Open map from ${record.dateKey}${record.note ? `: ${record.note}` : ''}`}
            aria-pressed={record.id === draft.id} onClick={() => switchMap(record)}>
            <span className="mood-colors-mini-grid" aria-hidden="true">{record.tiles.map((tile, index) => <span key={index} style={{ background: moodColors.find(({ key }) => key === tile)?.color || 'var(--surface-secondary)' }} />)}</span>
            <time dateTime={record.dateKey}>{new Date(`${record.dateKey}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time>
            {record.note && <span className="mood-colors-preview-note">{record.note}</span>}
          </button>)}
        </div>
      </section>
    </section>
  );
}
