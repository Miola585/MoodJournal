import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LockKeyhole, Palette, UserRound } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { supabase } from '../supabaseClient';

export function Profile({ user, profile }) {
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

  return <section className="screen app-screen settings-screen profile-screen">
    <PageHeader eyebrow="Your space" title="Profile" subtitle="Your account and the choices that make this space yours." />
    <section className="settings-profile ui-card ui-card-secondary" aria-label="Account details">
      <span className="settings-section-icon"><UserRound aria-hidden="true" size={20} /></span>
      <div><strong>{profile?.username || 'Your profile'}</strong><span>{user?.email || 'Local browser profile'}</span></div>
      {profile?.role === 'admin' && <span className="admin-badge">Admin</span>}
    </section>
    <nav className="profile-destinations" aria-label="Profile settings">
      <Link className="profile-destination ui-card ui-card-interactive" to="/privacy"><LockKeyhole aria-hidden="true" size={22} /><span><strong>Privacy</strong><small>Journal locks, encryption, and your data</small></span><ChevronRight aria-hidden="true" size={20} /></Link>
      <Link className="profile-destination ui-card ui-card-interactive" to="/preferences"><Palette aria-hidden="true" size={22} /><span><strong>Preferences</strong><small>Appearance, reading, and reminders</small></span><ChevronRight aria-hidden="true" size={20} /></Link>
    </nav>
    {user && <button className="secondary-button profile-sign-out" onClick={signOut} type="button">Sign out</button>}
    {signOutError && <p className="form-error" role="alert">{signOutError}</p>}
  </section>;
}
