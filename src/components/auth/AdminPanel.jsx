import { useEffect, useMemo, useState } from 'react';
import { Inbox, RefreshCw, Search } from 'lucide-react';
import { SupportConversation } from '../support/SupportConversation';
import { listSupportAuthors, listSupportRequests, updateSupportRequest } from '../../utils/supportApi';
import { filterSupportRequests, supportCategories, supportErrorMessage, supportPriorities, supportStatuses } from '../../utils/support';

const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function AdminPanel({ user, onRequestChanged }) {
  const [requests, setRequests] = useState([]);
  const [authors, setAuthors] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [items, profiles] = await Promise.all([listSupportRequests(user.id, true), listSupportAuthors()]);
      setRequests(items);
      setAuthors(Object.fromEntries(profiles.map((profile) => [profile.user_id, profile.username])));
      setSelectedId((current) => items.some((item) => item.id === current) ? current : items[0]?.id || null);
    } catch (loadError) {
      setError(supportErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  const update = async (field, value) => {
    if (!selectedId || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateSupportRequest(selectedId, { [field]: value });
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      onRequestChanged?.();
    } catch (saveError) {
      setError(supportErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => filterSupportRequests(requests, { search, category, status }), [requests, search, category, status]);
  const selected = requests.find((request) => request.id === selectedId) || null;
  const newCount = requests.filter((request) => request.status === 'new').length;
  const bugCount = requests.filter((request) => request.category === 'bug' && request.status !== 'resolved').length;
  const ideaCount = requests.filter((request) => request.category === 'feature' && request.status !== 'resolved').length;
  const resolvedCount = requests.filter((request) => request.status === 'resolved').length;

  return <section className="screen app-screen support-page support-admin">
    <div className="support-page-heading"><div><span className="support-eyebrow"><Inbox aria-hidden="true" size={17} /> Admin inbox</span><h1>Feedback requests</h1></div><button className="support-refresh" disabled={loading} onClick={load} type="button"><RefreshCw aria-hidden="true" size={16} />Refresh</button></div>
    <div className="support-admin-stats" aria-label="Request overview">
      <div><span>New requests</span><strong>{newCount}</strong></div>
      <div><span>Open bugs</span><strong>{bugCount}</strong></div>
      <div><span>Feature ideas</span><strong>{ideaCount}</strong></div>
      <div><span>Resolved</span><strong>{resolvedCount}</strong></div>
    </div>
    {error && <p className="support-error" role="alert">{error}</p>}
    <div className="support-admin-layout">
      <div className="support-admin-inbox">
        <div className="support-admin-inbox-heading"><h2>Inbox</h2><span>{filtered.length} of {requests.length}</span></div>
        <div className="support-filters"><label className="support-search"><span className="visually-hidden">Search requests</span><Search aria-hidden="true" size={18} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search requests" type="search" value={search} /></label><label><span className="visually-hidden">Filter by type</span><select onChange={(event) => setCategory(event.target.value)} value={category}><option value="all">All types</option>{supportCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span className="visually-hidden">Filter by status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option>{supportStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        {loading && <p className="support-muted">Loading requests...</p>}
        {!loading && !filtered.length && <p className="support-muted">No requests match these filters.</p>}
        <div className="support-admin-list">{filtered.map((request) => <button aria-current={selectedId === request.id ? 'true' : undefined} className={selectedId === request.id ? 'support-admin-row active' : 'support-admin-row'} key={request.id} onClick={() => setSelectedId(request.id)} type="button"><span><strong>{request.title}</strong><small>{authors[request.user_id] || 'Account'} · {supportCategories.find((item) => item.value === request.category)?.label} · {formatDate(request.created_at)}</small></span><span className={`support-status status-${request.status}`}>{supportStatuses.find((item) => item.value === request.status)?.label}</span><small>{request.priority}</small></button>)}</div>
      </div>
      <div className="support-detail support-admin-detail">{selected ? <><div className="support-detail-heading"><div><span className="support-eyebrow">{authors[selected.user_id] || 'Account'} · {supportCategories.find((item) => item.value === selected.category)?.label} · {formatDate(selected.created_at)}</span><h2>{selected.title}</h2></div><span className={`support-status status-${selected.status}`}>{supportStatuses.find((item) => item.value === selected.status)?.label}</span></div><div className="support-triage"><label htmlFor="support-admin-status">Status<select disabled={saving} id="support-admin-status" onChange={(event) => update('status', event.target.value)} value={selected.status}>{supportStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label htmlFor="support-admin-priority">Priority<select disabled={saving} id="support-admin-priority" onChange={(event) => update('priority', event.target.value)} value={selected.priority}>{supportPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div><SupportConversation key={selected.id} admin request={selected} userId={user.id} /></> : !loading && <p className="support-muted">Choose a request to review.</p>}</div>
    </div>
  </section>;
}
