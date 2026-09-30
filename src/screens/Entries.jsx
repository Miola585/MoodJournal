import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookOpen, PenLine, RotateCcw, Save, Search, Undo2, X } from 'lucide-react';
import { createFreeWriteEntry, moods } from '../data/journalData';
import { isCheckIn, isVisibleJournalEntry, todayKey } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';
import { PageHeader } from '../components/layout/PageHeader';
import { useJournalDraft } from '../hooks/useJournalDraft';
import { DraftRecoveryNotice, SaveState } from '../components/journal/DraftRecoveryNotice';

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
    const matchesMood = !moodFilter || entry.mood === moodFilter;
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
  const draftState = useJournalDraft({ privateStorage, formId: 'freewrite:new', draft, setDraft });
  const setField = (field, value) => { setSaveState(''); setDraft((current) => ({ ...current, [field]: value })); };
  const mood = moods.find((item) => item.key === draft.mood);
  const entryDate = dateKeyToDate(draft.dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const saveDraft = async () => {
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
      <PageHeader eyebrow="New journal page" title="Free Write" subtitle={entryDate} />
      {nav}
      <DraftRecoveryNotice record={draftState.storedDraft} onRestore={draftState.restoreDraft} onDiscard={draftState.discardDraft} />
      <form className="freewrite-form" onSubmit={async (event) => {
        event.preventDefault();
        await saveDraft();
      }}>
        <JournalNotebook draft={draft} mood={mood} onFieldChange={setField} required />
        <div className="actions freewrite-actions">
          <button className="primary" disabled={saveState === 'saving'} type="submit"><Save aria-hidden="true" size={17} />Save page</button>
          <button onClick={() => draftState.confirmDiscard() && onCancel()} type="button"><X aria-hidden="true" size={17} />Cancel</button>
          <SaveState state={saveState} onRetry={saveDraft} draftStatus={draftState.dirty ? draftState.draftStatus : ''} />
        </div>
      </form>
    </section>
  );
}

function EditEntry({ entry, onSave, onCancel, privateStorage }) {
  const [draft, setDraft] = useState(entry);
  const [saveState, setSaveState] = useState('');
  const draftState = useJournalDraft({ privateStorage, formId: `entry:${entry.id}`, draft, setDraft });
  const setField = (field, value) => { setSaveState(''); setDraft((current) => ({ ...current, [field]: value })); };
  const checkIn = isCheckIn(draft);
  const mood = moods.find((item) => item.key === draft.mood);
  const entryDate = dateKeyToDate(draft.dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const saveDraft = async () => {
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
      <PageHeader eyebrow={checkIn ? 'Editing check-in' : 'Editing journal page'} title="Edit Entry" subtitle={entryDate} />
      <DraftRecoveryNotice record={draftState.storedDraft} onRestore={draftState.restoreDraft} onDiscard={draftState.discardDraft} />
      <form className="freewrite-form" onSubmit={async (event) => {
        event.preventDefault();
        await saveDraft();
      }}>
        <JournalNotebook checkIn={checkIn} draft={draft} mood={mood} onFieldChange={setField} />
        <div className="actions freewrite-actions edit-entry-actions">
          <button className="primary" disabled={saveState === 'saving'} type="submit"><Save aria-hidden="true" size={17} />Save changes</button>
          <button onClick={() => draftState.confirmDiscard() && onCancel()} type="button"><X aria-hidden="true" size={17} />Cancel</button>
          <SaveState state={saveState} onRetry={saveDraft} draftStatus={draftState.dirty ? draftState.draftStatus : ''} />
        </div>
      </form>
    </section>
  );
}

function JournalNotebook({ draft, mood, onFieldChange, checkIn = false, required = false }) {
  const visibleTags = (draft.tags || []).filter((tag) => tag !== 'free-write');
  return (
    <div className={`freewrite-notebook journal-editor-notebook${checkIn ? ' edit-entry-notebook' : ''}`} style={mood ? { '--entry-accent': mood.color } : undefined}>
      <div className="freewrite-page-heading">
        {!checkIn ? (
          <label className="freewrite-title-field">Title
            <input maxLength={100} required value={draft.specificFeeling || ''} onChange={(event) => onFieldChange('specificFeeling', event.target.value)} placeholder="Give this page a title" />
          </label>
        ) : (
          <div className="edit-entry-label">
            <span>Check-in</span>
            <strong>{draft.specificFeeling || draft.mood || 'Journal entry'}</strong>
          </div>
        )}
        <label className="journal-mood-field">Mood
          <select value={draft.mood} onChange={(event) => onFieldChange('mood', event.target.value)}>
            {moods.map((moodOption) => <option key={moodOption.key}>{moodOption.key}</option>)}
          </select>
        </label>
        <label className="journal-date-field">Journal date
          <input max={todayKey()} onChange={(event) => onFieldChange('dateKey', event.target.value)} required type="date" value={draft.dateKey} />
        </label>
      </div>
      <label className="freewrite-writing-field">
        <span className="visually-hidden">Journal entry</span>
        <textarea required={required} value={draft.note} onChange={(event) => onFieldChange('note', event.target.value)} placeholder={checkIn ? 'Write what you want to remember...' : 'Start writing here...'} />
      </label>
      <div className="freewrite-page-footer">
        {!checkIn && (
          <label>Tags
            <input value={visibleTags.join(', ')} onChange={(event) => onFieldChange('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="memory, school, idea" />
            {visibleTags.length > 0 && <span className="journal-tag-preview">{visibleTags.map((tag) => <small key={tag}>#{tag}</small>)}</span>}
          </label>
        )}
        <label>Optional next step
          <input value={draft.copingStep || ''} onChange={(event) => onFieldChange('copingStep', event.target.value)} placeholder="Something to return to later" />
        </label>
        {checkIn && (
          <label className="inline-check edit-primary-check">
            <input checked={Boolean(draft.primary)} onChange={(event) => onFieldChange('primary', event.target.checked)} type="checkbox" />
            Make this the main entry for this day
          </label>
        )}
      </div>
      <span className="notebook-page-corner" aria-hidden="true" />
    </div>
  );
}

function dateKeyToDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(year, month - 1, day);
}
