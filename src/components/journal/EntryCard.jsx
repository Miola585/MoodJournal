import { useState } from 'react';
import { moods } from '../../data/journalData';
import { isCheckIn } from '../../utils/journalUtils';
import { stripGameData } from '../games/gameUtils';

export function EntryCard({ entry, onEdit, onDelete, onPrimary }) {
  const [expanded, setExpanded] = useState(false);
  const mood = moods.find((item) => item.key === entry.mood);
  const entryLabel = isCheckIn(entry) ? 'Check-In' : 'Free Write';
  const notePreview = stripGameData(entry.note || '').trim();
  return (
    <article className={isCheckIn(entry) ? 'entry-card entry-card-checkin' : 'entry-card entry-card-freewrite'}>
      <div className="entry-card-topline">
        <div>
          <span className="entry-type-badge">{entryLabel}</span>
          {entry.primary ? <span className="primary-marker">Main</span> : null}
        </div>
        <time dateTime={entry.created}>{new Date(entry.created).toLocaleString()}</time>
      </div>
      <h2>{isCheckIn(entry) ? `${mood?.emoji || ''} ${entry.mood || 'Check-In'}` : entry.specificFeeling || 'Free Write'}</h2>
      <p className={expanded ? 'entry-preview expanded' : 'entry-preview'}>{notePreview || 'No note preview.'}</p>
      <div className="meta">
        {entry.specificFeeling && isCheckIn(entry) && <span>{entry.specificFeeling}</span>}
        {isCheckIn(entry) && <span>{entry.intensity}/10</span>}
        {(entry.factors || []).map((factor) => <span key={factor}>{factor}</span>)}
        {(entry.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
      {entry.copingStep && <p className="next-step">Next step: {entry.copingStep}</p>}
      {(onEdit || onDelete) && <div className="actions entry-card-actions">
        <button onClick={() => setExpanded((current) => !current)} type="button">{expanded ? 'Hide' : 'View'}</button>
        {onEdit && <button onClick={onEdit} type="button">Edit</button>}
        {onDelete && <button onClick={onDelete} type="button">Delete</button>}
        {onPrimary && isCheckIn(entry) && !entry.primary && <button onClick={onPrimary} type="button">Set as main</button>}
      </div>}
    </article>
  );
}
