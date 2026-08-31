import { moods } from '../../data/journalData';
import { isCheckIn } from '../../utils/journalUtils';
import { stripGameData } from '../games/gameUtils';

export function EntryCard({ entry, onEdit, onDelete, onPrimary }) {
  const mood = moods.find((item) => item.key === entry.mood);
  const entryLabel = isCheckIn(entry) ? 'Check-In' : 'Free Write';
  return (
    <article className="entry-card">
      <div>
        <strong>{mood?.emoji} {entry.mood} <span className="primary-marker">{entryLabel}</span>{entry.primary ? <span className="primary-marker">Main</span> : null}</strong>
        <span>{new Date(entry.created).toLocaleString()}</span>
      </div>
      <p>{stripGameData(entry.note)}</p>
      <div className="meta">
        {entry.specificFeeling && <span>{entry.specificFeeling}</span>}
        <span>{entry.intensity}/10</span>
        {(entry.factors || []).map((factor) => <span key={factor}>{factor}</span>)}
        {(entry.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
      {entry.copingStep && <p className="next-step">Next step: {entry.copingStep}</p>}
      {(onEdit || onDelete) && <div className="actions">
        {onEdit && <button onClick={onEdit} type="button">Edit</button>}
        {onDelete && <button onClick={onDelete} type="button">Delete</button>}
        {onPrimary && isCheckIn(entry) && !entry.primary && <button onClick={onPrimary} type="button">Set as main</button>}
      </div>}
    </article>
  );
}
