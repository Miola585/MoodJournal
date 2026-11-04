import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useMemoryJar } from '../../hooks/useMemoryJar';
import { todayKey } from '../../utils/journalUtils';
import { detectMemoryCategory } from './gameUtils';
import { duplicateMemory, memoryDateLabel, monthlyJars, monthLabel, removeMemoryRecord, resolveJar } from './memoryJarData';
import { MemoryJarCanvas } from './MemoryJarCanvas';
import '../../styles/memoryJar.css';

export function MemoryJarGame(props) {
  // A new storage session must never render the previous owner's private state.
  const [session, setSession] = useState({ storage: props.privateStorage, epoch: 0 });
  if (session.storage !== props.privateStorage) setSession({ storage: props.privateStorage, epoch: session.epoch + 1 });
  return <MemoryJarSession key={session.epoch} {...props} />;
}

function MemoryJarSession({ mood, mainToday, privateStorage, reduceMotion }) {
  const storage = useMemoryJar(privateStorage);
  const [params, setParams] = useSearchParams();
  const [today, setToday] = useState(todayKey);
  const [writing, setWriting] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [newId, setNewId] = useState(null);
  const detail = useRef(null);
  const returnFocus = useRef(null);
  const groups = useMemo(() => monthlyJars(storage.records, today), [storage.records, today]);
  const jar = useMemo(() => resolveJar(groups, params, today), [groups, params, today]);
  const duplicate = duplicateMemory(storage.records, writing, today);
  const selection = jar.visible.find((item) => item.key === selected);
  const jarIdentity = `${jar.month}:${jar.jar}`;
  const selectMemory = (item) => { returnFocus.current = document.activeElement; setSelected(item.key); };
  const closeMemory = () => {
    setSelected(null);
    if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
  };
  const reloadMovement = () => {
    if (!writing.trim() || window.confirm('Reload this page? Your unsaved memory will be lost.')) window.location.reload();
  };

  useEffect(() => {
    let timer;
    const refresh = () => {
      setToday(todayKey());
      clearTimeout(timer);
      const next = new Date(); next.setHours(24, 0, 0, 20);
      timer = setTimeout(refresh, next.getTime() - Date.now());
    };
    refresh(); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { setSelected(null); }, [jarIdentity]);
  useEffect(() => {
    if (!selection) return;
    detail.current?.focus({ preventScroll: true });
    const bounds = detail.current?.getBoundingClientRect();
    if (bounds && (bounds.top < 80 || bounds.top > window.innerHeight - 150)) detail.current.scrollIntoView({ block: 'start', behavior: 'instant' });
    const close = (event) => { if (event.key === 'Escape') closeMemory(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selection]);

  const browse = (month, number) => {
    const next = new URLSearchParams(params);
    next.set('month', month);
    if (number) next.set('jar', String(number)); else next.delete('jar');
    setParams(next); setSelected(null); setNewId(null);
  };
  const add = async (event) => {
    event.preventDefault();
    const text = writing.trim(), dateKey = todayKey();
    if (!text) return;
    setMessage('');
    const memory = { id: crypto.randomUUID(), text, dateKey, createdAt: new Date().toISOString(), category: detectMemoryCategory(text), mood: mood.key, intensity: Number(mainToday?.intensity || mood.score || 5) };
    const saved = await storage.update((records) => {
      if (duplicateMemory(records, text, dateKey)) throw new Error('You already saved this memory today.');
      return [...records, memory];
    });
    if (!saved) return;
    setToday(dateKey); browse(dateKey.slice(0, 7)); setNewId(memory.id);
    setWriting((value) => value.trim() === text ? '' : value); setMessage('Saved to jar.');
  };
  const remove = async () => {
    if (!selection || !window.confirm('Remove this memory from the jar?')) return;
    setMessage('');
    const saved = await storage.update((records) => removeMemoryRecord(records, selection));
    if (saved) { setSelected(null); setMessage('Memory removed.'); }
  };
  const bookLink = (date) => `/journal/library?month=${date.slice(0, 7)}&day=${date}`;
  return <section className="memory-workspace" aria-label="Monthly memory jars">
    <div className="jar-browser">
      <label>Month<select aria-label="Memory month" value={jar.month} onChange={(event) => browse(event.target.value)}>{groups.map((group) => <option key={group.month} value={group.month}>{monthLabel(group.month)}</option>)}</select></label>
      {storage.ready && <div className="jar-pagination"><button type="button" aria-label="Previous jar" disabled={jar.jar === 1} onClick={() => browse(jar.month, jar.jar - 1)}><ChevronLeft size={18} /></button><span>Jar {jar.jar} of {jar.jars}</span><button type="button" aria-label="Next jar" disabled={jar.jar === jar.jars} onClick={() => browse(jar.month, jar.jar + 1)}><ChevronRight size={18} /></button></div>}
    </div>
    {!storage.ready && !storage.error && <p role="status">Opening your memories...</p>}
    {storage.error && <div className="jar-error" role="alert"><p>{storage.error}</p><button type="button" onClick={storage.retry} disabled={storage.busy}>Retry</button></div>}
    {storage.ready && <div className="jar-layout">
      <div className="jar-collection">
        <div className="jar-caption"><h2>{monthLabel(jar.month)}</h2><p>{jar.visible.length} in this jar <span aria-hidden="true">/</span> {jar.memories.length} saved this {jar.month === 'undated' ? 'collection' : 'month'}</p></div>
        <MemoryJarCanvas key={`${jarIdentity}:${jar.visible.map((item) => item.key).join(',')}`} memories={jar.visible} selected={selected} onSelect={selectMemory} reduceMotion={reduceMotion} newId={newId} onReload={reloadMovement} />
        {jar.month === 'undated' && <p className="jar-storage-note">These memories have no valid saved date. They are kept here unchanged.</p>}
        <details className="jar-memory-list"><summary>Memories in this jar ({jar.visible.length})</summary>{jar.visible.length ? <ol>{jar.visible.map((item) => <li key={item.key}><button type="button" aria-pressed={selected === item.key} onClick={() => selectMemory(item)}><span>{memoryDateLabel(item.dateKey)}</span>{item.text || 'Unreadable memory'}</button></li>)}</ol> : <p>No memories in this jar yet.</p>}</details>
      </div>
      <div className="jar-writing">
        {selection && <article className="jar-memory-detail" ref={detail} tabIndex={-1} aria-label="Saved memory">
          <div className="jar-detail-heading"><span>{memoryDateLabel(selection.dateKey)}</span><button type="button" aria-label="Close memory" title="Close memory" onClick={closeMemory}><X size={18} /></button></div>
          <h2>A little thing worth keeping.</h2><p className="jar-memory-text">{selection.text || 'This saved record has no readable text. Its original data has been preserved.'}</p>
          <div className="jar-detail-actions">{selection.dateKey && <Link to={bookLink(selection.dateKey)}>Open monthly book <ArrowRight size={16} /></Link>}<button type="button" disabled={storage.busy} onClick={remove}><Trash2 size={16} /> Remove</button></div>
        </article>}
        <form className="jar-composer" onSubmit={add}>
          <span className="jar-eyebrow">A moment from today</span><h2>What would you like to keep?</h2>
          <label htmlFor="jar-memory">A tiny good thing</label><textarea id="jar-memory" rows={5} placeholder="A tiny good thing from today..." value={writing} onChange={(event) => { setWriting(event.target.value); setMessage(''); }} />
          <p className="jar-storage-note">Saves for {memoryDateLabel(today)}, in today's jar.</p>
          <button className="primary" type="submit" disabled={!writing.trim() || duplicate || storage.busy}><Plus size={17} />{storage.busy ? 'Saving...' : 'Add to jar'}</button>
          {duplicate && writing.trim() && <p className="form-error">You already saved this memory today.</p>}
          <p className="jar-feedback" role="status">{message}</p>
        </form>
        <p className="jar-storage-note">Memories stay on this device and appear in your monthly books.</p>
      </div>
    </div>}
  </section>;
}
