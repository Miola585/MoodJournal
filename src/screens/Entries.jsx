import { useState } from 'react';
import { BookOpen, PenLine, RotateCcw, Save, Search, X } from 'lucide-react';
import { createFreeWriteEntry, moods } from '../data/journalData';
import { isCheckIn, isVisibleJournalEntry } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';

export function Entries({ nav, entries, onSave, onDelete, onPrimary }) {
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [creatingFreeWrite, setCreatingFreeWrite] = useState(false);
  const journalEntries = entries.filter(isVisibleJournalEntry);
  const filtered = journalEntries.filter((entry) => {
    const text = `${entry.note} ${entry.mood} ${entry.specificFeeling} ${(entry.tags || []).join(' ')} ${(entry.factors || []).join(' ')}`.toLowerCase();
    const matchesKeyword = text.includes(query.toLowerCase());
    const matchesMood = !moodFilter || entry.mood === moodFilter;
    const matchesTag = !tagFilter || (entry.tags || []).some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    const matchesDate = !dateFilter || entry.dateKey === dateFilter;
    return matchesKeyword && matchesMood && matchesTag && matchesDate;
  });
  const hasFilters = Boolean(query || moodFilter || tagFilter || dateFilter);
  const clearFilters = () => {
    setQuery('');
    setMoodFilter('');
    setTagFilter('');
    setDateFilter('');
  };
  if (editing) return <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={(entry) => { onSave(entry); setEditing(null); }} />;
  if (creatingFreeWrite) return <FreeWriteEntry nav={nav} onCancel={() => setCreatingFreeWrite(false)} onSave={(entry) => { onSave(entry, 'entries'); setCreatingFreeWrite(false); }} />;
  return (
    <section className="screen app-screen entries-screen">
      <div className="archive-heading">
        <div>
          <h1>Journal Entries</h1>
          <p>Search, revisit, or write freely.</p>
        </div>
        <button className="primary archive-primary-action" onClick={() => setCreatingFreeWrite(true)} type="button">
          <PenLine aria-hidden="true" size={18} />
          New free write
        </button>
      </div>
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
        {filtered.map((entry) => <EntryCard entry={entry} key={entry.id} onEdit={() => setEditing(entry)} onDelete={() => onDelete(entry.id)} onPrimary={() => onPrimary(entry.id)} />)}
      </div>
    </section>
  );
}

function FreeWriteEntry({ nav, onSave, onCancel }) {
  const [draft, setDraft] = useState(createFreeWriteEntry());
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const entryDate = new Date(draft.created).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  return (
    <section className="screen app-screen freewrite-screen">
      <header className="freewrite-heading">
        <span>New journal page</span>
        <h1>Free Write</h1>
        <p>{entryDate}</p>
      </header>
      {nav}
      <form className="freewrite-form" onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...draft, tags: Array.from(new Set([...(draft.tags || []), 'free-write'])) });
      }}>
        <div className="freewrite-notebook">
          <div className="freewrite-page-heading">
            <label className="freewrite-title-field">Title
              <input maxLength={100} required value={draft.specificFeeling} onChange={(event) => setField('specificFeeling', event.target.value)} placeholder="Give this page a title" />
            </label>
            <label>Mood
              <select value={draft.mood} onChange={(event) => setField('mood', event.target.value)}>
                {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
              </select>
            </label>
          </div>
          <label className="freewrite-writing-field">
            <span className="visually-hidden">Journal entry</span>
            <textarea required value={draft.note} onChange={(event) => setField('note', event.target.value)} placeholder="Start writing here..." />
          </label>
          <div className="freewrite-page-footer">
            <label>Tags
              <input value={(draft.tags || []).filter((tag) => tag !== 'free-write').join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="memory, school, idea" />
            </label>
            <label>Optional next step
              <input value={draft.copingStep || ''} onChange={(event) => setField('copingStep', event.target.value)} placeholder="Something to return to later" />
            </label>
          </div>
        </div>
        <div className="actions freewrite-actions">
          <button className="primary" type="submit"><Save aria-hidden="true" size={17} />Save page</button>
          <button onClick={onCancel} type="button"><X aria-hidden="true" size={17} />Cancel</button>
        </div>
      </form>
    </section>
  );
}

function EditEntry({ entry, onSave, onCancel }) {
  const [draft, setDraft] = useState(entry);
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const checkIn = isCheckIn(draft);
  const mood = moods.find((item) => item.key === draft.mood);
  const entryDate = new Date(draft.created).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  return (
    <section className="screen app-screen freewrite-screen edit-entry-screen">
      <header className="freewrite-heading">
        <span>{checkIn ? 'Editing check-in' : 'Editing journal page'}</span>
        <h1>Edit Entry</h1>
        <p>{entryDate}</p>
      </header>
      <form className="freewrite-form" onSubmit={(event) => {
        event.preventDefault();
        const tags = checkIn
          ? draft.tags
          : Array.from(new Set([...(draft.tags || []), 'free-write']));
        onSave({ ...draft, tags });
      }}>
        <div className="freewrite-notebook edit-entry-notebook" style={mood ? { '--entry-accent': mood.color } : undefined}>
          <div className="freewrite-page-heading">
            {!checkIn ? (
              <label className="freewrite-title-field">Title
                <input maxLength={100} required value={draft.specificFeeling || ''} onChange={(event) => setField('specificFeeling', event.target.value)} placeholder="Give this page a title" />
              </label>
            ) : (
              <div className="edit-entry-label">
                <span>Check-in</span>
                <strong>{draft.specificFeeling || draft.mood || 'Journal entry'}</strong>
              </div>
            )}
            <label>Mood
              <select value={draft.mood} onChange={(event) => setField('mood', event.target.value)}>
                {moods.map((moodOption) => <option key={moodOption.key}>{moodOption.key}</option>)}
              </select>
            </label>
          </div>
          <label className="freewrite-writing-field">
            <span className="visually-hidden">Journal entry</span>
            <textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} placeholder="Write what you want to remember..." />
          </label>
          <div className="freewrite-page-footer">
            {!checkIn && (
              <label>Tags
                <input value={(draft.tags || []).filter((tag) => tag !== 'free-write').join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="memory, school, idea" />
              </label>
            )}
            <label>Optional next step
              <input value={draft.copingStep || ''} onChange={(event) => setField('copingStep', event.target.value)} placeholder="Something to return to later" />
            </label>
            {checkIn && (
              <label className="inline-check edit-primary-check">
                <input checked={Boolean(draft.primary)} onChange={(event) => setField('primary', event.target.checked)} type="checkbox" />
                Make this the main entry for this day
              </label>
            )}
          </div>
        </div>
        <div className="actions freewrite-actions edit-entry-actions">
          <button className="primary" type="submit"><Save aria-hidden="true" size={17} />Save changes</button>
          <button onClick={onCancel} type="button"><X aria-hidden="true" size={17} />Cancel</button>
        </div>
      </form>
    </section>
  );
}
