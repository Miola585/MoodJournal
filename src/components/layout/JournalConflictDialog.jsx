import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function JournalConflictDialog({ conflict, onReview, onCopy, onAccept, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog.showModal();
    dialog.querySelector('h2')?.focus();
    return () => { dialog.close(); trigger?.focus(); };
  }, []);
  const latest = conflict.latest?.entries.find((entry) => entry.id === conflict.entry?.id);
  return <dialog ref={ref} className="settings-privacy-dialog" aria-labelledby="journal-conflict-title" onCancel={(event) => { event.preventDefault(); if (!conflict.busy) onClose(); }}>
    <button type="button" aria-label="Keep editing" onClick={onClose} disabled={conflict.busy}><X aria-hidden="true" size={20} /></button>
    <h2 id="journal-conflict-title" tabIndex={-1}>Your journal changed elsewhere</h2>
    <p>The newer journal is safe. Your unsaved work has not been discarded.</p>
    {conflict.latest && (conflict.entry ? <section aria-label="Latest saved entry">
      <h3>{latest?.specificFeeling || latest?.title || 'Latest saved entry'}</h3>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '30vh', overflowY: 'auto' }}>{latest?.note || (latest ? 'This entry has no writing.' : 'This entry is not in the latest journal.')}</p>
    </section> : <p>{conflict.latest.entries.length} saved entries. Use the latest journal, then review your import or deletion again.</p>)}
    {conflict.error && <p role="alert" className="form-error">{conflict.error}</p>}
    <div className="button-row">
      <button type="button" disabled={conflict.busy} onClick={onReview}>Review latest</button>
      {conflict.entry ? <button type="button" className="primary" disabled={conflict.busy || !conflict.latest} onClick={onCopy}>Save as separate entry</button>
        : <button type="button" disabled={conflict.busy || !conflict.latest} onClick={onAccept}>Use latest journal</button>}
    </div>
  </dialog>;
}
