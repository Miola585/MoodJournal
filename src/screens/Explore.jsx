import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, MoonStar, Sticker } from 'lucide-react';
import { DestinationArt } from '../components/layout/DestinationArt';
import { availableGames, gameLabels } from '../components/games/gameUtils';
import { viewPaths } from '../data/journalData';
import { moodColors } from '../utils/moodColors';
import { confirmJournalNavigation } from '../hooks/useJournalDraft';

const games = [
  { id: 'garden', art: 'garden', description: 'A little space to grow.' },
  { id: 'memory', art: 'jar', description: 'Keep the small, good things.' },
  { id: 'orbit', art: 'orbit', description: 'Notice what feels near and far.' }
];
const pauses = [
  { id: 'breathing', title: 'Breathe', label: 'Breathing', art: 'breathe', description: 'Follow one slow round.', path: '/activities?tool=breathing' },
  { id: 'senses', title: 'Five senses', label: '5-4-3-2-1 Senses', art: 'senses', description: "Notice what's around you.", path: '/activities?tool=senses' },
  { id: 'colors', title: 'Mood Colors', label: 'Mood Colors', description: 'Let a color say it.', path: viewPaths.moodColors },
  { id: 'scavenger', title: 'Scavenger hunt', label: 'Scavenger hunt', art: 'wonders', description: 'Find a few small wonders.', path: '/activities?tool=scavenger' }
];

export function Explore() {
  const navigate = useNavigate();
  const open = (path) => {
    if (confirmJournalNavigation()) navigate(path);
  };

  return (
    <section className="screen app-screen explore-screen" aria-labelledby="explore-title">
      <header className="explore-heading"><p className="app-eyebrow">Little breaks</p><h1 id="explore-title">Wander somewhere gentle.</h1></header>

      <section className="explore-feature" aria-labelledby="explore-feature-title">
        <div className="explore-feature-art"><DestinationArt kind="sky" /></div>
        <div className="explore-feature-copy">
          <span className="explore-eyebrow">A small universe, all your own</span>
          <h2 id="explore-feature-title">{gameLabels.constellation}</h2>
          <p>Draw a shape for today.</p>
          <button className="explore-primary" type="button" onClick={() => open('/games/constellation')}>
            Make a constellation <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="explore-section" aria-labelledby="explore-games-title">
        <p className="app-eyebrow">Places to return to</p><h2 id="explore-games-title">Your world, a little at a time.</h2>
        <div className="explore-games">
          {games.map(({ id, art, description }) => {
            const unavailable = !availableGames.includes(id);
            return <button className="explore-game" key={id} type="button" disabled={unavailable}
              aria-label={`${gameLabels[id]}${unavailable ? ' - Coming soon' : ''}`} onClick={() => open(`/games/${id}`)}>
              <span className={`explore-game-art explore-game-art-${id}`}><DestinationArt kind={art} /></span>
              <span className="explore-game-caption">
                <span className="explore-game-name"><strong>{gameLabels[id]}</strong>{!unavailable && <ArrowRight size={18} aria-hidden="true" />}</span>
                <span className="explore-game-action">{unavailable ? 'Coming soon' : description}</span>
              </span>
            </button>;
          })}
        </div>
        <div className="explore-world-links">
        <button className="explore-match-link" type="button" aria-label="Personal Night Sky" onClick={() => open('/games/night-sky')}>
          <MoonStar size={22} aria-hidden="true" /><span>Personal Night Sky</span><ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="explore-match-link" type="button" aria-label="Emotional Match" onClick={() => open('/games/match')}>
          <Heart size={22} aria-hidden="true" /><span>{gameLabels.match}</span><ArrowRight size={18} aria-hidden="true" />
        </button>
        </div>
      </section>

      <section className="explore-section" aria-labelledby="explore-pauses-title">
        <p className="app-eyebrow">Come back to yourself</p><h2 id="explore-pauses-title">A small pause can be enough.</h2>
        <div className="explore-pauses">
          {pauses.map(({ id, title, label, art, description, path }) => <button className={`explore-pause explore-pause-${id}`} key={id} type="button" aria-label={label} onClick={() => open(path)}>
            <span className="explore-pause-art" aria-hidden="true">{art ? <DestinationArt kind={art} compact /> : <span className="explore-color-tiles">{moodColors.map(({ key, color }) => <i key={key} style={{ background: color }} />)}</span>}</span>
            <span className="explore-pause-copy"><strong>{title}</strong><small>{description}</small></span><ArrowRight size={18} aria-hidden="true" />
          </button>)}
        </div>
      </section>

      <button className="explore-stickers-link" type="button" aria-label="Your sticker collection" onClick={() => open(viewPaths.stickers)}><Sticker size={22} aria-hidden="true" /><span><strong>A little play belongs on the page.</strong><small>Explore your sticker collection.</small></span><ArrowRight size={18} aria-hidden="true" /></button>
    </section>
  );
}
