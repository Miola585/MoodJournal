import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import { loadGameArchive } from './gameArchiveData';
import { constellationArtwork, orbitArtwork, orbitCenterArtwork } from './gameArtwork';
import { normalizeStoredOrbit, orbitRingLabels, orbitRings } from './gameUtils';
import { MemoryJarSvg } from './MemoryJarSvg';
import '../../styles/gameArchive.css';

const titles = { constellation: 'Constellation archive', orbit: 'Mood Orbit archive', memory: 'Memory Jar archive' };
const labels = { constellation: 'Constellations', orbit: 'Mood Orbit', memory: 'Memory Jar' };
const radii = { close: 17, between: 30, far: 43 };
const dateLabel = (item) => {
  const date = new Date(item.createdAt);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', ...(!item.legacy && { hour: 'numeric', minute: '2-digit' }) });
};

export function GameArchive({ privateStorage }) {
  const [params] = useSearchParams();
  const game = Object.hasOwn(labels, params.get('game')) ? params.get('game') : 'constellation';
  return <section className="screen app-screen game-archive-screen">
    <nav className="archive-game-tabs" aria-label="Game archives">
      {Object.entries(labels).map(([key, label]) => <Link key={key} to={`/game-archive?game=${key}`} aria-current={key === game ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <PageHeader title="Game Archive" subtitle="Your saved skies, orbits, and little moments." />
    <ArchiveCollection key={`${privateStorage.ownerId}:${game}`} game={game} privateStorage={privateStorage} />
  </section>;
}

function ArchiveCollection({ game, privateStorage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setItems([]);
    setSelectedId(null);
    setError('');
    loadGameArchive(privateStorage, game).then((records) => {
      if (active) { setItems(records); setSelectedId(records[0]?.id || null); }
    }).catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [privateStorage, game, retry]);

  const filtered = items.filter((item) => `${item.title} ${item.reflection || ''} ${dateLabel(item)}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const groups = new Map();
  filtered.slice(0, limit).forEach((item) => {
    const date = new Date(item.createdAt);
    const label = Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date unavailable';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });
  return (
    <section className="game-archive-collection" aria-label={titles[game]}>
      <p className="game-archive-storage">Saved in this browser for this profile.</p>
      {loading ? <p role="status">Loading saved moments...</p> : error ? (
        <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
      ) : items.length === 0 ? <p>No saved {game === 'constellation' ? 'constellations' : game === 'orbit' ? 'orbits' : 'memories'} yet.</p> : <>
        <label className="game-archive-search">Search archive
          <span><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(12); setSelectedId(null); }} /></span>
        </label>
        <p className="game-archive-count" role="status">{filtered.length} saved {filtered.length === 1 ? 'moment' : 'moments'}</p>
        {filtered.length === 0 ? <p>No saved moments match your search.</p> : <div className="game-archive-layout">
          <div className="game-archive-list" aria-label="Saved moments">
            {[...groups].map(([date, records]) => <section className="game-archive-day" key={date} aria-label={date}>
              <h2>{date}</h2>
              {records.map((item) => <button type="button" className="game-archive-item" key={item.id} aria-pressed={selected?.id === item.id} onClick={() => setSelectedId(item.id)}>
              <strong>{item.title}</strong>{game === 'orbit' && item.reflection && <small>{item.reflection}</small>}<time>{dateLabel(item)}</time>
            </button>)}
            </section>)}
            {filtered.length > limit && <button type="button" onClick={() => setLimit((value) => value + 12)}>Show more</button>}
          </div>
          {selected && <article className="game-archive-detail" aria-label="Saved moment details">
            <h3>{game === 'memory' ? 'A saved memory' : selected.title}</h3>
            <time>{dateLabel(selected)}</time>
            <ArchivePreview item={selected} game={game} />
          </article>}
        </div>}
      </>}
    </section>
  );
}

function ArchivePreview({ item, game }) {
  if (game === 'memory') return <><MemoryJarSvg className="archive-memory-art" /><p className="game-archive-writing">{item.text}</p></>;
  if (game === 'constellation') return <>
    <div className="archive-sky" role="img" aria-label={`Saved constellation: ${item.title}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {(item.connections || []).map(([fromId, toId], index) => {
          const from = item.stars.find((star) => star.id === fromId);
          const to = item.stars.find((star) => star.id === toId);
          return from && to ? <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} /> : null;
        })}
      </svg>
      {item.stars.map((star) => <img key={star.id} alt="" src={constellationArtwork[(star.id + 2) % constellationArtwork.length]} style={{ left: `${star.x}%`, top: `${star.y}%` }} />)}
    </div>
    <p>{item.connections?.length || 0} {item.connections?.length === 1 ? 'connection' : 'connections'}{item.archetype ? ` - ${item.archetype}` : ''}</p>
  </>;
  const planets = normalizeStoredOrbit(item);
  return <>
    <div className="archive-orbit" role="img" aria-label="Saved planet arrangement">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {orbitRings.map((ring) => <ellipse key={ring} cx="50" cy="50" rx={radii[ring]} ry={radii[ring]} />)}
      </svg>
      <img className="archive-orbit-center" src={orbitCenterArtwork} alt="" />
      {planets.map((planet) => <img key={planet.name} src={orbitArtwork[planet.name].image} alt="" style={{ left: `${50 + Math.cos(planet.angle * Math.PI / 180) * radii[planet.orbit]}%`, top: `${50 + Math.sin(planet.angle * Math.PI / 180) * radii[planet.orbit]}%` }} />)}
    </div>
    <dl className="archive-orbit-distances">{orbitRings.map((ring) => <div key={ring}><dt>{orbitRingLabels[ring]}</dt><dd>{planets.filter((planet) => planet.orbit === ring).map((planet) => orbitArtwork[planet.name].label).join(', ') || 'None'}</dd></div>)}</dl>
    {item.reflection && <p className="game-archive-writing">{item.reflection}</p>}
  </>;
}
