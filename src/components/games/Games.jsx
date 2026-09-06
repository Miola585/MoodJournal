import { useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Flower2, Heart, Orbit, Sparkles } from 'lucide-react';
import { ConstellationGame } from './ConstellationGame';
import { EmotionalMatchGame } from './EmotionalMatchGame';
import { MemoryJarGame } from './MemoryJarGame';
import { MoodGardenGame } from './MoodGardenGame';
import { NightSkyGalaxy } from './NightSkyGame';
import { OrbitGame } from './OrbitGame';
import {
  gameLabels,
  rotatingGames
} from './gameUtils';

const gameRouteCopy = {
  match: 'Match feelings with gentle support.',
  constellation: 'Connect a few stars into a shape that feels like today.',
  garden: 'See today\'s mood shape a quiet garden.',
  memory: 'Save small moments and click a marble to revisit them.',
  orbit: 'Place what feels close, far, or in between today.'
};

const gameLibraryDetails = {
  match: {
    Icon: Heart,
    eyebrow: 'Match cards',
    description: 'Pair feelings with small supports.'
  },
  constellation: {
    Icon: Sparkles,
    eyebrow: 'Draw a sky',
    description: 'Make a one-day constellation.'
  },
  garden: {
    Icon: Flower2,
    eyebrow: 'Tend a mood',
    description: 'Watch a check-in become a garden.'
  },
  memory: {
    Icon: Archive,
    eyebrow: 'Save a moment',
    description: 'Drop tiny good things into a jar.'
  },
  orbit: {
    Icon: Orbit,
    eyebrow: 'Map closeness',
    description: 'Place what feels near or far.'
  }
};

export function Games({ nav, entries, moods, todayKey, getPrimaryEntry, groupEntriesByDate }) {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const dayNumber = Math.floor(new Date(todayKey()).getTime() / 86400000);
  const featuredGame = rotatingGames[dayNumber % rotatingGames.length];
  const selectedGame = rotatingGames.includes(gameId) ? gameId : null;

  if (selectedGame) {
    return (
      <section className={`screen app-screen games-screen standalone-game-screen standalone-game-screen-${selectedGame}`}>
        {nav}
        <header className="game-route-header">
          <button className="secondary back-to-games" onClick={() => navigate('/games')} type="button">
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.4} />
            <span>Back to games</span>
          </button>
          <div>
            <h1>{gameLabels[selectedGame]}</h1>
            <p>{gameRouteCopy[selectedGame]}</p>
          </div>
        </header>
        <GameStage
          game={selectedGame}
          entries={entries}
          moods={moods}
          todayKey={todayKey}
          getPrimaryEntry={getPrimaryEntry}
        />
      </section>
    );
  }

  return (
    <section className="screen app-screen games-screen games-hub-screen">
      <header className="games-hub-header">
        <h1>Games</h1>
        <p>Small reflection spaces for when you want to reset, notice, or make something gentle.</p>
      </header>
      {nav}
      <GameLauncher openGame={(game) => navigate(`/games/${game}`)} featuredGame={featuredGame} />
      <NightSkyGalaxy entries={entries} moods={moods} groupEntriesByDate={groupEntriesByDate} getPrimaryEntry={getPrimaryEntry} />
    </section>
  );
}

function GameLauncher({ openGame, featuredGame }) {
  return (
    <section className="game-launcher">
      <div className="game-library-heading">
        <span>Choose a small reset</span>
        <h2>Game Library</h2>
      </div>
      <div className="game-card-grid">
        {rotatingGames.map((game) => {
          const { Icon, eyebrow, description } = gameLibraryDetails[game];
          return (
            <button
              className={game === featuredGame ? 'game-library-card featured' : 'game-library-card'}
              key={game}
              onClick={() => openGame(game)}
              type="button"
            >
              <span className="game-card-icon"><Icon aria-hidden="true" size={22} strokeWidth={2.4} /></span>
              <span className="game-card-copy">
                <span>{game === featuredGame ? 'Featured today' : eyebrow}</span>
                <strong>{gameLabels[game]}</strong>
                <small>{description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GameStage({ game, entries, moods, todayKey, getPrimaryEntry }) {
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = moods.find((item) => item.key === mainToday?.mood) || moods[0];

  return (
    <section className={`game-route-shell game-page game-page-${game}`} aria-label={`${gameLabels[game]} game`}>
      <FeaturedGame game={game} mood={mood} mainToday={mainToday} todayEntries={todayEntries} />
    </section>
  );
}

function FeaturedGame({ game, mood, mainToday, todayEntries }) {
  const games = {
    match: <EmotionalMatchGame />,
    constellation: <ConstellationGame mood={mood} />,
    garden: <MoodGardenGame mood={mood} mainToday={mainToday} todayEntries={todayEntries} />,
    memory: <MemoryJarGame mood={mood} mainToday={mainToday} />,
    orbit: <OrbitGame />
  };
  return games[game] || games.match;
}
