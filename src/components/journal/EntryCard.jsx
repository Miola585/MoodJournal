import { useId, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { moods } from '../../data/journalData';
import { isCheckIn } from '../../utils/journalUtils';
import { stripGameData } from '../games/gameUtils';

export function EntryCard({ entry, onEdit, onDelete, onPrimary, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const pageId = useId();
  const mood = moods.find((item) => item.key === entry.mood);
  const entryLabel = isCheckIn(entry) ? 'Check-In' : 'Free Write';
  const notePreview = stripGameData(entry.note || '').trim();
  const canToggle = compact || Boolean(onEdit || onDelete);
  const showFullEntry = expanded || !canToggle;
  const createdAt = new Date(entry.created);
  const showPrimaryAction = Boolean(onPrimary && isCheckIn(entry) && !entry.primary);
  return (
    <article className={`${isCheckIn(entry) ? 'entry-card entry-card-checkin' : 'entry-card entry-card-freewrite'}${compact ? ' entry-card-compact' : ''}${showFullEntry ? ' entry-card-open' : ''}`} style={mood ? { '--entry-accent': mood.color } : undefined}>
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
      {!showFullEntry && (
        <p className={compact ? 'entry-closed-note entry-compact-preview' : 'entry-closed-note'}>
          <BookOpen aria-hidden="true" size={16} />
          <span>{compact ? notePreview || 'No writing on this page.' : 'Page closed'}</span>
        </p>
      )}
      {showFullEntry && (
        <>
          <div className="entry-page" id={pageId}>
            <p className="entry-preview">{notePreview || 'No writing on this page.'}</p>
          </div>
          {entry.copingStep && (
            <aside className="entry-next-step">
              <span className="entry-next-step-icon" aria-hidden="true"><ArrowRight size={17} /></span>
              <div>
                <span>Next step</span>
                <p>{entry.copingStep}</p>
              </div>
            </aside>
          )}
        </>
      )}
      {(!compact || showFullEntry) && (
        <div className="meta">
          {entry.specificFeeling && isCheckIn(entry) && <span>{entry.specificFeeling}</span>}
          {isCheckIn(entry) && <span>{entry.intensity}/10</span>}
          {(entry.factors || []).map((factor) => <span key={factor}>{factor}</span>)}
          {(entry.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      )}
      {(canToggle || onEdit || onDelete || showPrimaryAction) && <div className="actions entry-card-actions">
        {canToggle && <button aria-controls={pageId} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} type="button">
          {expanded ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
          {expanded ? 'Close page' : 'View page'}
        </button>}
        {onEdit && <button onClick={onEdit} type="button">Edit</button>}
        {onDelete && <button onClick={onDelete} type="button">Delete</button>}
        {showPrimaryAction && <button onClick={onPrimary} type="button">Set as main</button>}
      </div>}
    </article>
  );
}
