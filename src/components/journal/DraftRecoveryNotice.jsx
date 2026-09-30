import { RotateCcw, Trash2 } from 'lucide-react';

export function DraftRecoveryNotice({ record, onRestore, onDiscard }) {
  if (!record) return null;
  const savedAt = new Date(record.savedAt);
  return (
    <aside className="draft-recovery-notice" role="status">
      <div>
        <strong>Unsaved writing found on this device</strong>
        <span>Saved {savedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>
      <div className="draft-recovery-actions">
        <button className="secondary-button" onClick={onRestore} type="button"><RotateCcw aria-hidden="true" size={16} />Restore</button>
        <button className="ghost-button" onClick={onDiscard} type="button"><Trash2 aria-hidden="true" size={16} />Discard</button>
      </div>
    </aside>
  );
}

export function SaveState({ state, onRetry, draftStatus }) {
  const label = state === 'saving' ? 'Saving...'
    : state === 'saved' ? 'Saved'
      : state === 'error' ? 'Could not save'
        : draftStatus === 'saved' ? 'Draft saved on this device'
          : draftStatus === 'saving' ? 'Saving device draft...'
            : draftStatus === 'error' ? 'Device draft could not be saved'
              : draftStatus === 'unavailable' ? 'Unsaved changes stay in this tab'
                : '';
  if (!label) return null;
  return (
    <span className={`journal-save-state ${state || draftStatus}`} role={state === 'error' ? 'alert' : 'status'}>
      {label}
      {state === 'error' && onRetry ? <button onClick={onRetry} type="button">Retry</button> : null}
    </span>
  );
}
