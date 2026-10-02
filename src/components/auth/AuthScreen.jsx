import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Eye,
  EyeOff,
  Flower2,
  Gamepad2,
  HeartPulse,
  LockKeyhole,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound
} from 'lucide-react';
import { logoUrl } from '../../data/journalData';
import { themeChoices } from '../../data/themeChoices';
import { isSupabaseConfigured, supabase } from '../../supabaseClient';
import { normalizeUsername } from '../../utils/journalUtils';

export const authFeatureGuide = [
  {
    Icon: HeartPulse,
    eyebrow: 'Notice the moment',
    title: 'Daily Check-In',
    description: 'Name your mood, what shaped it, and one gentle next step without turning the day into a score.'
  },
  {
    Icon: BookOpen,
    eyebrow: 'Write freely',
    title: 'Journal Pages',
    description: 'Keep guided check-ins and open-ended writing together in a notebook-like space.'
  },
  {
    Icon: CalendarDays,
    eyebrow: 'Look back softly',
    title: 'Calendar & Patterns',
    description: 'Return to past pages and notice recurring feelings at your own pace.'
  },
  {
    Icon: Sparkles,
    eyebrow: 'Take a small pause',
    title: 'Quick Activities',
    description: 'Use short grounding exercises when writing feels like too much for the moment.'
  },
  {
    Icon: Gamepad2,
    eyebrow: 'Reflect through play',
    title: 'Gentle Games',
    description: 'Explore feelings through constellations, matching, orbit mapping, and other visual tools.'
  },
  {
    Icon: Flower2,
    eyebrow: 'Keep what grows',
    title: 'Mood Garden & Memory Jar',
    description: 'Watch check-ins shape a personal garden and save good moments as individual marbles.'
  }
];

export function AuthScreen({ mode, setMode, siteTheme, setSiteTheme, theme, setTheme, onAuthenticated }) {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const guide = authFeatureGuide[guideIndex];
  const GuideIcon = guide.Icon;
  const selectedTheme = themeChoices.find((choice) => choice.key === siteTheme) || themeChoices[0];

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

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
    const credentials = { email, password: form.password };
    const { data: authData, error: authError } = mode === 'signin'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({ ...credentials, options: { data: { username } } });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (authData?.session) onAuthenticated?.(form.password);
    setForm((current) => ({ ...current, password: '' }));
    if (mode === 'signup') setMessage('Account created. Check your inbox if email confirmation is enabled.');
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
    <section className="auth-experience">
      <aside className="auth-welcome" aria-label="About Mood Journal">
        <div className="auth-brand-lockup">
          <img src={logoUrl} alt="" />
          <span>Mood Journal</span>
        </div>

        <div className="auth-welcome-copy">
          <span className="auth-eyebrow">A quieter place online</span>
          <h1>Keep the days you want to remember.</h1>
          <p>A gentle journal for naming what you feel, gathering your thoughts, and making a little room for yourself.</p>
        </div>

        <div className="auth-guide" aria-live="polite">
          <div className="auth-guide-heading">
            <span className="auth-guide-icon"><GuideIcon aria-hidden="true" size={22} /></span>
            <div><small>{guide.eyebrow}</small><h2>{guide.title}</h2></div>
          </div>
          <p>{guide.description}</p>
          <div className="auth-guide-controls">
            <div className="auth-guide-dots" aria-label="Feature guide">
              {authFeatureGuide.map((item, index) => (
                <button aria-label={`Show ${item.title}`} aria-pressed={guideIndex === index} className={guideIndex === index ? 'active' : ''} key={item.title} onClick={() => setGuideIndex(index)} type="button" />
              ))}
            </div>
            <div>
              <button aria-label="Previous feature" className="auth-guide-arrow" onClick={() => setGuideIndex((guideIndex - 1 + authFeatureGuide.length) % authFeatureGuide.length)} type="button"><ArrowLeft aria-hidden="true" size={17} /></button>
              <button aria-label="Next feature" className="auth-guide-arrow" onClick={() => setGuideIndex((guideIndex + 1) % authFeatureGuide.length)} type="button"><ArrowRight aria-hidden="true" size={17} /></button>
            </div>
          </div>
        </div>

        <div className="auth-paper-preview" aria-hidden="true">
          <span>Today&apos;s page &middot; {selectedTheme.label}</span>
          <strong>A small moment belongs here.</strong>
          <i /><i /><i />
        </div>
      </aside>

      <div className="auth-form-side">
        <div className="auth-card">
          <header className="auth-card-topline">
            <span><ShieldCheck aria-hidden="true" size={17} />A private space for your thoughts</span>
            <button className="auth-mode-button" onClick={setTheme} title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} type="button">
              {theme === 'dark' ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </header>

          {mode === 'reset' ? (
            <div className="auth-heading">
              <button className="auth-back-button" onClick={() => switchMode('signin')} type="button"><ArrowLeft aria-hidden="true" size={16} />Back to log in</button>
              <h2>Reset your password</h2>
              <p>We&apos;ll send a secure reset link to your account email.</p>
            </div>
          ) : (
            <>
              <div className="auth-heading">
                <h2>{mode === 'signin' ? 'Welcome back' : 'Begin your journal'}</h2>
                <p>{mode === 'signin' ? 'Settle in. Your journal is right where you left it.' : 'Create a private space that can grow with you.'}</p>
              </div>
              <div className="auth-mode-tabs" role="tablist" aria-label="Account action">
                <button aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')} role="tab" type="button">Log in</button>
                <button aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} role="tab" type="button">Sign up</button>
              </div>
            </>
          )}

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <label>Username
                <span className="auth-input-wrap"><UserRound aria-hidden="true" size={19} /><input autoComplete="username" maxLength="30" onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Choose a journal name" required value={form.username} /></span>
              </label>
            )}
            <label>Email address
              <span className="auth-input-wrap"><Mail aria-hidden="true" size={19} /><input autoComplete="email" maxLength="254" onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required type="email" value={form.email} /></span>
            </label>
            {mode !== 'reset' && (
              <label>Password
                <span className="auth-input-wrap"><LockKeyhole aria-hidden="true" size={19} /><input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 12 : 6} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === 'signin' ? 'Enter your password' : 'At least 12 characters'} required type={showPassword ? 'text' : 'password'} value={form.password} /><button aria-label={showPassword ? 'Hide password' : 'Show password'} className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}</button></span>
              </label>
            )}
            {mode === 'signin' && <button className="auth-forgot-button" onClick={() => switchMode('reset')} type="button">Forgot password?</button>}
            <button className="primary auth-submit" disabled={submitting} type="submit">
              {submitting ? 'Please wait...' : mode === 'signin' ? 'Open my journal' : mode === 'signup' ? 'Create my journal' : 'Send reset link'}
              {!submitting && <ArrowRight aria-hidden="true" size={18} />}
            </button>
          </form>

          <div className="auth-feedback" aria-live="polite">
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="success-message">{message}</p>}
          </div>

          <section className="auth-theme-picker" aria-labelledby="auth-theme-heading">
            <div className="auth-theme-heading">
              <div><span><Palette aria-hidden="true" size={17} />Make it feel like yours</span><small id="auth-theme-heading">Choose a starting world. Change it anytime.</small></div>
              <strong>{selectedTheme.label}</strong>
            </div>
            <div className="auth-theme-grid" role="radiogroup" aria-label="Starting theme">
              {themeChoices.map((choice) => (
                <button aria-checked={siteTheme === choice.key} aria-label={`${choice.label}. ${choice.description}`} className={siteTheme === choice.key ? 'auth-theme-option selected' : 'auth-theme-option'} key={choice.key} onClick={() => setSiteTheme(choice.key)} role="radio" type="button">
                  <span className="auth-theme-swatch" aria-hidden="true">{choice.colors.map((color) => <i key={color} style={{ background: color }} />)}<b /></span>
                  <span>{choice.shortLabel}</span>
                </button>
              ))}
            </div>
          </section>

          <p className="auth-privacy-note"><LockKeyhole aria-hidden="true" size={15} />Journal entries are encrypted before syncing. Store your recovery key somewhere private and safe.</p>
        </div>
      </div>
    </section>
  );
}
