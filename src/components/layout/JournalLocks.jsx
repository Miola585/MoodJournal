import { useState } from 'react';

function LockRecovery({ label, onRecover }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!onRecover) return null;

  const submit = async () => {
    setBusy(true);
    setError('');
    const result = await onRecover(password);
    setBusy(false);
    if (!result?.ok) {
      setError(result?.error || `The ${label.toLowerCase()} could not be reset.`);
    }
  };

  if (!open) {
    return <button className="lock-recovery-toggle" onClick={() => setOpen(true)} type="button">Forgot {label}?</button>;
  }

  return (
    <div className="lock-recovery">
      <p>Confirm your Mood Journal account password to clear this device-only {label.toLowerCase()}.</p>
      <label>Account password
        <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </label>
      <div className="lock-recovery-actions">
        <button className="secondary-button" disabled={busy || !password} onClick={submit} type="button">{busy ? 'Checking...' : `Reset ${label}`}</button>
        <button className="ghost-button" onClick={() => { setOpen(false); setPassword(''); setError(''); }} type="button">Cancel</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

export function JournalPrivacyGate({ locked, code, onUnlock, onRecover, children }) {
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
          <LockRecovery label="journal lock" onRecover={onRecover} />
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
    </section>
  );
}

export function LockScreen({ pin, onUnlock, onRecover }) {
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
        <LockRecovery label="PIN" onRecover={onRecover} />
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>
  );
}
