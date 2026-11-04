import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Flower2, Heart, Orbit, Sparkles } from 'lucide-react';
import { ConstellationGame } from './ConstellationGame';
import { EmotionalMatchGame } from './EmotionalMatchGame';
import { MemoryJarGame } from './MemoryJarGame';
import { NightSkyGalaxy } from './NightSkyGame';
import { PersonalNightSky } from './PersonalNightSky';
import { OrbitGame } from './OrbitGame';
import { MemoryJarSvg } from './MemoryJarSvg';
import { PageHeader } from '../layout/PageHeader';
import { GamePageShell } from './GamePageShell';
import {
  availableGames,
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

const gameInstructions = {
  constellation: 'Drag between two stars, or tap one and then another. Use Tab and Enter to connect with a keyboard. Undo removes the last line. Name your shape and finish when it feels complete.',
  orbit: 'Drag a planet between distances, or select it and use the distance buttons. The numbered keys also move a focused planet. Distance shows presence, not importance. Reflect or finish to save your arrangement.'
};

const constellationIdeas = ['Make today\'s shape', 'Make a shelter', 'Make a path'];

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

export function Games({ nav, entries, moods, todayKey, getPrimaryEntry, groupEntriesByDate, privateStorage, reduceMotion }) {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const dayNumber = Math.floor(new Date(todayKey()).getTime() / 86400000);
  const featuredGame = availableGames[dayNumber % availableGames.length];
  const selectedGame = availableGames.includes(gameId) ? gameId : null;

  if (gameId === 'night-sky') return <PersonalNightSky entries={entries} moods={moods} groupEntriesByDate={groupEntriesByDate} getPrimaryEntry={getPrimaryEntry} />;
  if (gameId && !selectedGame) return <Navigate to="/games" replace />;

  if (selectedGame) {
    return (
      <section className={`screen app-screen games-screen standalone-game-screen standalone-game-screen-${selectedGame}`}>
        {nav}
        {gameInstructions[selectedGame] ? (
          <div className={`game-route-header immersive-route-header ${selectedGame === 'garden' ? 'garden-route-header' : ''}`}>
            <button className="secondary back-to-games" onClick={() => navigate('/games')} type="button">
              <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.4} />
              <span>Back to games</span>
            </button>
            <details className="game-how-to">
              <summary>How to play</summary>
              <p>{gameInstructions[selectedGame]}</p>
            </details>
            {selectedGame !== 'garden' && (
              <div className="immersive-game-intro">
                <h1>{gameLabels[selectedGame]}</h1>
                <p>{gameRouteCopy[selectedGame]}</p>
                {selectedGame === 'constellation' && (
                  <div className="constellation-prompt-chips" aria-label="Constellation shape ideas">
                    {constellationIdeas.map((idea) => <span key={idea}>{idea}</span>)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="game-route-header">
            <button className="secondary back-to-games" onClick={() => navigate(selectedGame === 'memory' ? '/explore' : '/games')} type="button">
              <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.4} />
              <span>{selectedGame === 'memory' ? 'Back to Little breaks' : 'Back to games'}</span>
            </button>
            <PageHeader align="center" title={gameLabels[selectedGame]} subtitle={selectedGame === 'memory' ? 'A few good things, kept.' : gameRouteCopy[selectedGame]} />
          </div>
        )}
        <GameStage
          game={selectedGame}
          entries={entries}
          moods={moods}
          todayKey={todayKey}
          getPrimaryEntry={getPrimaryEntry}
          reduceMotion={reduceMotion}
          privateStorage={privateStorage}
        />
      </section>
    );
  }

  return (
    <section className="screen app-screen games-screen games-hub-screen">
      <PageHeader align="center" title="Games" subtitle="Small ways to play and reflect." />
      {nav}
      <GameLauncher openGame={(game) => navigate(`/games/${game}`)} featuredGame={featuredGame} />
      <NightSkyGalaxy entries={entries} moods={moods} groupEntriesByDate={groupEntriesByDate} getPrimaryEntry={getPrimaryEntry} onStart={() => navigate('/entries')} />
    </section>
  );
}

function GameLauncher({ openGame, featuredGame }) {
  return (
    <section className="game-launcher">
      <div className="game-card-grid">
        {rotatingGames.map((game) => {
          const { Icon, description } = gameLibraryDetails[game];
          const comingSoon = !availableGames.includes(game);
          return (
            <button
              className={`game-library-card${game === featuredGame ? ' featured' : ''}${comingSoon ? ' coming-soon' : ''}`}
              disabled={comingSoon}
              key={game}
              onClick={() => openGame(game)}
              type="button"
            >
              <span className={`game-card-scene game-card-scene-${game}`} aria-hidden="true">{game === 'memory' ? <MemoryJarSvg /> : <Icon size={48} strokeWidth={1.6} />}</span>
              <span className="game-card-copy">
                {(comingSoon || game === featuredGame) && <span>{comingSoon ? 'Coming soon' : 'Today'}</span>}
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

function GameStage({ game, entries, moods, todayKey, getPrimaryEntry, privateStorage, reduceMotion }) {
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = moods.find((item) => item.key === mainToday?.mood) || moods[0];

  return (
    <GamePageShell game={game} label={gameLabels[game]}>
      <FeaturedGame game={game} mood={mood} mainToday={mainToday} privateStorage={privateStorage} reduceMotion={reduceMotion} />
    </GamePageShell>
  );
}

function FeaturedGame({ game, mood, mainToday, privateStorage, reduceMotion }) {
  const games = {
    match: <EmotionalMatchGame />,
    constellation: <ConstellationGame mood={mood} privateStorage={privateStorage} />,
    memory: <MemoryJarGame mood={mood} mainToday={mainToday} privateStorage={privateStorage} reduceMotion={reduceMotion} />,
    orbit: <OrbitGame privateStorage={privateStorage} />
  };
  return games[game] || games.match;
}
