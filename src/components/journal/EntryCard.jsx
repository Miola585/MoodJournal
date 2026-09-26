import { useId, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { moods } from '../../data/journalData';
import { isCheckIn } from '../../utils/journalUtils';
import { stripGameData } from '../games/gameUtils';

export function EntryCard({ entry, onEdit, onDelete, onPrimary }) {
  const [expanded, setExpanded] = useState(false);
  const pageId = useId();
  const mood = moods.find((item) => item.key === entry.mood);
  const entryLabel = isCheckIn(entry) ? 'Check-In' : 'Free Write';
  const notePreview = stripGameData(entry.note || '').trim();
  const canToggle = Boolean(onEdit || onDelete);
  const showFullEntry = expanded || !canToggle;
  const createdAt = new Date(entry.created);
  return (
    <article className={`${isCheckIn(entry) ? 'entry-card entry-card-checkin' : 'entry-card entry-card-freewrite'}${showFullEntry ? ' entry-card-open' : ''}`} style={mood ? { '--entry-accent': mood.color } : undefined}>
      <div className="entry-card-topline">
        <div>
          <span className="entry-type-badge">{entryLabel}</span>
          {entry.primary ? <span className="primary-marker">Main</span> : null}
        </div>
        <time dateTime={entry.created}>
          <span>{createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>{createdAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
        </time>
      </div>
      <h2>{isCheckIn(entry) ? `${mood?.emoji || ''} ${entry.mood || 'Check-In'}` : entry.specificFeeling || 'Untitled page'}</h2>
      {!showFullEntry && <p className="entry-closed-note"><BookOpen aria-hidden="true" size={16} />Page closed</p>}
      {showFullEntry && (
        <div className="entry-page" id={pageId}>
          <p className="entry-preview">{notePreview || 'No writing on this page.'}</p>
          {entry.copingStep && <p className="next-step">Next step: {entry.copingStep}</p>}
        </div>
      )}
      <div className="meta">
        {entry.specificFeeling && isCheckIn(entry) && <span>{entry.specificFeeling}</span>}
        {isCheckIn(entry) && <span>{entry.intensity}/10</span>}
        {(entry.factors || []).map((factor) => <span key={factor}>{factor}</span>)}
        {(entry.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
      {(onEdit || onDelete) && <div className="actions entry-card-actions">
        <button aria-controls={pageId} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} type="button">
          {expanded ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
          {expanded ? 'Close page' : 'View page'}
        </button>
        {onEdit && <button onClick={onEdit} type="button">Edit</button>}
        {onDelete && <button onClick={onDelete} type="button">Delete</button>}
        {onPrimary && isCheckIn(entry) && !entry.primary && <button onClick={onPrimary} type="button">Set as main</button>}
      </div>}
    </article>
  );
}
