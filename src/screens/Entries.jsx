import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookOpen, FileText, List, MessageCircleQuestionMark, PenLine, RotateCcw, Save, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkInTitleAfterMoodChange, createFreeWriteEntry, moods } from '../data/journalData';
import { isCheckIn, isJournalDateAllowed, isVisibleJournalEntry, todayKey } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';
import { JournalTags } from '../components/journal/JournalTags';
import { effectiveEntryTags, matchesEntryTag } from '../utils/journalTags';
import { PageHeader } from '../components/layout/PageHeader';
import { useJournalDraft } from '../hooks/useJournalDraft';
import { DraftRecoveryNotice, SaveState } from '../components/journal/DraftRecoveryNotice';
import { StickerBook, useStickerDiscoveries } from '../components/journal/StickerBook';
import { isStickerUnlocked, stickerById } from '../data/stickers';
import { StickerLayer } from '../components/journal/StickerLayer';
import { RichNoteEditor } from '../components/journal/RichNoteEditor';
import { StickyNote } from '../components/journal/StickyNote';
import { clampStickerPosition, createStickerPlacement } from '../utils/stickerUtils';
import { createJournalNote, getJournalNotes, MAX_JOURNAL_NOTES } from '../utils/journalNotes';
import '../styles/editor.css';

export function Entries({ nav, entries, onSave, onQueueDelete, onPrimary, onBookmark, onHelp, privateStorage, writeMode = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedEntryId = new URLSearchParams(location.search).get('entry');
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [bookmarkFilter, setBookmarkFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creatingFreeWrite, setCreatingFreeWrite] = useState(false);
  const [newEntryKey, setNewEntryKey] = useState(0);
  const ignoredStickerRequest = useRef(null);
  const journalEntries = entries.filter(isVisibleJournalEntry);
  const filtered = journalEntries.filter((entry) => {
    const text = `${entry.note} ${entry.mood} ${entry.specificFeeling} ${effectiveEntryTags(entry).join(' ')} ${(entry.factors || []).join(' ')}`.toLowerCase();
    const matchesKeyword = text.includes(query.toLowerCase());
    const matchesMood = !moodFilter || (isCheckIn(entry) && entry.mood === moodFilter);
    const matchesTag = matchesEntryTag(entry, tagFilter);
    const matchesDate = !dateFilter || entry.dateKey === dateFilter;
    const matchesBookmark = !bookmarkFilter || entry.bookmarked;
    return matchesKeyword && matchesMood && matchesTag && matchesDate && matchesBookmark;
  });
  const hasFilters = Boolean(query || moodFilter || tagFilter || dateFilter || bookmarkFilter);
  const selectedEntry = selectedEntryId ? journalEntries.find((entry) => entry.id === selectedEntryId) : null;
  const selectedInResults = Boolean(selectedEntry && filtered.some((entry) => entry.id === selectedEntryId));
  useEffect(() => {
    if (!selectedInResults) return;
    document.getElementById(`journal-entry-${selectedEntryId}`)?.scrollIntoView({ block: 'start' });
  }, [selectedEntryId, selectedInResults]);
  const advancedFilterCount = [moodFilter, tagFilter, dateFilter, bookmarkFilter].filter(Boolean).length;
  const clearFilters = () => {
    setQuery('');
    setMoodFilter('');
    setTagFilter('');
    setDateFilter('');
    setBookmarkFilter(false);
  };
  if (editing) return <EditEntry entry={editing} onNew={() => { setEditing(null); setCreatingFreeWrite(true); }} onCancel={() => setEditing(null)} onSave={onSave} onHelp={onHelp} privateStorage={privateStorage} />;
  if (writeMode || creatingFreeWrite) return <FreeWriteEntry key={newEntryKey} nav={nav} ignoredStickerRequest={ignoredStickerRequest.current} onNew={() => { ignoredStickerRequest.current = location.key; setNewEntryKey((key) => key + 1); }} onCancel={() => writeMode ? navigate(/^\/journal\/library(?:\?|$)/.test(location.state?.libraryReturn || '') ? location.state.libraryReturn : '/entries') : setCreatingFreeWrite(false)} onSave={onSave} onHelp={onHelp} privateStorage={privateStorage} />;
  return (
    <section className="screen app-screen entries-screen">
      <PageHeader title="Entries" actions={journalEntries.length > 0 ? (
        <button className="primary-button archive-primary-action" onClick={() => setCreatingFreeWrite(true)} type="button">
          <PenLine aria-hidden="true" size={18} />
          New entry
        </button>
      ) : null} />
      {nav}
      {journalEntries.length > 0 && <div className="panel archive-toolbar" aria-label="Search and filter entries">
        <label className="archive-keyword-field">Keyword search
          <span className="archive-input-wrap">
            <Search aria-hidden="true" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" />
          </span>
        </label>
        <button aria-controls="archive-advanced-filters" aria-expanded={filtersOpen} className="archive-filter-toggle" onClick={() => setFiltersOpen((open) => !open)} type="button"><SlidersHorizontal aria-hidden="true" size={17} />Filters{advancedFilterCount > 0 && <span className="archive-filter-count">{advancedFilterCount}</span>}</button>
        <div className={filtersOpen ? 'archive-advanced-filters open' : 'archive-advanced-filters'} id="archive-advanced-filters">
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
        </div>
        <div className="archive-filter-status" aria-live="polite">
          <span>Showing <strong>{filtered.length}</strong> of {journalEntries.length}</span>
          {hasFilters && (
            <button className="archive-clear-button" onClick={clearFilters} type="button">
              <RotateCcw aria-hidden="true" size={15} />
              Clear filters
            </button>
          )}
        </div>
      </div>}
      <div className="entry-list">
        {selectedEntryId && !selectedEntry && <div className="panel archive-empty-state" role="status"><h2>Page not found.</h2><p>It may have been deleted or belong to another journal.</p><button className="secondary" onClick={() => navigate('/entries', { replace: true })} type="button">Show journal</button></div>}
        {selectedEntry && !selectedInResults && <div className="panel archive-empty-state" role="status"><h2>Page hidden by filters.</h2><p>Your current filters are still active.</p><button className="secondary" onClick={clearFilters} type="button">Clear filters</button></div>}
        {filtered.length > 0 && (
          <div className="archive-results-heading">
            <div>
              <span className="screen-kicker">Journal archive</span>
              <h2>{hasFilters ? 'Matching entries' : 'Recent entries'}</h2>
            </div>
            <span>{filtered.length} {filtered.length === 1 ? 'page' : 'pages'}</span>
          </div>
        )}
        {filtered.length === 0 && !selectedEntryId && (
          <div className="panel archive-empty-state">
            {journalEntries.length === 0 ? (
              <>
                <span className="archive-empty-icon" aria-hidden="true"><BookOpen size={28} /></span>
                <h2>A blank page is waiting</h2>
                <p>Begin with whatever is on your mind.</p>
                <button className="primary" onClick={() => setCreatingFreeWrite(true)} type="button">
                  <PenLine aria-hidden="true" size={17} />
                  Start writing
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
        {filtered.map((entry) => <div id={entry.id === selectedEntryId ? `journal-entry-${entry.id}` : undefined} key={entry.id}><EntryCard entry={entry} openByLink={entry.id === selectedEntryId} onEdit={() => setEditing(entry)} onDelete={() => onQueueDelete(entry)} onPrimary={() => onPrimary(entry.id)} onBookmark={(bookmarked) => onBookmark(entry.id, bookmarked)} /></div>)}
      </div>
    </section>
  );
}

function FreeWriteEntry({ nav, onSave, onCancel, onNew, onHelp, privateStorage, ignoredStickerRequest }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => {
    const fresh = createFreeWriteEntry();
    const requestedDate = new URLSearchParams(location.search).get('date');
    // Recovery below replaces this initial value, never the other way around.
    return isJournalDateAllowed(requestedDate) ? { ...fresh, dateKey: requestedDate } : fresh;
  });
  const [saveState, setSaveState] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const appliedStickers = useRef(new Set());
  const { discoveries, discoveryError } = useStickerDiscoveries(privateStorage);
  const draftState = useJournalDraft({ privateStorage, formId: 'freewrite:new', draft, setDraft });
  const { storedDraft, restoreDraft, draftReady } = draftState;
  const draftResolved = draftReady && !storedDraft;
  useEffect(() => { if (draftReady && storedDraft) restoreDraft(); }, [draftReady, storedDraft, restoreDraft]);
  const incomingSticker = location.key === ignoredStickerRequest ? undefined : stickerById.get(location.state?.stickerId);
  useEffect(() => {
    if (!draftResolved || !incomingSticker || !isStickerUnlocked(incomingSticker, discoveries)) return;
    // Recovery can replace the initial page. Apply once to each page, never reset it.
    const request = `${location.key}:${draft.id}:${incomingSticker.id}`;
    if (appliedStickers.current.has(request)) return;
    appliedStickers.current.add(request);
    setDraft((current) => {
      const placements = current.stickers || [];
      if (placements.some((item) => item.stickerId === incomingSticker.id) || placements.length >= 40) return current;
      return { ...current, stickers: [...placements, createStickerPlacement(incomingSticker.id, placements)] };
    });
  }, [incomingSticker, discoveries, draftResolved, draft.id, location.key]);
  const newEntry = async () => {
    if (!draftResolved || saveState === 'saving' || !draftState.confirmDiscard()) return;
    try {
      await draftState.clearDraft();
      if (location.state?.stickerId) {
        const { stickerId: _stickerId, ...state } = location.state;
        navigate(`${location.pathname}${location.search}`, { replace: true, state });
      }
      onNew();
    } catch { setActionError('Could not clear the device draft. Your writing is still here.'); }
  };
  const setField = (field, value) => { if (!draftResolved) return; setSaveState(''); setDraft((current) => ({ ...current, [field]: value })); };
  const setWriting = (note, noteDoc) => { if (!draftResolved) return; setSaveState(''); setDraft((current) => ({ ...current, note, noteDoc })); };
  const setNotes = (update) => { if (!draftResolved) return; setSaveState(''); setDraft((current) => ({ ...current, stickyNotes: update(getJournalNotes(current)), pageNote: '' })); };
  const saveDraft = async () => {
    if (!draftResolved || saveState === 'saving') return;
    if (!isJournalDateAllowed(draft.dateKey)) { setSaveState('invalid-date'); return; }
    if (!draft.note.trim()) { setSaveState('empty'); return; }
    setSaveState('saving');
    const entry = { ...draft, tags: Array.from(new Set([...(draft.tags || []), 'free-write'])) };
    let saved;
    try { saved = await onSave(entry); } catch { setSaveState('error'); return; }
    if (!saved) { setSaveState('error'); return; }
    setSaveState('saved');
    try { await draftState.clearDraft(entry); }
    catch { setActionError('Entry saved, but the device draft could not be cleared.'); return; }
    onCancel();
  };
  return (
    <section className="screen app-screen freewrite-screen">
      <h1 className="visually-hidden">New journal page</h1>
      {nav}
      <EditorContextActions encrypted={privateStorage?.encrypted} onNew={newEntry} bookOpen={bookOpen} onBookToggle={() => setBookOpen((open) => !open)} saveState={saveState} draftState={draftState} onRetry={saveDraft} />
      {(actionError || (incomingSticker?.unlock && discoveryError)) && <p role="alert">{actionError || discoveryError}</p>}
      <form aria-busy={!draftReady} inert={!draftResolved} className="freewrite-form" onSubmit={async (event) => {
        event.preventDefault();
        await saveDraft();
      }}>
        <JournalNotebook actionButtons={<>
          <button aria-label="Save page" className="primary" disabled={!draftResolved || saveState === 'saving'} title="Save page" type="submit"><Save aria-hidden="true" size={17} />Save</button>
          <button disabled={saveState === 'saving'} onClick={() => draftState.confirmDiscard() && onCancel()} type="button"><X aria-hidden="true" size={17} />Cancel</button>
        </>} bookOpen={bookOpen} onBookClose={() => setBookOpen(false)} draft={draft} onFieldChange={setField} onHelp={onHelp} onNotesChange={setNotes} onWritingChange={setWriting} privateStorage={privateStorage} required />
        <div className="journal-writing-feedback">
          {saveState === 'empty' && <span className="journal-save-state error" role="alert">Write something on the page before saving.</span>}
          {saveState === 'invalid-date' && <span className="journal-save-state error" role="alert">Choose today or an earlier journal date.</span>}
        </div>
      </form>
    </section>
  );
}

function EditEntry({ entry, onSave, onCancel, onNew, onHelp, privateStorage }) {
  const [draft, setDraft] = useState(entry);
  const [saveState, setSaveState] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const draftState = useJournalDraft({ privateStorage, formId: `entry:${entry.id}`, draft, setDraft });
  const draftResolved = draftState.draftReady && !draftState.storedDraft;
  const setField = (field, value) => {
    if (!draftResolved) return;
    setSaveState('');
    setDraft((current) => field === 'mood' && isCheckIn(current)
      ? { ...current, mood: value, specificFeeling: checkInTitleAfterMoodChange(current.specificFeeling, current.mood, value) }
      : { ...current, [field]: value });
  };
  const setWriting = (note, noteDoc) => { if (!draftResolved) return; setSaveState(''); setDraft((current) => ({ ...current, note, noteDoc })); };
  const setNotes = (update) => { if (!draftResolved) return; setSaveState(''); setDraft((current) => ({ ...current, stickyNotes: update(getJournalNotes(current)), pageNote: '' })); };
  const checkIn = isCheckIn(draft);
  const mood = checkIn ? moods.find((item) => item.key === draft.mood) : null;
  const saveDraft = async () => {
    if (!draftResolved || saveState === 'saving') return;
    if (!isJournalDateAllowed(draft.dateKey)) { setSaveState('invalid-date'); return; }
    const tags = checkIn
      ? draft.tags
      : Array.from(new Set([...(draft.tags || []), 'free-write']));
    const edited = { ...draft, tags };
    setSaveState('saving');
    let saved;
    try { saved = await onSave(edited); } catch { setSaveState('error'); return; }
    if (!saved) { setSaveState('error'); return; }
    setSaveState('saved');
    try { await draftState.clearDraft(edited); }
    catch { setActionError('Entry saved, but the device draft could not be cleared.'); return; }
    onCancel();
  };
  return (
    <section className="screen app-screen freewrite-screen edit-entry-screen">
      <h1 className="visually-hidden">{checkIn ? 'Edit check-in' : 'Edit journal page'}</h1>
      <EditorContextActions encrypted={privateStorage?.encrypted} onNew={() => draftResolved && draftState.confirmDiscard() && onNew()} bookOpen={bookOpen} onBookToggle={() => setBookOpen((open) => !open)} saveState={saveState} draftState={draftState} onRetry={saveDraft} />
      {actionError && <p role="alert">{actionError}</p>}
      <DraftRecoveryNotice record={draftState.draftReady ? draftState.storedDraft : null} onRestore={draftState.restoreDraft} onDiscard={async () => {
        try { await draftState.discardDraft(); }
        catch { setActionError('Could not clear the device draft. Your saved entry is unchanged.'); }
      }} />
      <form aria-busy={!draftState.draftReady} inert={!draftResolved} className="freewrite-form" onSubmit={async (event) => {
        event.preventDefault();
        await saveDraft();
      }}>
        <JournalNotebook actionButtons={<>
          <button aria-label="Save changes" className="primary" disabled={!draftResolved || saveState === 'saving'} title="Save changes" type="submit"><Save aria-hidden="true" size={17} />Save</button>
          <button disabled={saveState === 'saving'} onClick={() => draftState.confirmDiscard() && onCancel()} type="button"><X aria-hidden="true" size={17} />Cancel</button>
        </>} bookOpen={bookOpen} onBookClose={() => setBookOpen(false)} checkIn={checkIn} draft={draft} mood={mood} onFieldChange={setField} onHelp={onHelp} onNotesChange={setNotes} onWritingChange={setWriting} privateStorage={privateStorage} />
        <div className="journal-writing-feedback">
          {saveState === 'invalid-date' && <span className="journal-save-state error" role="alert">Choose today or an earlier journal date.</span>}
        </div>
      </form>
    </section>
  );
}

function StickerBookTrigger({ open, onToggle, disabled }) {
  return <button disabled={disabled} aria-controls="sticker-book-panel" aria-expanded={open} aria-label="Sticker Book" className="secondary-button sticker-book-trigger" onClick={onToggle} title="Sticker Book" type="button"><BookOpen aria-hidden="true" size={18} /><span>Sticker Book</span></button>;
}

function EditorContextActions({ onNew, bookOpen, onBookToggle, saveState, draftState, onRetry, encrypted }) {
  const draftStatus = draftState.dirty && draftState.draftStatus === 'saved' && !encrypted ? 'unavailable' : draftState.draftStatus;
  const showSaveState = ['saving', 'saved', 'error'].includes(saveState)
    || ((draftState.dirty || draftStatus === 'error') && ['saving', 'saved', 'error', 'unavailable'].includes(draftStatus));
  const recovering = !draftState.draftReady || Boolean(draftState.storedDraft);
  const actions = <div className="journal-editor-context">
    <button className="primary-button" disabled={recovering || saveState === 'saving'} onClick={onNew} type="button"><PenLine aria-hidden="true" size={17} />New entry</button>
    {!draftState.draftReady ? <span className="journal-save-state" role="status">Checking device draft...</span> : showSaveState
      ? <SaveState state={saveState} onRetry={onRetry} draftStatus={draftStatus} />
      : <span className="journal-save-state" role="status">{draftState.storedDraft ? 'Device draft available' : draftState.dirty ? 'Unsaved changes' : 'No unsaved changes'}</span>}
    <StickerBookTrigger disabled={recovering} open={bookOpen} onToggle={onBookToggle} />
  </div>;
  return actions;
}

function JournalNotebook({ actionButtons, draft, mood, onFieldChange, onHelp, onNotesChange, onWritingChange, privateStorage, bookOpen, onBookClose, checkIn = false, required = false }) {
  const [bookPage, setBookPage] = useState(0);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [placementRegion, setPlacementRegion] = useState('writing');
  const [nextStepOpen, setNextStepOpen] = useState(false);
  const [nextStepPosition, setNextStepPosition] = useState({ x: 0.95, y: 0.05 });
  const [focusNoteId, setFocusNoteId] = useState(null);
  const [toolbarTarget, setToolbarTarget] = useState(null);
  const { discoveries, discoveryError } = useStickerDiscoveries(privateStorage);
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
      {onHelp && <button aria-label="Help & feedback" className="mobile-form-help" onClick={onHelp} title="Help & feedback" type="button"><MessageCircleQuestionMark aria-hidden="true" size={20} /></button>}
      <div className="journal-paper-controls-actions">
        <div aria-label="Paper style" className="journal-paper-switch" role="group">
          <button aria-label="Plain paper" aria-pressed={draft.paperStyle === 'plain'} onClick={() => onFieldChange('paperStyle', 'plain')} title="Plain paper" type="button"><FileText aria-hidden="true" size={17} /></button>
          <button aria-label="Lined paper" aria-pressed={draft.paperStyle !== 'plain'} onClick={() => onFieldChange('paperStyle', 'lined')} title="Lined paper" type="button"><List aria-hidden="true" size={17} /></button>
        </div>
      </div>
    </div>
    <div className={`freewrite-notebook journal-editor-notebook${checkIn ? ' edit-entry-notebook' : ''}${draft.paperStyle === 'plain' ? ' journal-paper-plain' : ''}`} style={mood ? { '--entry-accent': mood.color } : undefined}>
      <div className="journal-paper-intro" ref={introRef}>
        <div className="freewrite-page-heading">
          <div className="journal-title-row">
            {!checkIn ? (
              <label className="freewrite-title-field"><span className="visually-hidden">Title</span>
                <input maxLength={100} required value={draft.specificFeeling || ''} onChange={(event) => onFieldChange('specificFeeling', event.target.value)} placeholder="Page title" />
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
        {bookOpen && <StickerBook discoveries={discoveries} discoveryError={discoveryError} onChoose={chooseSticker} onClose={onBookClose} onDropSticker={dropSticker} onPageChange={setBookPage} onPlacementRegionChange={setPlacementRegion} pageIndex={bookPage} placementRegion={placementRegion} />}
      </div>
      <div className="freewrite-page-footer">
        <JournalTags entry={draft} onChange={(tags) => onFieldChange('tags', tags)} />
      </div>
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
