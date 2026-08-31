import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export function AdminPanel({ nav }) {
  const [stats, setStats] = useState({ users: null, entries: null });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      const { count: userCount, error: userError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (!active) return;
      if (userError) {
        setError(userError.message);
        return;
      }
      setStats({ users: userCount, entries: 'Private by RLS' });
    };
    loadStats();
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="screen app-screen">
      <h1>Admin</h1>
      {nav}
      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span>Total profiles</span>
          <strong>{stats.users ?? '--'}</strong>
        </article>
        <article className="dashboard-card">
          <span>Journal entries</span>
          <strong>{stats.entries ?? '--'}</strong>
          <p>Admins do not get a normal UI to browse private entries.</p>
        </article>
        <article className="dashboard-card">
          <span>Status</span>
          <p>{error || 'Admin read checks are working.'}</p>
        </article>
      </div>
    </section>
  );
}
