import { useState } from 'react';
import { createFreeWriteEntry, moods } from '../data/journalData';
import { isVisibleJournalEntry } from '../utils/journalUtils';
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
  if (editing) return <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={(entry) => { onSave(entry); setEditing(null); }} />;
  if (creatingFreeWrite) return <FreeWriteEntry nav={nav} onCancel={() => setCreatingFreeWrite(false)} onSave={(entry) => { onSave(entry, 'entries'); setCreatingFreeWrite(false); }} />;
  return (
    <section className="screen app-screen entries-screen">
      <div className="archive-heading">
        <div>
          <h1>Journal Entries</h1>
          <p>Search, revisit, or write freely.</p>
        </div>
        <button className="primary archive-primary-action" onClick={() => setCreatingFreeWrite(true)} type="button">Create Free Write</button>
      </div>
      {nav}
      <div className="panel archive-toolbar" aria-label="Search and filter entries">
        <label>Keyword search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="note, feeling, next step" />
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
      </div>
      <div className="entry-list">
        {filtered.length === 0 && (
          <div className="panel archive-empty-state">
            {journalEntries.length === 0 ? (
              <>
                <span className="archive-empty-mark" aria-hidden="true">Journal</span>
                <h2>No saved entries yet.</h2>
                <p>Your check-ins and free writes will appear here after you save them.</p>
              </>
            ) : (
              <>
                <span className="archive-empty-mark" aria-hidden="true">Search</span>
                <h2>No entries match these filters.</h2>
                <p>Try changing your search, mood, tag, or date.</p>
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
  return (
    <section className="screen app-screen">
      <h1>Free Write</h1>
      {nav}
      <form className="flow" onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...draft, tags: Array.from(new Set([...(draft.tags || []), 'free-write'])) });
      }}>
        <div className="panel two-col">
          <label>Entry title or feeling
            <input value={draft.specificFeeling} onChange={(event) => setField('specificFeeling', event.target.value)} placeholder="What would you call this entry?" />
          </label>
          <label>Mood label
            <select value={draft.mood} onChange={(event) => setField('mood', event.target.value)}>
              {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
            </select>
          </label>
        </div>
        <div className="panel">
          <label>Journal
            <textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} placeholder="Write freely. This will stay separate from your check-in summaries." />
          </label>
        </div>
        <div className="panel two-col">
          <label>Tags
            <input value={(draft.tags || []).join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="memory, school, idea" />
          </label>
          <label>Optional next step
            <input value={draft.copingStep || ''} onChange={(event) => setField('copingStep', event.target.value)} placeholder="One thing you may want to do next" />
          </label>
        </div>
        <div className="actions">
          <button className="primary" type="submit">Save Free Write</button>
          <button onClick={onCancel} type="button">Cancel</button>
        </div>
      </form>
    </section>
  );
}

function EditEntry({ entry, onSave, onCancel }) {
  const [draft, setDraft] = useState(entry);
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <section className="screen app-screen">
      <h1>Edit Entry</h1>
      <div className="panel">
        <label>Mood
          <select value={draft.mood} onChange={(event) => setField('mood', event.target.value)}>
            {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
          </select>
        </label>
        <label>Journal
          <textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} />
        </label>
        <label>Next step
          <input value={draft.copingStep || ''} onChange={(event) => setField('copingStep', event.target.value)} />
        </label>
        <label className="inline-check">
          <input checked={Boolean(draft.primary)} onChange={(event) => setField('primary', event.target.checked)} type="checkbox" />
          Make this the main entry for this day
        </label>
      </div>
      <div className="actions">
        <button className="primary" onClick={() => onSave(draft)} type="button">Save edits</button>
        <button onClick={onCancel} type="button">Cancel</button>
      </div>
    </section>
  );
}
