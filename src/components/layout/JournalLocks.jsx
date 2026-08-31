import { useState } from 'react';

export function JournalPrivacyGate({ locked, code, onUnlock, children }) {
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (attempt === code) {
      setError('');
      onUnlock(true);
      return;
    }
    setError('That passphrase or PIN did not match.');
  };
  if (!locked) return children;
  return (
    <section className="screen app-screen">
      <div className="privacy-lock-panel">
        <div className="privacy-blur" aria-hidden="true">
          <article />
          <article />
          <article />
        </div>
        <form className="panel lock-form privacy-unlock" onSubmit={submit}>
          <h1>Journal Locked</h1>
          <p>Your journal entries are hidden on this device. Enter your journal passphrase or PIN to reveal them.</p>
          <label>Passphrase or PIN
            <input autoComplete="current-password" onChange={(event) => setAttempt(event.target.value)} type="password" value={attempt} />
          </label>
          <button className="primary" type="submit">Reveal journal</button>
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
    </section>
  );
}

export function LockScreen({ pin, onUnlock }) {
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (attempt === pin) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect PIN.');
    }
  };
  return (
    <section className="lock-screen">
      <h1>Journal Locked</h1>
      <form className="panel lock-form" onSubmit={submit}>
        <label>Enter PIN
          <input inputMode="numeric" onChange={(event) => setAttempt(event.target.value)} type="password" value={attempt} />
        </label>
        <button className="primary" type="submit">Unlock</button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>
  );
}
