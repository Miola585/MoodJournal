import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LockKeyhole, LogOut, Palette, UserRound } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { supabase } from '../supabaseClient';
import { themeChoices } from '../data/themeChoices';

export function Profile({ user, profile, entryCount, siteTheme }) {
  const [signOutError, setSignOutError] = useState('');
  const signOut = async () => {
    setSignOutError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error) {
      setSignOutError(error.message || 'Could not sign out. Please try again.');
    }
  };
  const themeName = themeChoices.find((choice) => choice.key === siteTheme)?.label || 'Cozy Cafe';

  return <section className="screen app-screen settings-screen profile-screen">
    <PageHeader title="Your space" />
    <section className="settings-profile" aria-label="Account details">
      <span className="settings-section-icon"><UserRound aria-hidden="true" size={26} /></span>
      <div><strong>{profile?.username || 'Your journal'}</strong><span>{user ? 'Synced with your account' : 'Saved in this browser'}</span></div>
      {profile?.role === 'admin' && <span className="admin-badge">Admin</span>}
      <dl className="profile-details">
        <div><dt>Journal theme</dt><dd>{themeName}</dd></div>
        {entryCount !== null && <div><dt>Journal entries</dt><dd>{entryCount} {entryCount === 1 ? 'entry' : 'entries'}</dd></div>}
      </dl>
    </section>
    <nav className="profile-destinations" aria-label="Profile settings">
      <Link className="profile-destination" to="/privacy"><LockKeyhole aria-hidden="true" size={25} /><span><strong>Privacy</strong><small>Locks, encryption, and backups</small></span><ChevronRight aria-hidden="true" size={20} /></Link>
      <Link className="profile-destination" to="/preferences"><Palette aria-hidden="true" size={25} /><span><strong>Preferences</strong><small>Theme, reading, and reminders</small></span><ChevronRight aria-hidden="true" size={20} /></Link>
    </nav>
    {user && <button className="secondary-button profile-sign-out" onClick={signOut} type="button"><LogOut aria-hidden="true" size={18} />Sign out</button>}
    {signOutError && <p className="form-error" role="alert">{signOutError}</p>}
  </section>;
}
