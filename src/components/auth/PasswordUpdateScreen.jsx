import { useState } from 'react';

export function PasswordUpdateScreen({ requiresRecoveryKey, onUpdate, onDone }) {
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const result = await onUpdate(password, recoveryKey);
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || 'Your password could not be updated.');
      return;
    }
    setPassword('');
    setRecoveryKey('');
    setMessage('Password updated. You can continue to the app.');
  };
  return (
    <section className="screen app-screen">
      <div className="panel auth-panel">
        <h1>Reset Password</h1>
        <p>{requiresRecoveryKey ? 'Use your saved recovery key to keep your encrypted journal connected to the new account password.' : 'Enter a new password for your account.'}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>New password
            <input autoComplete="new-password" minLength="12" onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" required type="password" value={password} />
          </label>
          {requiresRecoveryKey && <label>Journal recovery key
            <input autoComplete="off" onChange={(event) => setRecoveryKey(event.target.value)} placeholder="MJ1..." required spellCheck="false" type="text" value={recoveryKey} />
          </label>}
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Updating...' : 'Update password'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        {message && <button onClick={onDone} type="button">Continue</button>}
        {requiresRecoveryKey && !message && <p className="encryption-fine-print">Mood Journal cannot recover this key. It is required here so the new password can unlock your existing encrypted entries on every device.</p>}
      </div>
    </section>
  );
}
