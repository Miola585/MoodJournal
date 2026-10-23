import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const dirtyForms = new Set();
const DRAFT_VERSION = 1;
const draftFlushers = new Map();
const memoryDrafts = new Map();
const dismissedPredecessors = new Set();
let previousTabId = '';
const tabId = globalThis.crypto.randomUUID();
try {
  previousTabId = globalThis.sessionStorage?.getItem('journalDraftTab') || '';
  globalThis.sessionStorage?.setItem('journalDraftTab', tabId);
} catch { /* In-memory drafts still work when session storage is unavailable. */ }
export const flushJournalDrafts = async () => { await Promise.all([...draftFlushers.values()].map((flush) => flush())); };

const snapshot = (value) => JSON.stringify(value);

export const hasDirtyJournalForms = () => dirtyForms.size > 0;

export const confirmJournalNavigation = () => !hasDirtyJournalForms()
  || window.confirm('You have unsaved journal changes. Leave this page? A device draft is available only when encryption is enabled and saving succeeded.');

export function useJournalDraft({ privateStorage, formId, draft, setDraft, debounceMs = 700 }) {
  const draftKey = `journalDraft:${formId}:${tabId}`;
  const memoryKey = `${privateStorage?.ownerId || 'local-browser'}:${formId}`;
  const writes = useRef(Promise.resolve());
  const generation = useRef(0);
  const formToken = useRef(Symbol(formId));
  const baseline = useRef(snapshot(draft));
  const draftRef = useRef(draft);
  const [storedDraft, setStoredDraft] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState(privateStorage?.encrypted ? 'idle' : 'unavailable');
  const dirty = useMemo(() => snapshot(draft) !== baseline.current, [draft]);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  useEffect(() => {
    const flush = async () => {
      if (!dirty) return;
      const record = { version: DRAFT_VERSION, formId, savedAt: new Date().toISOString(), draft: draftRef.current };
      memoryDrafts.set(memoryKey, record);
      if (privateStorage?.encrypted) {
        writes.current = writes.current.catch(() => {}).then(() => privateStorage.write(draftKey, record));
        await writes.current;
      }
    };
    draftFlushers.set(formToken.current, flush);
    return () => { draftFlushers.delete(formToken.current); };
  }, [dirty, draftKey, formId, memoryKey, privateStorage]);

  useEffect(() => {
    let active = true;
    setDraftReady(false);
    setStoredDraft(memoryDrafts.get(memoryKey) || null);
    setDraftStatus(privateStorage?.encrypted ? 'idle' : 'unavailable');
    if (!privateStorage?.encrypted) {
      setDraftReady(true);
      return () => { active = false; };
    }
    privateStorage.read(draftKey, null)
      .then(async (record) => record || (dismissedPredecessors.has(memoryKey) ? null
        : (previousTabId ? await privateStorage.read(`journalDraft:${formId}:${previousTabId}`, null) : null)
          || await privateStorage.read(`journalDraft:${formId}`, null)))
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
  }, [formId, privateStorage, draftKey, memoryKey]);

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
      const expectedGeneration = generation.current;
      try {
        const record = {
          version: DRAFT_VERSION,
          formId,
          savedAt: new Date().toISOString(),
          draft: draftRef.current
        };
        writes.current = writes.current.catch(() => {}).then(() => {
          if (generation.current === expectedGeneration) return privateStorage.write(draftKey, record);
        });
        await writes.current;
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, dirty, draft, draftReady, formId, privateStorage, storedDraft, draftKey]);

  const clearDraft = useCallback(async (savedValue = draftRef.current) => {
    generation.current += 1;
    await writes.current.catch(() => {});
    memoryDrafts.delete(memoryKey);
    dismissedPredecessors.add(memoryKey);
    baseline.current = snapshot(savedValue);
    dirtyForms.delete(formToken.current);
    setStoredDraft(null);
    if (privateStorage?.encrypted) await privateStorage.remove(draftKey);
    setDraftStatus(privateStorage?.encrypted ? 'idle' : 'unavailable');
  }, [draftKey, memoryKey, privateStorage]);

  const restoreDraft = useCallback(() => {
    if (!storedDraft) return;
    dismissedPredecessors.add(memoryKey);
    setDraft(storedDraft.draft);
    setStoredDraft(null);
    setDraftStatus('saved');
  }, [setDraft, storedDraft, memoryKey]);

  const discardDraft = useCallback(async () => {
    generation.current += 1;
    await writes.current.catch(() => {});
    memoryDrafts.delete(memoryKey);
    dismissedPredecessors.add(memoryKey);
    setStoredDraft(null);
    if (privateStorage?.encrypted) await privateStorage.remove(draftKey);
    setDraftStatus(privateStorage?.encrypted ? 'idle' : 'unavailable');
  }, [draftKey, memoryKey, privateStorage]);

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
