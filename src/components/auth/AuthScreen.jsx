import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../supabaseClient';
import { normalizeUsername } from '../../utils/journalUtils';

export function AuthScreen({ mode, setMode }) {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const email = form.email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Please enter an email address like email@example.com.');
      setSubmitting(false);
      return;
    }
    if (mode === 'reset') {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      setSubmitting(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage('Password reset email sent. Check your inbox and follow the link.');
      return;
    }
    const username = normalizeUsername(form.username);
    if (mode === 'signup' && username.length < 3) {
      setError('Username must be at least 3 characters and use letters, numbers, or underscores.');
      setSubmitting(false);
      return;
    }
    if (mode === 'signup') {
      const { data: existingProfile, error: usernameError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();
      if (usernameError) {
        setError(usernameError.message);
        setSubmitting(false);
        return;
      }
      if (existingProfile) {
        setError('That username is already taken.');
        setSubmitting(false);
        return;
      }
    }
    const credentials = { email, password: form.password };
    const { error: authError } = mode === 'signin'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({ ...credentials, options: { data: { username } } });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (mode === 'signup') setMessage('Account created. If email verification is enabled in Supabase, check your inbox before signing in.');
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="screen app-screen">
        <div className="panel auth-panel">
          <h1>Connect Supabase</h1>
          <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and your local `.env` file to turn on multi-user accounts.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="screen app-screen">
      <div className="panel auth-panel">
        <h1>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Password Recovery'}</h1>
        <p>{mode === 'reset' ? 'Enter your account email and Supabase will send a reset link.' : 'Use an account to keep your journal entries private and available across devices.'}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Email
            <input autoComplete="email" onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@example.com" required type="email" value={form.email} />
          </label>
          {mode === 'signup' && <label>Username
            <input autoComplete="username" onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="letters, numbers, underscores" required value={form.username} />
          </label>}
          {mode !== 'reset' && <label>Password
            <input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength="6" onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} />
          </label>}
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        {mode === 'signin' && <p className="auth-note">If your project has email verification on, confirm your email before signing in.</p>}
        <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} type="button">
          {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
        {mode === 'signin' && <button className="text-button" onClick={() => setMode('reset')} type="button">Forgot password?</button>}
      </div>
    </section>
  );
}
