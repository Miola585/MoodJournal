import { useState } from 'react';
import { supabase } from '../../supabaseClient';

export function ProfileMenu({ user, profile, openApp }) {
  const [open, setOpen] = useState(false);
  const displayName = profile?.username || user?.email?.split('@')[0] || 'Your profile';
  const initial = (displayName || user?.email || '?').trim().charAt(0).toUpperCase() || '?';
  const openView = (view) => {
    openApp(view);
    setOpen(false);
  };
  const signOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
  };
  return (
    <section className="profile-menu">
      <button
        className="profile-avatar"
        type="button"
        aria-label="Profile menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {initial}
      </button>
      {open && <div className="profile-dropdown">
        <div className="profile-dropdown-header">
          <strong>{displayName}</strong>
          {user?.email && <span>{user.email}</span>}
        </div>
        <button onClick={() => openView('settings')} type="button">Profile & Settings</button>
        <button onClick={signOut} type="button">Sign out</button>
      </div>}
    </section>
  );
}
