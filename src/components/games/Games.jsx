import { useNavigate, useParams } from 'react-router-dom';
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

export function Games({ nav, entries, moods, todayKey, getPrimaryEntry, groupEntriesByDate }) {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const dayNumber = Math.floor(new Date(todayKey()).getTime() / 86400000);
  const featuredGame = rotatingGames[dayNumber % rotatingGames.length];
  const selectedGame = rotatingGames.includes(gameId) ? gameId : null;
  if (selectedGame) {
    return (
      <section className="screen app-screen games-screen standalone-game-screen">
        <h1>{gameLabels[selectedGame]}</h1>
        {nav}
        <button className="header-button back-to-games" onClick={() => navigate('/games')} type="button">Back to games</button>
        <GameStage
          game={selectedGame}
          entries={entries}
          moods={moods}
          todayKey={todayKey}
          getPrimaryEntry={getPrimaryEntry}
          featuredGame={featuredGame}
        />
      </section>
    );
  }
  return (
    <section className="screen app-screen games-screen">
      <h1>Games</h1>
      {nav}
      <FeaturedGameCard featuredGame={featuredGame} openGame={(game) => navigate(`/games/${game}`)} />
      <GameLauncher openGame={(game) => navigate(`/games/${game}`)} featuredGame={featuredGame} />
      <NightSkyGalaxy entries={entries} moods={moods} groupEntriesByDate={groupEntriesByDate} getPrimaryEntry={getPrimaryEntry} />
    </section>
  );
}

function FeaturedGameCard({ featuredGame, openGame }) {
  return (
    <section className="featured-game-card">
      <div>
        <span>Featured Today</span>
        <h2>{gameLabels[featuredGame]}</h2>
        <p>Open today's rotating reflection game, or choose another game below.</p>
      </div>
      <button className="primary" onClick={() => openGame(featuredGame)} type="button">Open featured game</button>
    </section>
  );
}

function GameLauncher({ openGame, featuredGame }) {
  return (
    <section className="minigames-section game-launcher">
      <h2>Game Library</h2>
      <p className="recommendation-note">Each game opens as its own page so it has room to breathe.</p>
      <div className="game-button-grid">
        {rotatingGames.map((game) => (
          <button
            className={game === featuredGame ? 'game-select active' : 'game-select'}
            key={game}
            onClick={() => openGame(game)}
            type="button"
          >
            {game === featuredGame ? 'Featured: ' : ''}{gameLabels[game]}
          </button>
        ))}
      </div>
    </section>
  );
}

function GameStage({ game, entries, moods, todayKey, getPrimaryEntry, featuredGame }) {
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = moods.find((item) => item.key === mainToday?.mood) || moods[0];

  return (
    <section className={`standalone-game-panel game-page game-page-${game}`}>
      <div>
        <h2>{gameLabels[game]}</h2>
        <p>{game === featuredGame ? 'This is today’s rotating reflection game.' : 'This game is available whenever you want to revisit it.'}</p>
      </div>
      <FeaturedGame game={game} mood={mood} mainToday={mainToday} />
    </section>
  );
}

function FeaturedGame({ game, mood, mainToday }) {
  const games = {
    match: <EmotionalMatchGame />,
    constellation: <ConstellationGame mood={mood} />,
    garden: <MoodGardenGame mood={mood} mainToday={mainToday} />,
    memory: <MemoryJarGame mood={mood} mainToday={mainToday} />,
    orbit: <OrbitGame />
  };
  return games[game] || games.match;
}
