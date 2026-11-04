import { useId, useState } from 'react';
import { Save } from 'lucide-react';
import { useGameStorageState } from '../../hooks/useGameStorageState';
import { useJournalDraft } from '../../hooks/useJournalDraft';
import { DraftRecoveryNotice } from '../journal/DraftRecoveryNotice';

const normalizeNote = (value) => typeof value === 'string' ? value : '';

export function PauseNote({ privateStorage, storageKey }) {
  const id = useId();
  const [saved, save, error, ready] = useGameStorageState(privateStorage, storageKey, normalizeNote);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState('');
  const recovery = useJournalDraft({ privateStorage, formId: storageKey, draft, setDraft });
  const keepNote = async () => {
    if (await save(() => draft ?? saved)) {
      setDraft(null);
      try {
        await recovery.clearDraft(null);
        setMessage('Note saved on this device.');
      } catch {
        setMessage('Note saved. Its recovery copy could not be cleared.');
      }
    }
  };
  return <div className="pause-note">
    <DraftRecoveryNotice record={recovery.storedDraft} onRestore={recovery.restoreDraft} onDiscard={() => recovery.discardDraft().catch(() => setMessage('The recovery copy could not be cleared.'))} />
    <details>
      <summary>Anything you'd like to note? <small>Optional</small></summary>
      <label className="visually-hidden" htmlFor={id}>Your grounding note</label>
      <textarea id={id} rows={3} maxLength={2000} disabled={!ready} value={draft ?? saved} onChange={(event) => { setDraft(event.target.value); setMessage(''); }} />
      <div className="pause-note-actions">
        <small role="status">{message || (draft !== null ? 'Not saved yet' : '')}</small>
        <button type="button" disabled={!ready || draft === null} onClick={keepNote}><Save size={16} aria-hidden="true" />{error ? 'Retry save' : 'Save note'}</button>
      </div>
    </details>
    {error && <p role="alert" className="form-error">{error} Your note has not been cleared.</p>}
    {recovery.draftStatus === 'error' && <p role="alert">The recovery draft could not be saved. Keep this page open and try Save note.</p>}
  </div>;
}
