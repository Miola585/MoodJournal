import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bug, CircleCheck, Heart, ImagePlus, Inbox, Lightbulb, LockKeyhole, MessageCircle, Send, Trash2 } from 'lucide-react';
import { collectSupportDiagnostics, filterSupportRequests, supportCategories, supportPriorities, supportStatuses, validateSupportRequest } from '../utils/support';

export const SupportPreviewContext = createContext(null);

const icons = { bug: Bug, feature: Lightbulb, feedback: Heart };
const emptyForm = { category: 'bug', title: '', body: '', steps: '', email: '', includeDeviceDetails: false };
const dateLabel = (date) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));
const labelFor = (options, value) => options.find((option) => option.value === value)?.label || value;

function sampleRequests() {
  return [
    {
      id: 'demo-001', category: 'bug', title: 'My calendar looks different on my phone',
      body: 'The days seem squeezed together when I turn my phone sideways.',
      steps: 'Open Calendar on a phone, then rotate the screen.', email: '', diagnostics: null, screenshot: null,
      status: 'in_review', priority: 'normal', created_at: '2026-10-28T14:00:00Z',
      messages: [
        { id: 'demo-reply-1', author: 'staff', internal: false, body: 'Thanks for letting us know. We are looking at the calendar layout on smaller screens.', created_at: '2026-10-29T10:00:00Z' },
        { id: 'demo-note-1', author: 'staff', internal: true, body: 'Sample internal note: check landscape spacing at larger font sizes.', created_at: '2026-10-29T10:05:00Z' }
      ]
    },
    {
      id: 'demo-002', category: 'feature', title: 'A gentle reminder to take a break',
      body: 'I would love a little reminder to pause during a busy study day.', steps: '', email: '', diagnostics: null, screenshot: null,
      status: 'planned', priority: 'low', created_at: '2026-10-27T14:00:00Z', messages: []
    },
    {
      id: 'demo-003', category: 'feedback', title: 'The evening check-in feels welcoming',
      body: 'Having a quiet place to write has made it easier to notice how I feel.', steps: '', email: '', diagnostics: null, screenshot: null,
      status: 'new', priority: 'normal', created_at: '2026-10-26T14:00:00Z', messages: []
    }
  ];
}

// Mount once above both preview routes so navigation keeps the same demo session.
export function SupportPreviewProvider({ children }) {
  const [requests, setRequests] = useState(sampleRequests);
  const createRequest = (fields) => {
    const request = { ...fields, id: `demo-${crypto.randomUUID()}`, status: 'new', priority: 'normal', created_at: new Date().toISOString(), messages: [] };
    setRequests((current) => [request, ...current]);
    return request.id;
  };
  const updateRequest = (id, fields) => setRequests((current) => current.map((request) => request.id === id ? {
    ...request,
    status: supportStatuses.some((item) => item.value === fields.status) ? fields.status : request.status,
    priority: supportPriorities.some((item) => item.value === fields.priority) ? fields.priority : request.priority
  } : request));
  const addReply = (id, body, { staff = false, internal = false } = {}) => {
    if (!body.trim() || body.trim().length > 5000) return false;
    const message = { id: crypto.randomUUID(), body: body.trim(), author: staff ? 'staff' : 'user', internal: staff && internal, created_at: new Date().toISOString() };
    setRequests((current) => current.map((request) => request.id === id ? { ...request, messages: [...request.messages, message] } : request));
    return true;
  };
  return <SupportPreviewContext.Provider value={{ requests, createRequest, updateRequest, addReply }}>{children}</SupportPreviewContext.Provider>;
}

function readScreenshot(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fail = () => reject(new Error('This screenshot could not be read. Try another image.'));
    reader.onerror = fail;
    reader.onabort = fail;
    reader.onload = () => {
      if (typeof reader.result !== 'string') return fail();
      const image = new Image();
      image.onerror = fail;
      image.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function RequestForm({ onCreated }) {
  const { createRequest } = useContext(SupportPreviewContext);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [reading, setReading] = useState(false);
  const fileInput = useRef(null);
  const fileRevision = useRef(0);
  useEffect(() => () => { fileRevision.current += 1; }, []);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const clearScreenshot = () => {
    fileRevision.current += 1;
    setScreenshot(null);
    setFileError('');
    setReading(false);
    if (fileInput.current) fileInput.current.value = '';
  };
  const chooseScreenshot = async (event) => {
    const file = event.target.files?.[0];
    clearScreenshot();
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFileError('Choose a PNG, JPEG, or WEBP screenshot.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFileError('Choose a screenshot no larger than 3 MB.');
      return;
    }
    const revision = fileRevision.current;
    setReading(true);
    try {
      const result = await readScreenshot(file);
      if (revision === fileRevision.current) setScreenshot(result);
    } catch (readError) {
      if (revision === fileRevision.current) setFileError(readError.message || 'This screenshot could not be read. Try again.');
    } finally {
      if (revision === fileRevision.current) setReading(false);
    }
  };
  const submit = (event) => {
    event.preventDefault();
    if (reading || fileError) return;
    const validation = validateSupportRequest(form);
    if (validation) { setError(validation); return; }
    const root = event.currentTarget.closest('.app');
    const diagnostics = form.includeDeviceDetails ? collectSupportDiagnostics({
      pathname: '/support', theme: [...(root?.classList || [])].find((name) => name.startsWith('theme-'))?.slice(6),
      mode: root?.classList.contains('dark') ? 'dark' : 'light', width: window.innerWidth, height: window.innerHeight, userAgent: navigator.userAgent
    }) : null;
    const id = createRequest({ category: form.category, title: form.title.trim(), body: form.body.trim(), steps: form.category === 'bug' ? form.steps.trim() : '', email: form.email.trim(), screenshot, diagnostics });
    onCreated(id);
  };
  return <form className="sp-form" onSubmit={submit}>
    <h2>How can we help?</h2>
    <div className="sp-kinds" role="group" aria-label="Request type">
      {supportCategories.map((category) => {
        const Icon = icons[category.value];
        return <button className="sp-kind" aria-pressed={form.category === category.value} key={category.value} onClick={() => update('category', category.value)} type="button">
          <Icon size={24} aria-hidden="true" /><strong>{category.label}</strong><span>{category.hint}</span>
        </button>;
      })}
    </div>
    <label htmlFor="sp-title">A short title<input id="sp-title" required maxLength={120} value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
    <label htmlFor="sp-body">{form.category === 'bug' ? 'What happened?' : form.category === 'feature' ? 'Tell us about your idea' : 'Your thoughts'}<textarea id="sp-body" required maxLength={5000} value={form.body} onChange={(event) => update('body', event.target.value)} /></label>
    {form.category === 'bug' && <label htmlFor="sp-steps">Steps to reproduce (optional)<textarea id="sp-steps" maxLength={2000} value={form.steps} onChange={(event) => update('steps', event.target.value)} /></label>}
    <label htmlFor="sp-email">Email (optional)<input id="sp-email" type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
    <div className="sp-attachment">
      <label htmlFor="sp-screenshot"><span><ImagePlus size={18} aria-hidden="true" /> Screenshot (optional)</span><input ref={fileInput} id="sp-screenshot" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="sp-file-hint" onChange={chooseScreenshot} /></label>
      <small id="sp-file-hint">PNG, JPEG, or WEBP. Up to 3 MB. Kept in memory only.</small>
      {reading && <p role="status">Reading screenshot...</p>}
      {screenshot && <figure><img src={screenshot.dataUrl} alt="Selected screenshot" /><figcaption>{screenshot.name}</figcaption></figure>}
      {fileError && <p className="sp-error" role="alert">{fileError}</p>}
      {(screenshot || reading || fileError) && <button className="sp-secondary" onClick={clearScreenshot} type="button"><Trash2 size={17} aria-hidden="true" />Remove screenshot</button>}
    </div>
    <label className="sp-checkbox" htmlFor="sp-device"><input id="sp-device" type="checkbox" checked={form.includeDeviceDetails} onChange={(event) => update('includeDeviceDetails', event.target.checked)} /><span>Include device details<small>Browser, screen size, theme, and support page only. No journal entries.</small></span></label>
    {error && <p className="sp-error" role="alert">{error}</p>}
    <button className="sp-primary" disabled={reading || Boolean(fileError)} type="submit"><Send size={18} aria-hidden="true" />Send demo request</button>
  </form>;
}

function SelectOptions({ options }) {
  return options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>);
}

function RequestDetail({ request, staff, onBack }) {
  const { updateRequest, addReply } = useContext(SupportPreviewContext);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('reply');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const internal = staff && mode === 'note';
  const messages = request.messages.filter((message) => staff || !message.internal);
  const sendReply = (event) => {
    event.preventDefault();
    if (!addReply(request.id, internal ? note : reply, { staff, internal })) {
      setError('Write a message between 1 and 5,000 characters.');
      return;
    }
    if (internal) setNote(''); else setReply('');
    setError('');
    setNotice(internal ? 'Internal note added to this demo session.' : 'Reply added to this demo session. Nothing was delivered.');
  };
  return <article className="sp-detail" aria-label="Request details">
    <button className="sp-back sp-secondary" type="button" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />Back to requests</button>
    <div className="sp-detail-heading"><small>{labelFor(supportCategories, request.category)} / {dateLabel(request.created_at)}</small><span className={`sp-status sp-status-${request.status}`}>{labelFor(supportStatuses, request.status)}</span></div>
    <h2 ref={heading} tabIndex={-1}>{request.title}</h2>
    {staff && <div className="sp-triage">
      <label htmlFor="sp-status">Status<select id="sp-status" value={request.status} onChange={(event) => updateRequest(request.id, { status: event.target.value })}><SelectOptions options={supportStatuses} /></select></label>
      <label htmlFor="sp-priority">Priority<select id="sp-priority" value={request.priority} onChange={(event) => updateRequest(request.id, { priority: event.target.value })}><SelectOptions options={supportPriorities} /></select></label>
    </div>}
    <p className="sp-copy">{request.body}</p>
    {request.steps && <div className="sp-copy"><h3>Steps to reproduce</h3><p>{request.steps}</p></div>}
    {request.email && <p className="sp-copy"><strong>Email: </strong>{request.email}</p>}
    {request.screenshot && <figure className="sp-attachment"><img src={request.screenshot.dataUrl} alt="Request screenshot" /><figcaption>{request.screenshot.name}</figcaption></figure>}
    {request.diagnostics && <details className="sp-diagnostics"><summary>Device details</summary><dl>{Object.entries(request.diagnostics).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details>}
    <h3>Conversation</h3>
    <div className="sp-messages" aria-label="Conversation">
      {!messages.length && <p className="sp-muted">No replies yet.</p>}
      {messages.map((message) => <div className={`sp-message${message.internal ? ' sp-internal' : ''}`} key={message.id}>
        <div><strong>{message.internal ? <><LockKeyhole size={14} aria-hidden="true" />Internal note</> : message.author === 'staff' ? 'Demo support team' : 'You (demo)'}</strong><time dateTime={message.created_at}>{dateLabel(message.created_at)}</time></div>
        <p>{message.body}</p>
      </div>)}
    </div>
    <form className="sp-reply" onSubmit={sendReply}>
      {staff && <div className="sp-tabs" aria-label="Message type">
        <button type="button" aria-pressed={mode === 'reply'} onClick={() => { setMode('reply'); setError(''); setNotice(''); }}><MessageCircle size={16} aria-hidden="true" />User reply</button>
        <button type="button" aria-pressed={mode === 'note'} onClick={() => { setMode('note'); setError(''); setNotice(''); }}><LockKeyhole size={16} aria-hidden="true" />Internal note</button>
      </div>}
      <label htmlFor="sp-reply">{internal ? 'Internal note' : 'Your reply'}<textarea id="sp-reply" required maxLength={5000} value={internal ? note : reply} onChange={(event) => internal ? setNote(event.target.value) : setReply(event.target.value)} /></label>
      {error && <p className="sp-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="sp-primary" type="submit"><Send size={17} aria-hidden="true" />{internal ? 'Add demo note' : 'Add demo reply'}</button>
    </form>
  </article>;
}

export function SupportPreview({ staff = false }) {
  const context = useContext(SupportPreviewContext);
  const [tab, setTab] = useState('send');
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: 'all', status: 'all', priority: 'all' });
  const [notice, setNotice] = useState('');
  const listHeading = useRef(null);
  if (!context) throw new Error('SupportPreview must be rendered inside SupportPreviewProvider.');
  const { requests } = context;
  const counters = staff ? [
    { label: 'New requests', count: requests.filter((request) => request.status === 'new').length, Icon: Inbox },
    { label: 'Bug reports', count: requests.filter((request) => request.category === 'bug').length, Icon: Bug },
    { label: 'Feature ideas', count: requests.filter((request) => request.category === 'feature').length, Icon: Lightbulb },
    { label: 'Resolved', count: requests.filter((request) => request.status === 'resolved').length, Icon: CircleCheck }
  ] : [];
  const visible = staff ? filterSupportRequests(requests, filters).filter((request) => filters.priority === 'all' || request.priority === filters.priority) : requests;
  const selected = requests.find((request) => request.id === selectedId);
  const updateFilter = (field, value) => { setFilters((current) => ({ ...current, [field]: value })); setSelectedId(null); };
  const backToList = () => { setSelectedId(null); requestAnimationFrame(() => listHeading.current?.focus()); };
  return <section className="screen app-screen support-preview" aria-label={staff ? 'Staff support preview' : 'Support preview'}>
    <nav className="sp-tabs sp-page-tabs" aria-label="Support preview views">
      {staff ? <span className="sp-tab-current"><Inbox size={18} aria-hidden="true" />Staff inbox</span> : <>
        <button type="button" aria-pressed={tab === 'send'} onClick={() => { setTab('send'); setNotice(''); }}>Send request</button>
        <button type="button" aria-pressed={tab === 'requests'} onClick={() => { setTab('requests'); setNotice(''); }}>My requests ({requests.length})</button>
      </>}
      <Link to={staff ? '/support/preview' : '/support/preview/staff'}>{staff ? 'User preview' : 'Staff preview'}<ArrowRight size={16} aria-hidden="true" /></Link>
    </nav>
    <header className="sp-heading"><span className="sp-muted">Help & feedback / Preview</span><h1>{staff ? 'Support inbox' : "We're listening"}</h1><p>{staff ? 'Sample requests from the demo journaler.' : "Something not quite right? An idea you'd love to see? Tell us."}</p></header>
    <aside className="sp-notice"><strong>Session-only demo. Nothing is delivered.</strong><p>Requests, replies, email, and screenshots stay in memory and reset on reload. This sample demo is not access-controlled; anyone using it can open the staff view. Use sample information only.</p></aside>
    {notice && <p className="sp-success" role="status">{notice}</p>}
    {!staff && tab === 'send' ? <div className="sp-compose">
      <RequestForm onCreated={(id) => { setSelectedId(id); setTab('requests'); setNotice('Demo request added for this session. Nothing was delivered.'); }} />
      <aside className="sp-sidebar" aria-labelledby="sp-sidebar-heading">
        <Lightbulb size={24} aria-hidden="true" />
        <h2 id="sp-sidebar-heading">Small ideas matter</h2>
        <p>A little detail can make a big difference. Your thoughts are welcome here.</p>
        <div className="sp-sidebar-privacy">
          <h3><LockKeyhole size={17} aria-hidden="true" />A privacy reminder</h3>
          <p>Leave out passwords, PINs, private journal passages, and identifying details.</p>
          <p>Screenshots can contain personal information. Use sample text and images only in this demo.</p>
        </div>
      </aside>
    </div> : <>
      {staff && <dl className="sp-counters" aria-label="Demo request totals">
        {counters.map(({ label, count, Icon }) => <div className="sp-counter" key={label}><dt><Icon size={17} aria-hidden="true" />{label}</dt><dd>{count}</dd></div>)}
      </dl>}
      {staff && <div className="sp-filters">
        <label htmlFor="sp-search">Search requests<input id="sp-search" type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} /></label>
        <label htmlFor="sp-filter-kind">Request type<select id="sp-filter-kind" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}><option value="all">All types</option><SelectOptions options={supportCategories} /></select></label>
        <label htmlFor="sp-filter-status">Filter status<select id="sp-filter-status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="all">All statuses</option><SelectOptions options={supportStatuses} /></select></label>
        <label htmlFor="sp-filter-priority">Filter priority<select id="sp-filter-priority" value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}><option value="all">All priorities</option><SelectOptions options={supportPriorities} /></select></label>
      </div>}
      <div className={`sp-requests${selected ? ' sp-has-selection' : ''}`}>
        <div className="sp-list"><h2 ref={listHeading} tabIndex={-1}>{staff ? `Inbox (${visible.length})` : 'My requests'}</h2>
          {!visible.length && <p className="sp-muted">No requests match these filters.</p>}
          {visible.map((request) => <button className="sp-request" type="button" key={request.id} aria-current={selectedId === request.id ? 'true' : undefined} onClick={() => { setSelectedId(request.id); setNotice(''); }}>
            <span><small>{labelFor(supportCategories, request.category)}</small><span className={`sp-status sp-status-${request.status}`}>{labelFor(supportStatuses, request.status)}</span></span>
            <strong>{request.title}</strong><small>{dateLabel(request.created_at)}{staff ? ` / ${labelFor(supportPriorities, request.priority)} priority` : ''}</small>
          </button>)}
        </div>
        {selected ? <RequestDetail key={`${staff}-${selected.id}`} request={selected} staff={staff} onBack={backToList} /> : <div className="sp-detail sp-placeholder"><Inbox size={28} aria-hidden="true" /><p>Choose a request to read the conversation.</p></div>}
      </div>
    </>}
  </section>;
}
