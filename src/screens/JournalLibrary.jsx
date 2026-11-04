import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Leaf, List, Plus, RefreshCw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { buildMonthlyLibrary, loadLibraryKeepsakes } from '../utils/journalLibrary';
import { isCheckIn } from '../utils/journalUtils';
import { useLocalToday } from '../hooks/useLocalToday';
import { buildMonthlySkies, SKY_SPREAD, skyBookPath } from '../utils/monthlyNightSky';
import { moods } from '../data/journalData';
import { MonthlySkyField, SkyBackground } from '../components/games/MonthlySkyField';
import { MonthlyReflection } from '../components/journal/MonthlyReflection';
import { REFLECTION_SPREAD } from '../utils/monthlyReflection';
import { RichNoteContent } from '../components/journal/RichNoteContent';
import { ConstellationDecal } from '../components/journal/ConstellationDecal';
import { StickerLayer } from '../components/journal/StickerLayer';
import { stickerById } from '../data/stickers';
import { orbitArtwork, orbitCenterArtwork } from '../components/games/gameArtwork';
import { moodColors } from '../utils/moodColors';
import '../styles/library.css';

const dayLabel = (date, options = { month: 'long', day: 'numeric' }) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
const monthLabel = (month) => dayLabel(`${month}-01`, { month: 'long' });
const entryTitle = (entry) => entry.title?.trim() || entry.specificFeeling?.trim() || (isCheckIn(entry) ? 'A moment to notice' : 'A little of today');
const countLabel = (count, label) => `${count} ${label}${count === 1 ? '' : 's'}`;

export function JournalLibrary({ entries, privateStorage, reduceMotion }) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [loaded, setLoaded] = useState(null);
  const [revision, setRevision] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [turning, setTurning] = useState(null);
  const [displayDay, setDisplayDay] = useState(null);
  const [sound, setSound] = useState(false);
  const [soundNotice, setSoundNotice] = useState('');
  const timers = useRef([]);
  const turnBusy = useRef(false);
  const audio = useRef(null);
  const mounted = useRef(false);
  const swipe = useRef(null);
  const bookRef = useRef(null);
  const contentsRef = useRef(null);
  const today = useLocalToday();
  const source = loaded?.storage === privateStorage ? loaded : null;
  const library = useMemo(() => buildMonthlyLibrary(entries, source?.items || [], today), [entries, source, today]);
  const book = library.months.find((item) => item.month === params.get('month'));
  const dates = book?.days.map((day) => day.dateKey) || [];
  const spreads = [...dates, SKY_SPREAD, REFLECTION_SPREAD];
  const requestedDay = [SKY_SPREAD, REFLECTION_SPREAD].includes(params.get('view')) ? params.get('view') : dates.includes(params.get('day')) ? params.get('day') : dates[0];
  const date = displayDay && spreads.includes(displayDay) ? displayDay : requestedDay;
  const index = spreads.indexOf(date);
  const isSky = date === SKY_SPREAD;
  const isReflection = date === REFLECTION_SPREAD;
  const closingLabel = isSky ? 'Monthly night sky' : 'Monthly reflection';
  const nextLabel = index === dates.length - 1 ? 'Monthly night sky' : isSky ? 'Monthly reflection' : isReflection ? 'Next page' : 'Next day';
  const previousLabel = isReflection ? 'Monthly night sky' : 'Previous day';
  const skies = useMemo(() => buildMonthlySkies(entries, moods, today), [entries, today]);
  const stars = skies.months.find((value) => value.month === book?.month)?.stars || [];
  const day = book?.days.find((value) => value.dateKey === date);
  const gallery = params.get('view') === 'constellations';
  const returnState = { libraryReturn: `${location.pathname}${location.search}` };
  const cancelTurn = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    turnBusy.current = false;
  };
  useEffect(() => {
    const controller = new AbortController();
    loadLibraryKeepsakes(privateStorage, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setLoaded({ ...result, storage: privateStorage });
    }).catch(() => {
      if (!controller.signal.aborted) setLoaded({ items: [], unavailable: ['Device keepsakes'], storage: privateStorage });
    });
    return () => controller.abort();
  }, [privateStorage, revision]);
  useEffect(() => {
    cancelTurn(); setTurning(null); setDisplayDay(null); setContentsOpen(false); swipe.current = null;
  }, [location.key, privateStorage, entries, today]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelTurn(); audio.current?.close().catch(() => {}); };
  }, []);

  const openBook = (month, value) => {
    setParams([SKY_SPREAD, REFLECTION_SPREAD].includes(value) ? { month, view: value } : value ? { month, day: value } : { month });
    if (!book) window.scrollTo(0, 0);
  };
  const selectDay = (value) => {
    openBook(book.month, value);
    bookRef.current?.focus({ preventScroll: true });
    bookRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const playSwish = () => {
    if (!sound) return;
    const fail = () => { if (mounted.current) { setSound(false); setSoundNotice('Page sound is unavailable. You can keep reading.'); } };
    try {
      const context = audio.current || new AudioContext();
      audio.current = context;
      context.resume().catch(fail);
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .28), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      const node = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      node.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = .6;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(.035, context.currentTime + .08);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + .28);
      node.connect(filter).connect(gain).connect(context.destination);
      node.onended = () => { node.disconnect(); filter.disconnect(); gain.disconnect(); };
      node.start();
    } catch { fail(); }
  };
  const turn = (direction) => {
    const target = spreads[index + direction];
    if (!target || turnBusy.current || !source) return;
    playSwish();
    if (reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { selectDay(target); return; }
    turnBusy.current = true;
    setTurning(direction > 0 ? 'next' : 'previous');
    timers.current = [setTimeout(() => setDisplayDay(target), 330), setTimeout(() => {
      cancelTurn(); setTurning(null); selectDay(target);
    }, 700)];
  };
  const problems = [...(source?.unavailable || []), ...(library.invalidEntries ? ['Some journal entries'] : [])];
  return <section className="screen app-screen journal-library">
    {!source && <p role="status">Gathering your saved days...</p>}
    {problems.length > 0 && <div className="library-load-warning" role="alert"><p>Some saved content could not be read: {problems.join(', ')}. The available pages are still here.</p><button className="secondary-button" onClick={() => setRevision((value) => value + 1)} type="button"><RefreshCw size={16} />Retry</button></div>}
    {!book ? <>
      <header className="library-heading"><p className="app-eyebrow">Your library</p><h1>Your days,<br /><em>bound together.</em></h1><p>A month on the shelf. A little sky between the pages.</p></header>
      <div className="library-tabs" role="group" aria-label="Library views"><button aria-pressed={!gallery} onClick={() => setParams({})} type="button"><BookOpen size={18} />Monthly books</button><button aria-pressed={gallery} onClick={() => setParams({ view: 'constellations' })} type="button"><Sparkles size={18} />Constellations{source && <span>{library.constellations.length}</span>}</button></div>
      {gallery ? library.constellations.length ? <div className="kept-skies-grid">{library.constellations.map((sky) => <button className="kept-sky-card" key={sky.libraryId} onClick={() => openBook(sky.dateKey.slice(0, 7), sky.dateKey)} type="button"><span className="sky-decal"><ConstellationDecal constellation={sky} /></span><small>{dayLabel(sky.dateKey, { month: 'long', day: 'numeric', year: 'numeric' })}</small><strong>{sky.name || 'A little sky'}</strong><span>Open monthly book <ArrowRight size={15} /></span></button>)}</div> : source && <div className="library-empty"><Sparkles size={40} /><h2>A little sky to keep.</h2><Link className="primary-button" to="/games/constellation">Make a constellation <ArrowRight size={16} /></Link></div>
        : <div className="monthly-bookshelf">{library.months.map((volume) => {
          const sky = library.constellations.find((item) => item.dateKey.startsWith(volume.month));
          return <button className="month-volume" key={volume.month} onClick={() => openBook(volume.month)} type="button"><span className={`month-cover ${volume.month === today.slice(0, 7) ? 'cover-current' : ''}`}><span className="cover-volume">A personal journal / {volume.month.slice(0, 4)}</span><strong>{monthLabel(volume.month)}</strong><span className="cover-medallion">{sky ? <ConstellationDecal constellation={sky} /> : <Leaf size={42} />}</span><span className="cover-bottom">The little things were the big things.</span></span><span className="volume-caption"><b>{monthLabel(volume.month)} {volume.month.slice(0, 4)}</b><ArrowRight size={18} /></span><small>{countLabel(volume.days.length, 'saved day')} &middot; {countLabel(volume.entryCount, 'entry').replace('entrys', 'entries')} &middot; {countLabel(volume.keepsakeCount, 'keepsake')}{(!source || problems.length > 0) && ' (available so far)'}</small><span className="volume-status">{volume.month === today.slice(0, 7) ? 'Still being written' : 'A month on the shelf'}</span></button>;
        })}</div>}
    </> : <>
      <div className="book-reader-top"><button className="ghost-button" onClick={() => { setParams({}); window.scrollTo(0, 0); }} type="button"><ArrowLeft size={16} />Back to your library</button><button className="book-sound-toggle" aria-pressed={sound} onClick={() => { setSound(!sound); setSoundNotice(''); }} type="button">{sound ? <Volume2 size={16} /> : <VolumeX size={16} />}Page sound {sound ? 'on' : 'off'}</button></div>
      <header className="book-reader-heading"><div><p className="app-eyebrow">{book.month.slice(0, 4)} / {book.month === today.slice(0, 7) ? 'A month still unfolding' : 'A month to return to'}</p><h1>{monthLabel(book.month)},<span> a little at a time.</span></h1></div><button className="secondary-button" ref={contentsRef} aria-expanded={contentsOpen} aria-controls="monthly-book-contents" onClick={() => setContentsOpen(!contentsOpen)} type="button"><List size={17} />Contents</button></header>
      {contentsOpen && <nav id="monthly-book-contents" className="book-contents" aria-label="Days in this book" onKeyDown={(event) => { if (event.key === 'Escape') { setContentsOpen(false); contentsRef.current?.focus(); } }}>
        {book.days.map((value) => <button key={value.dateKey} aria-current={value.dateKey === date ? 'page' : undefined} disabled={Boolean(turning)} onClick={() => selectDay(value.dateKey)} type="button"><span>{dayLabel(value.dateKey, { day: 'numeric', month: 'short' })}</span><b>{value.entries[0] ? entryTitle(value.entries[0]) : 'Little things worth keeping'}</b><ArrowRight size={15} /></button>)}
        {!dates.length && <p>No saved days available yet.</p>}
        <button type="button" aria-current={isSky ? 'page' : undefined} disabled={Boolean(turning)} onClick={() => selectDay(SKY_SPREAD)}><Sparkles size={18} /><b>Monthly night sky</b><ArrowRight size={15} /></button>
        <button type="button" aria-current={isReflection ? 'page' : undefined} disabled={Boolean(turning)} onClick={() => selectDay(REFLECTION_SPREAD)}><BookOpen size={18} /><b>Monthly reflection</b><ArrowRight size={15} /></button>
      </nav>}
      {!day && !isSky && !isReflection ? source && <div className="library-empty"><BookOpen size={40} /><h2>This chapter is still yours to write.</h2><Link className="primary-button" state={returnState} to={`/journal/write?date=${today}`}>Write for this day <Plus size={17} /></Link><button className="ghost-button" type="button" onClick={() => selectDay(SKY_SPREAD)}>Monthly night sky <Sparkles size={16} /></button></div> : <>
        <div ref={bookRef} className={`month-book${isSky ? ' month-book--sky' : ''}`} role="region" aria-label={`${monthLabel(book.month)} journal book`} tabIndex={0} aria-busy={Boolean(turning)} onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
          event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1);
        }} onTouchStart={(event) => {
          if (event.touches.length !== 1 || event.target.closest('a, button, input, textarea, select') || window.getSelection()?.toString()) { swipe.current = null; return; }
          swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }} onTouchMove={(event) => {
          if (swipe.current && (event.touches.length !== 1 || Math.abs(event.touches[0].clientY - swipe.current.y) > 35)) swipe.current = null;
        }} onTouchEnd={(event) => {
          const start = swipe.current; swipe.current = null;
          if (!start || !event.changedTouches.length || window.getSelection()?.toString()) return;
          const x = event.changedTouches[0].clientX - start.x, y = event.changedTouches[0].clientY - start.y;
          if (Math.abs(x) > 70 && Math.abs(x) > Math.abs(y) * 1.6) turn(x < 0 ? 1 : -1);
        }} onTouchCancel={() => { swipe.current = null; }}>
          {isSky ? <MonthlySkySpread key={`${privateStorage.ownerId}:${book.month}`} month={book.month} today={today} stars={stars} pageNumber={dates.length * 2 + 1} onDay={selectDay} /> : isReflection ? <MonthlyReflection book={book} today={today} pageNumber={dates.length * 2 + 3} partial={!source || problems.length > 0} /> : <><article className="book-leaf book-writing-leaf"><div className="book-page-running-head"><span>{monthLabel(book.month)} / {book.month.slice(0, 4)}</span><Leaf size={15} /></div><div className="book-date"><strong>{dayLabel(date, { day: 'numeric' })}</strong><span>{dayLabel(date, { weekday: 'long' })}</span><small>{countLabel(day.entries.length, 'entry').replace('entrys', 'entries')}</small></div><div className="book-page-content">
            {day.entries.map((entry) => <BoundEntry key={entry.id} entry={entry} />)}
            {!day.entries.length && <div className="book-unwritten"><h2>Some days live in the margins.</h2><p>Your keepsakes are here, even without a journal entry.</p></div>}
            <Link className="bound-entry-edit" state={returnState} to={`/journal/write?date=${date}`}>Write for this day <Plus size={16} /></Link>
          </div><footer className="book-page-number">{index * 2 + 1}<span>A day in your own words</span></footer></article>
          <aside className="book-leaf book-keepsake-leaf" aria-label="Keepsakes for this day"><div className="book-page-running-head"><span>Little things worth keeping</span><Sparkles size={15} /></div><div className="book-keepsake-content">{day.keepsakes.map((item) => <Keepsake key={item.libraryId} item={item} />)}{!day.keepsakes.length && <div className="book-sky-empty"><Sparkles size={35} /><h2>A little room for the sky.</h2><Link to="/games/constellation">Make today's constellation <ArrowRight size={15} /></Link></div>}</div><footer className="book-page-number"><span>{dayLabel(date)}</span>{index * 2 + 2}</footer></aside></>}
          {turning && <div aria-hidden="true" className={`book-turn-sheet turn-${turning}`}><span>{monthLabel(book.month)}</span><strong>{isSky || isReflection ? closingLabel : dayLabel(date, { day: 'numeric' })}</strong><i /><i /><i /><Leaf size={30} /></div>}
        </div>
        {isSky && <details className="book-sky-index"><summary>Days in this sky ({stars.length})</summary><nav aria-label="Journal days in this sky">{stars.map((star) => <button type="button" key={star.id} onClick={() => selectDay(star.dateKey)}><time dateTime={star.dateKey}>{dayLabel(star.dateKey)}</time><span>{star.label}</span><ArrowRight size={16} /></button>)}</nav></details>}
        <div className="book-turn-controls"><button className="secondary-button" aria-label={previousLabel} disabled={index <= 0 || Boolean(turning)} onClick={() => turn(-1)} type="button"><ArrowLeft size={16} />{previousLabel}</button><span role="status">{isSky || isReflection ? `${closingLabel} / ${countLabel(stars.length, 'journal day')}` : `${dayLabel(date)} / Day ${index + 1} of ${dates.length}`}</span><button className="secondary-button" aria-label={nextLabel} disabled={index >= spreads.length - 1 || Boolean(turning)} onClick={() => turn(1)} type="button">{nextLabel} <ArrowRight size={16} /></button></div>
      </>}
    </>}
    {soundNotice && <p role="status" className="library-storage-note">{soundNotice}</p>}
    <p className="library-storage-note">Books gather your saved content. Journal entries follow your journal's sync settings; activity keepsakes stay on this device.</p>
  </section>;
}

function MonthlySkySpread({ month, today, stars, pageNumber, onDay }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const selected = stars.find((star) => star.dateKey === selectedDay);
  return <article className="book-monthly-sky" aria-label="Monthly night sky">
    <SkyBackground />
    <header className="book-sky-summary"><div><p>{monthLabel(month)} / {month.slice(0, 4)}</p><h2>Your monthly night sky.</h2></div><div><p>{month === today.slice(0, 7) ? 'Still growing' : 'Your days, gathered as stars'}</p><span>{countLabel(stars.length, 'journal day')}</span></div></header>
    <MonthlySkyField stars={stars} selectedDay={selectedDay} onSelect={setSelectedDay} empty={<><Sparkles size={40} /><h3>There is room for your first star.</h3><p>No saved journal days in this month.<br />Activity keepsakes stay on their own pages.</p></>} />
    <div className="book-sky-bottom">
      <div className="book-sky-selection" aria-live="polite">{selected ? <><time dateTime={selected.dateKey}>{dayLabel(selected.dateKey)}</time><strong>{selected.label}</strong><span>{countLabel(selected.entryCount, 'entry').replace('entrys', 'entries')}{selected.intensity == null ? '' : ` / intensity ${selected.intensity}`}</span><button type="button" onClick={() => onDay(selected.dateKey)}>Open book day <ArrowRight size={16} /></button></> : <p>Every kind of day belongs here.</p>}</div>
      <Link state={{ skyReturn: skyBookPath(month) }} to={`/games/night-sky?month=${month}`}>Open full sky <ArrowRight size={16} /></Link>
    </div>
    <footer className="book-page-number"><span>{pageNumber}</span><span>Monthly night sky</span><span>{pageNumber + 1}</span></footer>
  </article>;
}

function BoundEntry({ entry }) {
  const introRef = useRef(null);
  const writingRef = useRef(null);
  const tags = (entry.tags || []).filter((tag) => tag !== 'free-write');
  const checkIn = isCheckIn(entry);
  const stickers = (entry.stickers || []).filter((placement) => stickerById.has(placement.stickerId));
  return <section className={`bound-entry ${checkIn ? 'bound-checkin' : 'bound-freewrite'}`}>
    <div className={`book-entry-paper${stickers.length ? ' book-entry-decorated' : ''}`}>
      <div className="book-entry-intro" ref={introRef}>
        <p className="book-entry-kind">{checkIn ? 'Daily check-in' : 'Free write'}</p>
        <h2>{entryTitle(entry)}</h2>
        {checkIn && <p className="book-checkin-recap">{{ Happy: 'Bright', Sad: 'Low' }[entry.mood] || entry.mood}{entry.intensity != null ? ` / intensity ${entry.intensity}` : ''}</p>}
        <div className="journal-sticker-layer journal-sticker-origin" aria-hidden="true" />
      </div>
      <div className="book-entry-writing" ref={writingRef}>
        <RichNoteContent doc={entry.noteDoc} fallback={entry.note} />
        <div className="journal-sticker-layer journal-sticker-origin" aria-hidden="true" />
      </div>
      {entry.copingStep && <p>Next: {entry.copingStep}</p>}
      {entry.factors?.length > 0 && <p>{entry.factors.join(', ')}</p>}
      {[['Meals', entry.meals], ['Water', entry.water], ['Sleep', entry.sleep]].filter(([, value]) => value).map(([label, value]) => <p key={label}>{label}: {value}</p>)}
      {tags.length > 0 && <p className="book-entry-tags">{tags.join(' / ')}</p>}
      {stickers.length > 0 && <StickerLayer placements={stickers} legacyRegions={{ details: introRef, writing: writingRef }} />}
    </div>
    <Link className="bound-entry-edit" to={`/entries?entry=${encodeURIComponent(entry.id)}`}>Open this entry <ArrowRight size={14} /></Link>
  </section>;
}

function Keepsake({ item }) {
  if (item.kind === 'constellation') return <figure className="book-sky-sticker"><span className="sky-decal"><ConstellationDecal constellation={item} /></span><figcaption><strong>{item.name || 'A little sky'}</strong><small>{dayLabel(item.dateKey)}</small></figcaption></figure>;
  if (item.kind === 'colors') return <figure className="book-margin-note book-map-note"><figcaption>Mood Colors</figcaption><div className="book-color-map" role="img" aria-label="Saved 35-cell color map">{item.tiles.map((tile, index) => <span key={index} style={{ background: moodColors.find((color) => color.key === tile)?.color || 'transparent' }} />)}</div>{item.note && <p>{item.note}</p>}</figure>;
  if (item.kind === 'orbit') {
    const radii = { close: 17, between: 30, far: 43 };
    return <figure className="book-margin-note book-orbit-note"><figcaption>Mood Orbit</figcaption><div className="book-orbit" role="img" aria-label="Saved mood orbit arrangement">{Object.values(radii).map((radius) => <i key={radius} style={{ width: `${radius * 2}%`, height: `${radius * 2}%` }} />)}<img className="book-orbit-center" src={orbitCenterArtwork} alt="" />{item.planets.map((planet, i) => orbitArtwork[planet.name] && <img key={i} src={orbitArtwork[planet.name].image} alt="" style={{ left: `${50 + Math.cos(planet.angle * Math.PI / 180) * radii[planet.orbit]}%`, top: `${50 + Math.sin(planet.angle * Math.PI / 180) * radii[planet.orbit]}%` }} />)}</div><p className="book-orbit-labels">{item.planets.map((planet) => `${orbitArtwork[planet.name]?.label || planet.name}: ${planet.orbit}`).join('; ')}</p>{item.reflection && <p>{item.reflection}</p>}</figure>;
  }
  return <blockquote className="book-margin-note"><strong>{item.kind === 'memory' ? 'Memory Jar' : item.kind === 'wonders' ? 'Small Wonders' : item.title}</strong>{item.kind === 'wonders' ? <><p>{countLabel(item.finds.length, 'small wonder')} noticed.</p>{item.finds.length > 0 && <p>{item.finds.join(', ')}</p>}</> : <p>{item.text}</p>}</blockquote>;
}
