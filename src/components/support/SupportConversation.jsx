import { useEffect, useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { createSupportMessage, listSupportMessages } from '../../utils/supportApi';
import { supportErrorMessage } from '../../utils/support';

const formatTime = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function SupportConversation({ request, userId, admin = false }) {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => { setReply(''); }, [request.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);
    setError('');
    listSupportMessages(request.id).then((items) => {
      if (active) setMessages(items);
    }).catch((loadError) => {
      if (active) setError(supportErrorMessage(loadError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [request.id, refreshKey]);

  const sendReply = async (event) => {
    event.preventDefault();
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const created = await createSupportMessage(request.id, userId, body);
      setMessages((current) => [...current, created]);
      setReply('');
    } catch (sendError) {
      setError(supportErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="support-conversation">
      <div className="support-request-copy">
        <p>{request.body}</p>
        {request.steps && <div><strong>Steps to reproduce</strong><p>{request.steps}</p></div>}
        {admin && request.diagnostics && <details>
          <summary>Shared device details</summary>
          <dl className="support-diagnostics">
            {Object.entries(request.diagnostics).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}
          </dl>
        </details>}
      </div>
      <div className="support-conversation-heading"><h3>Conversation</h3><button aria-label="Refresh replies" className="support-icon-button" onClick={() => setRefreshKey((current) => current + 1)} title="Refresh replies" type="button"><RefreshCw aria-hidden="true" size={17} /></button></div>
      {loading && <p className="support-muted">Loading replies...</p>}
      {!loading && !messages.length && !error && <p className="support-muted">No replies yet.</p>}
      <div className="support-message-list" aria-live="polite">
        {messages.map((message) => <article className="support-message" key={message.id}>
          <div><strong>{message.sender_id === request.user_id ? (admin ? 'Requester' : 'You') : (admin ? 'Team' : 'Mood Journal team')}</strong><time dateTime={message.created_at}>{formatTime(message.created_at)}</time></div>
          <p>{message.body}</p>
        </article>)}
      </div>
      <form className="support-reply-form" onSubmit={sendReply}>
        <label htmlFor={`support-reply-${request.id}`}>{admin ? 'Reply to this request' : 'Add a reply'}</label>
        <textarea id={`support-reply-${request.id}`} maxLength={3000} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." required value={reply} />
        {error && <p className="support-error" role="alert">{error}</p>}
        <button disabled={sending || !reply.trim()} type="submit"><Send aria-hidden="true" size={17} />{sending ? 'Sending...' : 'Send reply'}</button>
      </form>
    </div>
  );
}
