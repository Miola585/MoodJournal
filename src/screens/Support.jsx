import { useEffect, useState } from 'react';
import { Bug, Heart, Lightbulb, MessageCircleQuestionMark, RefreshCw, Send } from 'lucide-react';
import { isSupabaseConfigured } from '../supabaseClient';
import { createSupportRequest, listSupportRequests } from '../utils/supportApi';
import { collectSupportDiagnostics, supportCategories, supportErrorMessage, supportStatuses, validateSupportRequest } from '../utils/support';
import { SupportConversation } from '../components/support/SupportConversation';

const categoryIcons = { bug: Bug, feature: Lightbulb, feedback: Heart };
const initialForm = { category: 'bug', title: '', body: '', steps: '', includeDeviceDetails: false };
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export function Support({ user, siteTheme, theme, originPage = '/support', onRequestChanged }) {
  const [tab, setTab] = useState('send');
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setRequests([]);
    setSelectedId(null);
    setLoading(true);
    setLoadError('');
    listSupportRequests(user.id).then((items) => {
      if (!active) return;
      setRequests(items);
      setSelectedId(items[0]?.id || null);
    }).catch((loadError) => {
      if (active) setLoadError(supportErrorMessage(loadError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  const refreshRequests = async () => {
    if (!user || loading) return;
    setLoading(true);
    setLoadError('');
    try {
      const items = await listSupportRequests(user.id);
      setRequests(items);
      setSelectedId((current) => items.some((item) => item.id === current) ? current : items[0]?.id || null);
    } catch (refreshError) {
      setLoadError(supportErrorMessage(refreshError));
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!user || submitting) return;
    const validationError = validateSupportRequest(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const diagnostics = form.includeDeviceDetails ? collectSupportDiagnostics({
        pathname: originPage,
        theme: siteTheme,
        mode: theme,
        width: window.innerWidth,
        height: window.innerHeight,
        userAgent: navigator.userAgent
      }) : null;
      const created = await createSupportRequest(user.id, {
        category: form.category,
        title: form.title.trim(),
        body: form.body.trim(),
        steps: form.category === 'bug' ? form.steps.trim() : '',
        diagnostics
      });
      setRequests((current) => [created, ...current]);
      setSelectedId(created.id);
      setForm(initialForm);
      setSuccess('Your request was sent. You can follow it here.');
      setTab('requests');
      onRequestChanged?.();
    } catch (submitError) {
      setError(supportErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };
  const selected = requests.find((request) => request.id === selectedId) || null;

  return <section className="screen app-screen support-page">
    <div className="support-page-heading">
      <div><span className="support-eyebrow"><MessageCircleQuestionMark aria-hidden="true" size={17} /> Help & feedback</span><h1>We're listening</h1><p>Something not quite right? An idea you'd love to see? Tell us.</p></div>
    </div>
    <div className="support-tabs" aria-label="Feedback views">
      <button aria-pressed={tab === 'send'} className={tab === 'send' ? 'active' : ''} onClick={() => { setTab('send'); setError(''); }} type="button">Send a request</button>
      <button aria-pressed={tab === 'requests'} className={tab === 'requests' ? 'active' : ''} onClick={() => { setTab('requests'); setError(''); }} type="button">My requests{requests.length ? ` · ${requests.length}` : ''}</button>
    </div>
    {!isSupabaseConfigured || !user ? <div className="support-empty"><h2>Feedback is not connected yet</h2><p>Requests can only be delivered when Supabase accounts are configured and you're signed in. Nothing typed here will be sent until then.</p></div> : <>
      {tab === 'send' && <form className="support-form" onSubmit={submit}>
        <h2>How can we help?</h2>
        <div className="support-category-grid" role="group" aria-label="Request type">
          {supportCategories.map((item) => {
            const Icon = categoryIcons[item.value];
            return <button aria-pressed={form.category === item.value} className={form.category === item.value ? 'support-category active' : 'support-category'} key={item.value} onClick={() => updateForm('category', item.value)} type="button"><Icon aria-hidden="true" size={22} /><strong>{item.label}</strong><span>{item.hint}</span></button>;
          })}
        </div>
        <label htmlFor="support-title">A short title<input id="support-title" maxLength={120} onChange={(event) => updateForm('title', event.target.value)} placeholder={form.category === 'bug' ? 'e.g. My sticker moved after rotating my phone' : 'What would you like us to know?'} required value={form.title} /></label>
        <label htmlFor="support-body">{form.category === 'feature' ? 'Tell us about your idea' : form.category === 'feedback' ? 'Your thoughts' : 'What happened?'}<textarea id="support-body" maxLength={5000} onChange={(event) => updateForm('body', event.target.value)} placeholder={form.category === 'bug' ? 'What did you expect, and what happened instead?' : 'What would make your journaling experience better?'} required value={form.body} /></label>
        {form.category === 'bug' && <label htmlFor="support-steps">Steps to reproduce <span className="support-optional">optional</span><textarea id="support-steps" maxLength={2000} onChange={(event) => updateForm('steps', event.target.value)} placeholder="What were you doing just before it happened?" value={form.steps} /></label>}
        <label className="support-checkbox" htmlFor="support-diagnostics"><input checked={form.includeDeviceDetails} id="support-diagnostics" onChange={(event) => updateForm('includeDeviceDetails', event.target.checked)} type="checkbox" /><span><strong>Include device details</strong><small>Shares this page, theme, browser, and screen size. Never your journal text or entries.</small></span></label>
        <p className="support-privacy">Only what you type here is shared with the team. Please leave out passwords, PINs, and sensitive journal passages.</p>
        {error && <p className="support-error" role="alert">{error}</p>}
        <button className="support-submit" disabled={submitting} type="submit"><Send aria-hidden="true" size={18} />{submitting ? 'Sending...' : 'Send request'}</button>
      </form>}
      {tab === 'requests' && <div className="support-requests-layout">
        <div className="support-request-list"><div className="support-conversation-heading"><h2>My requests</h2><button aria-label="Refresh requests" className="support-icon-button" disabled={loading} onClick={refreshRequests} title="Refresh requests" type="button"><RefreshCw aria-hidden="true" size={17} /></button></div>{loading && <p className="support-muted">Loading your requests...</p>}{loadError && <p className="support-error" role="alert">{loadError}</p>}{!loading && !requests.length && !loadError && <p className="support-muted">No requests yet.</p>}{requests.map((request) => <button aria-current={selectedId === request.id ? 'true' : undefined} className={selectedId === request.id ? 'support-request-item active' : 'support-request-item'} key={request.id} onClick={() => setSelectedId(request.id)} type="button"><span className="support-request-item-top"><small>{supportCategories.find((item) => item.value === request.category)?.label}</small><span className={`support-status status-${request.status}`}>{supportStatuses.find((item) => item.value === request.status)?.label}</span></span><strong>{request.title}</strong><small>{formatDate(request.created_at)}</small></button>)}</div>
        <div className="support-detail">{success && <p className="support-success" role="status">{success}</p>}{error && <p className="support-error" role="alert">{error}</p>}{selected ? <><div className="support-detail-heading"><div><span className="support-eyebrow">{supportCategories.find((item) => item.value === selected.category)?.label} · {formatDate(selected.created_at)}</span><h2>{selected.title}</h2></div><span className={`support-status status-${selected.status}`}>{supportStatuses.find((item) => item.value === selected.status)?.label}</span></div><SupportConversation key={selected.id} request={selected} userId={user.id} /></> : !loading && <p className="support-muted">Choose a request to read it here.</p>}</div>
      </div>}
    </>}
  </section>;
}
