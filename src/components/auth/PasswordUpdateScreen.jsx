import { useState } from 'react';
import { supabase } from '../../supabaseClient';

export function PasswordUpdateScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('Password updated. You can continue to the app.');
  };
  return (
    <section className="screen app-screen">
      <div className="panel auth-panel">
        <h1>Reset Password</h1>
        <p>Enter a new password for your account.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>New password
            <input autoComplete="new-password" minLength="6" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Updating...' : 'Update password'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        {message && <button onClick={onDone} type="button">Continue</button>}
      </div>
    </section>
  );
}
