import { useCallback, useEffect, useRef, useState } from 'react';

export function usePrivateStorageState(privateStorage, storageKey, initialValue, normalize = (value) => value) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const valueRef = useRef(value);

  useEffect(() => {
    let active = true;
    setError('');
    privateStorage.read(storageKey, initialValue)
      .then((stored) => {
        if (!active) return;
        const normalized = normalize(stored);
        valueRef.current = normalized;
        setValue(normalized);
      })
      .catch((readError) => {
        if (active) setError(readError.message);
      });
    return () => {
      active = false;
    };
  }, [privateStorage, storageKey]);

  const setStoredValue = useCallback((nextValue) => {
    const next = typeof nextValue === 'function' ? nextValue(valueRef.current) : nextValue;
    valueRef.current = next;
    setValue(next);
    setError('');
    privateStorage.write(storageKey, next).catch((writeError) => setError(writeError.message));
  }, [privateStorage, storageKey]);

  return [value, setStoredValue, error];
}
