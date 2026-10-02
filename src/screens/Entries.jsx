import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookOpen, FileText, List, PenLine, RotateCcw, Save, Search, Trash2, Undo2, X } from 'lucide-react';
import { checkInTitleAfterMoodChange, createFreeWriteEntry, moods } from '../data/journalData';
import { isCheckIn, isJournalDateAllowed, isVisibleJournalEntry, journalDayNumber, todayKey } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';
import { PageHeader } from '../components/layout/PageHeader';
import { useJournalDraft } from '../hooks/useJournalDraft';
import { DraftRecoveryNotice, SaveState } from '../components/journal/DraftRecoveryNotice';
import { StickerBook } from '../components/journal/StickerBook';
import { StickerLayer } from '../components/journal/StickerLayer';
import { RichNoteEditor } from '../components/journal/RichNoteEditor';
import { StickyNote } from '../components/journal/StickyNote';
import { clampStickerPosition, createStickerPlacement } from '../utils/stickerUtils';
import { createJournalNote, getJournalNotes, MAX_JOURNAL_NOTES } from '../utils/journalNotes';

export function Entries({ nav, entries, onSave, onDelete, onPrimary, onBookmark, privateStorage }) {
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [bookmarkFilter, setBookmarkFilter] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creatingFreeWrite, setCreatingFreeWrite] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState(() => new Set());
  const [deleteNotice, setDeleteNotice] = useState(null);
  const deleteTimers = useRef(new Map());
  useEffect(() => () => {
    deleteTimers.current.forEach((timer) => window.clearTimeout(timer));
    deleteTimers.current.clear();
  }, []);
  const journalEntries = entries.filter(isVisibleJournalEntry).filter((entry) => !pendingDeletes.has(entry.id));
  const filtered = journalEntries.filter((entry) => {
    const text = `${entry.note} ${entry.mood} ${entry.specificFeeling} ${(entry.tags || []).join(' ')} ${(entry.factors || []).join(' ')}`.toLowerCase();
    const matchesKeyword = text.includes(query.toLowerCase());
    const matchesMood = !moodFilter || (isCheckIn(entry) && entry.mood === moodFilter);
    const matchesTag = !tagFilter || (entry.tags || []).some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    const matchesDate = !dateFilter || entry.dateKey === dateFilter;
    const matchesBookmark = !bookmarkFilter || entry.bookmarked;
    return matchesKeyword && matchesMood && matchesTag && matchesDate && matchesBookmark;
  });
  const hasFilters = Boolean(query || moodFilter || tagFilter || dateFilter || bookmarkFilter);
  const clearFilters = () => {
    setQuery('');
    setMoodFilter('');
    setTagFilter('');
    setDateFilter('');
    setBookmarkFilter(false);
  };
  const undoDelete = (id) => {
    const timer = deleteTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    deleteTimers.current.delete(id);
    setPendingDeletes((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setDeleteNotice(null);
  };
  const queueDelete = (entry) => {
    if (deleteTimers.current.has(entry.id)) return;
    setPendingDeletes((current) => new Set(current).add(entry.id));
    setDeleteNotice({ id: entry.id, label: entry.specificFeeling || entry.mood || 'Journal entry', state: 'pending' });
    const timer = window.setTimeout(async () => {
      deleteTimers.current.delete(entry.id);
      const deleted = await onDelete(entry.id);
      setPendingDeletes((current) => {
        const next = new Set(current);
        next.delete(entry.id);
        return next;
      });
      setDeleteNotice(deleted
        ? null
        : { id: entry.id, label: entry.specificFeeling || entry.mood || 'Journal entry', state: 'error' });
    }, 10000);
    deleteTimers.current.set(entry.id, timer);
  };
  if (editing) return <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={onSave} privateStorage={privateStorage} />;
  if (creatingFreeWrite) return <FreeWriteEntry nav={nav} onCancel={() => setCreatingFreeWrite(false)} onSave={onSave} privateStorage={privateStorage} />;
  return (
    <section className="screen app-screen entries-screen">
      <PageHeader title="Journal Entries" subtitle="Search, revisit, or write freely." actions={(
        <button className="primary-button archive-primary-action" onClick={() => setCreatingFreeWrite(true)} type="button">
          <PenLine aria-hidden="true" size={18} />
          New free write
        </button>
      )} />
      {nav}
      <div className="panel archive-toolbar" aria-label="Search and filter entries">
        <label className="archive-keyword-field">Keyword search
          <span className="archive-input-wrap">
            <Search aria-hidden="true" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" />
          </span>
        </label>
        <label>Mood filter
          <select value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)}>
            <option value="">All moods</option>
            {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
          </select>
        </label>
        <label>Tag search
          <input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="school, family, tired" />
        </label>
        <label>Date filter
          <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" />
        </label>
        <button aria-pressed={bookmarkFilter} className={bookmarkFilter ? 'bookmark-filter active' : 'bookmark-filter'} onClick={() => setBookmarkFilter((current) => !current)} type="button">
          <Bookmark aria-hidden="true" fill={bookmarkFilter ? 'currentColor' : 'none'} size={17} />
          Bookmarked
        </button>
        <div className="archive-filter-status" aria-live="polite">
          <span>Showing <strong>{filtered.length}</strong> of {journalEntries.length}</span>
          {hasFilters && (
            <button className="archive-clear-button" onClick={clearFilters} type="button">
              <RotateCcw aria-hidden="true" size={15} />
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div className="entry-list">
        {filtered.length > 0 && (
          <div className="archive-results-heading">
            <div>
              <span className="screen-kicker">Journal archive</span>
              <h2>{hasFilters ? 'Matching entries' : 'Recent entries'}</h2>
            </div>
            <span>{filtered.length} {filtered.length === 1 ? 'page' : 'pages'}</span>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="panel archive-empty-state">
            {journalEntries.length === 0 ? (
              <>
                <span className="archive-empty-icon" aria-hidden="true"><BookOpen size={28} /></span>
                <h2>No saved entries yet.</h2>
                <p>Your check-ins and free writes will appear here after you save them.</p>
                <button className="primary" onClick={() => setCreatingFreeWrite(true)} type="button">
                  <PenLine aria-hidden="true" size={17} />
                  Write your first page
                </button>
              </>
            ) : (
              <>
                <span className="archive-empty-icon" aria-hidden="true"><Search size={28} /></span>
                <h2>No entries match these filters.</h2>
                <p>Try changing your search, mood, tag, or date.</p>
                <button className="archive-clear-button" onClick={clearFilters} type="button">
                  <RotateCcw aria-hidden="true" size={15} />
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}
        {filtered.map((entry) => <EntryCard entry={entry} key={entry.id} onEdit={() => setEditing(entry)} onDelete={() => queueDelete(entry)} onPrimary={() => onPrimary(entry.id)} onBookmark={(bookmarked) => onBookmark(entry.id, bookmarked)} />)}
      </div>
      {deleteNotice && (
        <div className={deleteNotice.state === 'error' ? 'delete-undo-toast error' : 'delete-undo-toast'} role={deleteNotice.state === 'error' ? 'alert' : 'status'}>
          <span>{deleteNotice.state === 'error' ? `${deleteNotice.label} could not be deleted and was restored.` : `${deleteNotice.label} will be deleted in 10 seconds.`}</span>
          {deleteNotice.state === 'pending' ? <button onClick={() => undoDelete(deleteNotice.id)} type="button"><Undo2 aria-hidden="true" size={16} />Undo</button> : <button onClick={() => setDeleteNotice(null)} type="button">Dismiss</button>}
        </div>
      )}
    </section>
  );
}

function FreeWriteEntry({ nav, onSave, onCancel, privateStorage }) {
  const [draft, setDraft] = useState(createFreeWriteEntry());
  const [saveState, setSaveState] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const draftState = useJournalDraft({ privateStorage, formId: 'freewrite:new', draft, setDraft });
  const setField = (field, value) => { setSaveState(''); setDraft((current) => ({ ...current, [field]: value })); };
  const setWriting = (note, noteDoc) => { setSaveState(''); setDraft((current) => ({ ...current, note, noteDoc })); };
  const setNotes = (update) => { setSaveState(''); setDraft((current) => ({ ...current, stickyNotes: update(getJournalNotes(current)), pageNote: '' })); };
  const saveDraft = async () => {
    if (!isJournalDateAllowed(draft.dateKey)) { setSaveState('invalid-date'); return; }
    if (!draft.note.trim()) { setSaveState('empty'); return; }
    setSaveState('saving');
    const entry = { ...draft, tags: Array.from(new Set([...(draft.tags || []), 'free-write'])) };
    const saved = await onSave(entry);
    if (!saved) { setSaveState('error'); return; }
    setSaveState('saved');
    await draftState.clearDraft(entry);
    onCancel();
  };
  return (
    <section className="screen app-screen freewrite-screen">
      <h1 className="visually-hidden">New journal page</h1>
      {nav}
      <DraftRecoveryNotice record={draftState.storedDraft} onRestore={draftState.restoreDraft} onDiscard={draftState.discardDraft} />
      <form className="freewrite-form" onSubmit={async (event) => {
        event.preventDefault();
        await saveDraft();
      }}>
        <JournalNotebook actionButtons={<>
          <button aria-label="Save page" className="primary" disabled={saveState === 'saving'} title="Save page" type="submit"><Save aria-hidden="true" size={17} />Save</button>
          <button onClick={() => draftState.confirmDiscard() && onCancel()} type="button"><X aria-hidden="true" size={17} />Cancel</button>
        </>} bookOpen={bookOpen} onBookClose={() => setBookOpen(false)} onBookToggle={() => setBookOpen((open) => !open)} draft={draft} onFieldChange={setField} onNotesChange={setNotes} onWritingChange={setWriting} privateStorage={privateStorage} required />
        <div className="journal-writing-feedback">
          <SaveState state={saveState} onRetry={saveDraft} draftStatus={draftState.dirty ? draftState.draftStatus : ''} />
          {saveState === 'empty' && <span className="journal-save-state error" role="alert">Write something on the page before saving.</span>}
          {saveState === 'invalid-date' && <span className="journal-save-state error" role="alert">Choose today or an earlier journal date.</span>}
        </div>
      </form>
    </section>
  );
}

function EditEntry({ entry, onSave, onCancel, privateStorage }) {
  const [draft, setDraft] = useState(entry);
  const [saveState, setSaveState] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const draftState = useJournalDraft({ privateStorage, formId: `entry:${entry.id}`, draft, setDraft });
  const setField = (field, value) => {
    setSaveState('');
    setDraft((current) => field === 'mood' && isCheckIn(current)
      ? { ...current, mood: value, specificFeeling: checkInTitleAfterMoodChange(current.specificFeeling, current.mood, value) }
      : { ...current, [field]: value });
  };
  const setWriting = (note, noteDoc) => { setSaveState(''); setDraft((current) => ({ ...current, note, noteDoc })); };
  const setNotes = (update) => { setSaveState(''); setDraft((current) => ({ ...current, stickyNotes: update(getJournalNotes(current)), pageNote: '' })); };
  const checkIn = isCheckIn(draft);
  const mood = checkIn ? moods.find((item) => item.key === draft.mood) : null;
  const saveDraft = async () => {
    if (!isJournalDateAllowed(draft.dateKey)) { setSaveState('invalid-date'); return; }
    const tags = checkIn
      ? draft.tags
      : Array.from(new Set([...(draft.tags || []), 'free-write']));
    const edited = { ...draft, tags };
    setSaveState('saving');
    const saved = await onSave(edited);
    if (!saved) { setSaveState('error'); return; }
    setSaveState('saved');
    await draftState.clearDraft(edited);
    onCancel();
  };
  return (
    <section className="screen app-screen freewrite-screen edit-entry-screen">
      <h1 className="visually-hidden">{checkIn ? 'Edit check-in' : 'Edit journal page'}</h1>
      <DraftRecoveryNotice record={draftState.storedDraft} onRestore={draftState.restoreDraft} onDiscard={draftState.discardDraft} />
      <form className="freewrite-form" onSubmit={async (event) => {
        event.preventDefault();
        await saveDraft();
      }}>
        <JournalNotebook actionButtons={<>
          <button aria-label="Save changes" className="primary" disabled={saveState === 'saving'} title="Save changes" type="submit"><Save aria-hidden="true" size={17} />Save</button>
          <button onClick={() => draftState.confirmDiscard() && onCancel()} type="button"><X aria-hidden="true" size={17} />Cancel</button>
        </>} bookOpen={bookOpen} onBookClose={() => setBookOpen(false)} onBookToggle={() => setBookOpen((open) => !open)} checkIn={checkIn} draft={draft} mood={mood} onFieldChange={setField} onNotesChange={setNotes} onWritingChange={setWriting} privateStorage={privateStorage} />
        <div className="journal-writing-feedback">
          <SaveState state={saveState} onRetry={saveDraft} draftStatus={draftState.dirty ? draftState.draftStatus : ''} />
          {saveState === 'invalid-date' && <span className="journal-save-state error" role="alert">Choose today or an earlier journal date.</span>}
        </div>
      </form>
    </section>
  );
}

function StickerBookTrigger({ open, onToggle }) {
  return <button aria-controls="sticker-book-panel" aria-expanded={open} className="secondary-button sticker-book-trigger" onClick={onToggle} type="button"><BookOpen aria-hidden="true" size={17} />Sticker Book</button>;
}

function JournalNotebook({ actionButtons, draft, mood, onFieldChange, onNotesChange, onWritingChange, privateStorage, bookOpen, onBookClose, onBookToggle, checkIn = false, required = false }) {
  const [bookPage, setBookPage] = useState(0);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [placementRegion, setPlacementRegion] = useState('writing');
  const [nextStepOpen, setNextStepOpen] = useState(false);
  const [nextStepPosition, setNextStepPosition] = useState({ x: 0.95, y: 0.05 });
  const [focusNoteId, setFocusNoteId] = useState(null);
  const [toolbarTarget, setToolbarTarget] = useState(null);
  const [discoveries, setDiscoveries] = useState({});
  const introRef = useRef(null);
  const writingSurfaceRef = useRef(null);
  const addNoteButtonRef = useRef(null);
  const nextStepButtonRef = useRef(null);
  const toggleNextStep = () => setNextStepOpen((open) => !open);
  useEffect(() => {
    if (!selectedStickerId) return;
    const clearSelection = (event) => {
      if (!event.target.closest('.journal-placed-sticker, .journal-sticker-edit')) setSelectedStickerId(null);
    };
    const clearOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedStickerId(null);
    };
    document.addEventListener('pointerdown', clearSelection);
    document.addEventListener('keydown', clearOnEscape);
    return () => {
      document.removeEventListener('pointerdown', clearSelection);
      document.removeEventListener('keydown', clearOnEscape);
    };
  }, [selectedStickerId]);
  useEffect(() => {
    if (bookOpen && window.matchMedia('(max-width: 1100px)').matches) {
      writingSurfaceRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [bookOpen]);
  useEffect(() => {
    let active = true;
    privateStorage?.read('gameConstellations', []).then((saved) => {
      if (active) setDiscoveries({ constellation: Array.isArray(saved) && saved.length > 0 });
    }).catch(() => {});
    return () => { active = false; };
  }, [privateStorage]);
  const placements = Array.isArray(draft.stickers) ? draft.stickers : [];
  const updatePlacement = (id, change) => onFieldChange('stickers', placements.map((placement) => placement.id === id ? { ...placement, ...change } : placement));
  const removePlacement = (id) => {
    onFieldChange('stickers', placements.filter((placement) => placement.id !== id));
    setSelectedStickerId(null);
  };
  const chooseSticker = (stickerId, position, region = placementRegion) => {
    if (placements.length >= 40) return;
    const placement = {
      ...createStickerPlacement(stickerId, placements, region),
      ...(region === 'details' ? { x: 78, y: 66, size: 24 } : {}),
      ...position
    };
    onFieldChange('stickers', [...placements, placement]);
    setSelectedStickerId(placement.id);
    if (window.matchMedia('(max-width: 1100px)').matches) {
      onBookClose();
      if (region === 'details') introRef.current?.scrollIntoView({ block: 'center' });
    }
  };
  const dropSticker = (stickerId, clientX, clientY) => {
    for (const [region, ref] of [['details', introRef], ['writing', writingSurfaceRef]]) {
      const bounds = ref.current?.querySelector('.journal-sticker-layer')?.getBoundingClientRect();
      if (!bounds || clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) continue;
      chooseSticker(stickerId, {
        x: clampStickerPosition((clientX - bounds.left) / bounds.width * 100),
        y: clampStickerPosition((clientY - bounds.top) / bounds.height * 100)
      }, region);
      return;
    }
  };
  const visibleTags = (draft.tags || []).filter((tag) => tag !== 'free-write');
  const journalNotes = getJournalNotes(draft);
  const addNote = () => {
    if (journalNotes.length >= MAX_JOURNAL_NOTES) return;
    const added = createJournalNote(journalNotes);
    onNotesChange((notes) => [...notes, added]);
    setFocusNoteId(added.uid);
  };
  const changeNote = (changed) => onNotesChange((notes) => notes.map((note) => note.uid === changed.uid ? changed : note));
  const removeNote = (uid) => {
    onNotesChange((notes) => notes.filter((note) => note.uid !== uid));
    window.requestAnimationFrame(() => addNoteButtonRef.current?.focus());
  };
  return (
    <>
    <div className="journal-paper-controls">
      <div className="journal-paper-controls-actions">
        <div aria-label="Paper style" className="journal-paper-switch" role="group">
          <button aria-pressed={draft.paperStyle === 'plain'} onClick={() => onFieldChange('paperStyle', 'plain')} type="button"><FileText aria-hidden="true" size={16} />Plain</button>
          <button aria-pressed={draft.paperStyle !== 'plain'} onClick={() => onFieldChange('paperStyle', 'lined')} type="button"><List aria-hidden="true" size={16} />Lined</button>
        </div>
        <StickerBookTrigger open={bookOpen} onToggle={onBookToggle} />
      </div>
    </div>
    <div className={`freewrite-notebook journal-editor-notebook${checkIn ? ' edit-entry-notebook' : ''}${draft.paperStyle === 'plain' ? ' journal-paper-plain' : ''}`} style={mood ? { '--entry-accent': mood.color } : undefined}>
      <div className="journal-paper-intro" ref={introRef}>
        <div className="freewrite-page-heading">
          <div className="journal-title-row">
            {!checkIn ? (
              <label className="freewrite-title-field"><span className="visually-hidden">Title</span>
                <input maxLength={100} required value={draft.specificFeeling || ''} onChange={(event) => onFieldChange('specificFeeling', event.target.value)} placeholder="Give this page a title" />
              </label>
            ) : (
              <label className="freewrite-title-field"><span className="visually-hidden">Check-in title</span>
                <input aria-label="Check-in title" list="checkin-title-options" maxLength={120} onChange={(event) => onFieldChange('specificFeeling', event.target.value)} placeholder={draft.mood || 'Title your check-in'} value={draft.specificFeeling || ''} />
                <datalist id="checkin-title-options">{mood?.feelings.map((feeling) => <option key={feeling} value={feeling} />)}</datalist>
              </label>
            )}
            {checkIn && <div className="journal-title-actions">
              <label aria-label="Main entry for this day" className="inline-check edit-primary-check" title="Main entry for this day">
                <input checked={Boolean(draft.primary)} onChange={(event) => onFieldChange('primary', event.target.checked)} type="checkbox" />
                <span className="primary-entry-label">Main entry for this day</span>
              </label>
            </div>}
          </div>
          <div className="journal-paper-datestamp">
            <span>{checkIn ? 'Check-In' : 'Free Write'}</span>
            <span>Day {journalDayNumber(draft.dateKey)}</span>
            <time dateTime={draft.created}>{new Date(draft.created).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>
          </div>
          <div className="journal-paper-entry-meta">
            <details className="journal-paper-date-picker"><summary title="Change journal date">{isJournalDateAllowed(draft.dateKey) ? dateKeyToDate(draft.dateKey).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Choose a journal date'}</summary><label><span className="visually-hidden">Journal date</span><input aria-label="Journal date" max={todayKey()} onChange={(event) => onFieldChange('dateKey', event.target.value)} required type="date" value={draft.dateKey} /></label></details>
            {!isJournalDateAllowed(draft.dateKey) && <span className="journal-date-warning" role="alert">Today or earlier only</span>}
            {checkIn && <label className="journal-mood-field">Feeling
              <select value={draft.mood} onChange={(event) => onFieldChange('mood', event.target.value)}>
                {moods.map((moodOption) => <option key={moodOption.key}>{moodOption.key}</option>)}
              </select>
            </label>}
            {checkIn && <button aria-expanded={nextStepOpen} className="journal-next-step-trigger" onClick={toggleNextStep} ref={nextStepButtonRef} title="Open your next step" type="button">Next step</button>}
          </div>
        </div>
        <StickerLayer onMove={updatePlacement} onRemove={removePlacement} onSelect={setSelectedStickerId} placements={placements.filter((placement) => placement.region === 'details')} selectedId={selectedStickerId} />
      </div>
      <div className="freewrite-writing-surface" ref={writingSurfaceRef}>
        <div className="freewrite-writing-field">
          <RichNoteEditor addNoteButtonRef={addNoteButtonRef} canAddNote={journalNotes.length < MAX_JOURNAL_NOTES} note={draft.note || ''} noteDoc={draft.noteDoc} onAddNote={addNote} onChange={onWritingChange} required={required} toolbarTarget={toolbarTarget} />
        </div>
        <StickerLayer onMove={updatePlacement} onRemove={removePlacement} onSelect={setSelectedStickerId} placements={placements.filter((placement) => placement.region !== 'details')} selectedId={selectedStickerId} />
        <div className="journal-sticky-layer">
          {journalNotes.map((note) => <StickyNote focusOnMount={focusNoteId === note.uid} key={note.uid} note={note} onChange={changeNote} onRemove={removeNote} paperStyle={draft.paperStyle} />)}
          {nextStepOpen && <StickyNote focusOnMount maxLength={1000} note={{ uid: -1, text: draft.copingStep || '', ...nextStepPosition }} onChange={(changed) => {
            if (changed.text !== (draft.copingStep || '')) onFieldChange('copingStep', changed.text);
            if (changed.x !== nextStepPosition.x || changed.y !== nextStepPosition.y) setNextStepPosition({ x: changed.x, y: changed.y });
          }} onRemove={() => { setNextStepOpen(false); window.requestAnimationFrame(() => nextStepButtonRef.current?.focus()); }} paperStyle={draft.paperStyle} placeholder="One thing I can do next..." removeLabel="Close Next step" title="Next step" />}
        </div>
        {bookOpen && <StickerBook discoveries={discoveries} onChoose={chooseSticker} onClose={onBookClose} onDropSticker={dropSticker} onPageChange={setBookPage} onPlacementRegionChange={setPlacementRegion} pageIndex={bookPage} placementRegion={placementRegion} />}
      </div>
      {!checkIn && <div className="freewrite-page-footer">
          <label>Tags
            <input value={visibleTags.join(', ')} onChange={(event) => onFieldChange('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="memory, school, idea" />
            {visibleTags.length > 0 && <span className="journal-tag-preview">{visibleTags.map((tag) => <small key={tag}>#{tag}</small>)}</span>}
          </label>
      </div>}
      <span className="notebook-page-corner" aria-hidden="true" />
    </div>
    <div className="journal-writing-bar">
      <div className="journal-writing-tools-slot" ref={setToolbarTarget} />
      <div className="journal-writing-actions">{actionButtons}</div>
    </div>
    </>
  );
}

function dateKeyToDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(year, month - 1, day);
}
