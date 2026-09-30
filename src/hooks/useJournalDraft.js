import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const dirtyForms = new Set();
const DRAFT_VERSION = 1;

const snapshot = (value) => JSON.stringify(value);

export const hasDirtyJournalForms = () => dirtyForms.size > 0;

export const confirmJournalNavigation = () => !hasDirtyJournalForms()
  || window.confirm('You have unsaved journal changes. Leave this page and keep the encrypted device draft?');

export function useJournalDraft({ privateStorage, formId, draft, setDraft, debounceMs = 700 }) {
  const formToken = useRef(Symbol(formId));
  const baseline = useRef(snapshot(draft));
  const draftRef = useRef(draft);
  const [storedDraft, setStoredDraft] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState(privateStorage?.encrypted ? 'idle' : 'unavailable');
  const dirty = useMemo(() => snapshot(draft) !== baseline.current, [draft]);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  useEffect(() => {
    let active = true;
    setDraftReady(false);
    setStoredDraft(null);
    setDraftStatus(privateStorage?.encrypted ? 'idle' : 'unavailable');
    if (!privateStorage?.encrypted) {
      setDraftReady(true);
      return () => { active = false; };
    }
    privateStorage.read(`journalDraft:${formId}`, null)
      .then((record) => {
        if (!active) return;
        if (record?.version === DRAFT_VERSION && record.formId === formId && record.draft) {
          setStoredDraft(record);
        }
        setDraftReady(true);
      })
      .catch(() => {
        if (active) {
          setDraftStatus('error');
          setDraftReady(true);
        }
      });
    return () => { active = false; };
  }, [formId, privateStorage]);

  useEffect(() => {
    if (!dirty) dirtyForms.delete(formToken.current);
    else dirtyForms.add(formToken.current);
    return () => dirtyForms.delete(formToken.current);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!draftReady || storedDraft || !dirty || !privateStorage?.encrypted) return undefined;
    setDraftStatus('saving');
    const timeout = window.setTimeout(async () => {
      try {
        await privateStorage.write(`journalDraft:${formId}`, {
          version: DRAFT_VERSION,
          formId,
          savedAt: new Date().toISOString(),
          draft: draftRef.current
        });
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, dirty, draft, draftReady, formId, privateStorage, storedDraft]);

  const clearDraft = useCallback(async (savedValue = draftRef.current) => {
    baseline.current = snapshot(savedValue);
    dirtyForms.delete(formToken.current);
    setStoredDraft(null);
    if (privateStorage?.encrypted) await privateStorage.remove(`journalDraft:${formId}`);
    setDraftStatus(privateStorage?.encrypted ? 'idle' : 'unavailable');
  }, [formId, privateStorage]);

  const restoreDraft = useCallback(() => {
    if (!storedDraft) return;
    setDraft(storedDraft.draft);
    setStoredDraft(null);
    setDraftStatus('saved');
  }, [setDraft, storedDraft]);

  const discardDraft = useCallback(async () => {
    setStoredDraft(null);
    if (privateStorage?.encrypted) await privateStorage.remove(`journalDraft:${formId}`);
    setDraftStatus(privateStorage?.encrypted ? 'idle' : 'unavailable');
  }, [formId, privateStorage]);

  const confirmDiscard = useCallback(() => !dirty
    || window.confirm('Discard these unsaved journal changes?'), [dirty]);

  return {
    dirty,
    storedDraft,
    draftStatus,
    restoreDraft,
    discardDraft,
    clearDraft,
    confirmDiscard
  };
}
