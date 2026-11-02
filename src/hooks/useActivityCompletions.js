import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { todayKey } from '../utils/journalUtils';

export function useLocalActivityDay() {
  const [day, setDay] = useState(todayKey);
  const refresh = useCallback(() => setDay(todayKey()), []);
  useEffect(() => {
    let timer;
    const check = () => {
      refresh();
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(check, Math.min(60_000, midnight - now));
    };
    check();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refresh]);
  return [day, refresh];
}

const normalize = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.values(value).some((done) => typeof done !== 'boolean')) {
    throw new Error('Saved activity progress could not be read. It has not been replaced.');
  }
  return value;
};

export function useActivityCompletions(privateStorage, day, refreshDay) {
  const session = useMemo(() => ({ active: false, ready: false, busy: false, pending: null, loadVersion: 0 }), [privateStorage, day]);
  const current = useRef(session);
  current.current = session;
  const [state, setState] = useState({ session, completed: {}, ready: false, busy: false, error: '' });
  const key = `activityCompletions:${day}`;
  const isCurrent = () => session.active && current.current === session && day === todayKey();

  const load = async () => {
    const version = ++session.loadVersion;
    session.ready = false;
    setState({ session, completed: {}, ready: false, busy: false, error: '' });
    try {
      const completed = normalize(await privateStorage.read(key, {}));
      if (!isCurrent() || version !== session.loadVersion) return;
      session.ready = true;
      setState({ session, completed, ready: true, busy: false, error: '' });
    } catch (error) {
      if (isCurrent() && version === session.loadVersion) setState({ session, completed: {}, ready: false, busy: false, error: error.message || 'Could not load activity progress.' });
    }
  };

  useEffect(() => {
    session.active = true;
    load();
    return () => { session.active = false; };
  }, [session]);

  const setDone = async (title, done) => {
    if (!isCurrent()) { refreshDay(); return; }
    if (!session.ready || session.busy) return;
    session.busy = true;
    session.pending = { title, done };
    setState((previous) => ({ ...previous, busy: true, error: '' }));
    try {
      // Capture this owner/day; never persist a rendered snapshot on a key change.
      const completed = await privateStorage.update(key, {}, (stored) => {
        if (!isCurrent()) throw new Error('The activity day or account changed.');
        return { ...normalize(stored), [title]: done };
      });
      if (!isCurrent()) return;
      session.pending = null;
      setState({ session, completed, ready: true, busy: false, error: '' });
    } catch (error) {
      if (isCurrent()) setState((previous) => ({ ...previous, busy: false, error: error.message || 'Could not save activity progress. Please retry.' }));
    } finally {
      session.busy = false;
    }
  };

  const retry = () => session.pending ? setDone(session.pending.title, session.pending.done) : load();
  const visible = state.session === session && day === todayKey()
    ? state : { completed: {}, ready: false, busy: false, error: '' };
  return { ...visible, setDone, retry };
}
