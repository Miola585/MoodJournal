import { useEffect, useRef, useState } from 'react';
import { MEMORY_KEY, readMemoryRecords } from '../components/games/memoryJarData';

export function useMemoryJar(storage) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ records: [], ready: false, busy: false, error: '' });
  const session = useRef(null);
  useEffect(() => {
    const current = { busy: false, ready: false };
    session.current = current;
    setState({ records: [], ready: false, busy: false, error: '' });
    storage.read(MEMORY_KEY, []).then(readMemoryRecords).then((records) => {
      if (session.current !== current) return;
      current.ready = true;
      setState({ records, ready: true, busy: false, error: '' });
    }).catch((error) => {
      if (session.current === current) setState((value) => ({ ...value, error: error.message }));
    });
    return () => { session.current = null; };
  }, [storage, revision]);
  const update = async (change) => {
    const current = session.current;
    if (!current?.ready || current.busy) return null;
    current.busy = true;
    setState((value) => ({ ...value, busy: true, error: '' }));
    try {
      const records = await storage.update(MEMORY_KEY, [], (stored) => {
        if (session.current !== current) throw new Error('The jar was closed before saving.');
        return change(readMemoryRecords(stored));
      });
      if (session.current !== current) return null;
      setState({ records, ready: true, busy: false, error: '' });
      return records;
    } catch (error) {
      if (session.current === current) setState((value) => ({ ...value, busy: false, error: error.message }));
      return null;
    } finally { current.busy = false; }
  };
  return { ...state, update, retry: () => setRevision((value) => value + 1) };
}
