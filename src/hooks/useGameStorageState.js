import { useEffect, useRef, useState } from 'react';

// Confirm durable writes before clearing a game draft or showing success.
export function useGameStorageState(privateStorage, key, normalize) {
  const [state, setState] = useState({ value: [], error: '', ready: false, busy: false });
  const session = useRef(null);
  useEffect(() => {
    const current = { storage: privateStorage, busy: false, ready: false };
    session.current = current;
    setState({ value: [], error: '', ready: false, busy: false });
    privateStorage.read(key, []).then((value) => {
      if (session.current !== current) return;
      const normalized = normalize(value);
      current.ready = true;
      setState({ value: normalized, error: '', ready: true, busy: false });
    }).catch((error) => {
      if (session.current === current) setState((state) => ({ ...state, error: error.message }));
    });
    return () => { if (session.current === current) session.current = null; };
  }, [privateStorage, key, normalize]);

  const save = async (change) => {
    const current = session.current;
    if (!current?.ready || current.busy || current.storage !== privateStorage) return false;
    current.busy = true;
    setState((state) => ({ ...state, busy: true, error: '' }));
    try {
      const next = await privateStorage.update(key, [], (stored) => change(normalize(stored)));
      if (session.current !== current) return false;
      setState({ value: next, error: '', ready: true, busy: false });
      return true;
    } catch (error) {
      if (session.current === current) setState((state) => ({ ...state, error: error.message, busy: false }));
      return false;
    } finally {
      current.busy = false;
    }
  };
  return [state.value, save, state.error, state.ready && !state.busy];
}
