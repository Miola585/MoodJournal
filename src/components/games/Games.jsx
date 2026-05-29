import { useNavigate, useParams } from 'react-router-dom';
import { ConstellationGallery, ConstellationGame } from './ConstellationGame';
import { EmotionalMatchGame } from './EmotionalMatchGame';
import { MemoryJarCollection, MemoryJarGame } from './MemoryJarGame';
import { MoodGardenGame } from './MoodGardenGame';
import { NightSkyGalaxy, NightSkyGame } from './NightSkyGame';
import { OrbitGame } from './OrbitGame';
import {
  detectMemoryCategory,
  detectMemoryRarity,
  formatGameNote,
  gameLabels,
  rotatingGames,
  stripGameData
} from './gameUtils';

export function Games({ nav, entries, onSave, moods, createEntry, todayKey, getPrimaryEntry, groupEntriesByDate }) {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const gameEntries = entries.filter((entry) => (entry.tags || []).includes('game'));
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
          onSave={onSave}
          moods={moods}
          createEntry={createEntry}
          todayKey={todayKey}
          getPrimaryEntry={getPrimaryEntry}
          featuredGame={featuredGame}
        />
        {selectedGame === 'constellation' && <ConstellationGallery entries={gameEntries} moods={moods} />}
        {selectedGame === 'memory' && <MemoryJarCollection entries={gameEntries} moods={moods} />}
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
      <GameOutcomeHistory entries={gameEntries} />
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

function GameStage({ game, entries, onSave, moods, createEntry, todayKey, getPrimaryEntry, featuredGame }) {
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = moods.find((item) => item.key === mainToday?.mood) || moods[0];
  const saveGameEntry = (title, note, tags = [], payload = null) => {
    const intensity = Number(mainToday?.intensity || mood.score || 5);
    const enrichedPayload = payload ? {
      ...payload,
      category: payload.text ? payload.category || detectMemoryCategory(payload.text) : payload.category,
      rarity: payload.text ? payload.rarity || detectMemoryRarity({ text: payload.text, intensity, tags }) : payload.rarity,
      mood: mood.key,
      intensity,
      created: new Date().toISOString()
    } : null;
    return onSave({
      ...createEntry(),
      type: 'game',
      mood: mood.key,
      specificFeeling: mood.feelings[0],
      intensity,
      note: formatGameNote(title, note, enrichedPayload),
      tags: ['game', ...tags],
      copingStep: 'Reflect on what changed after this activity.'
    });
  };

  return (
    <section className={`standalone-game-panel game-page game-page-${game}`}>
      <div>
        <h2>{gameLabels[game]}</h2>
        <p>{game === featuredGame ? 'This is today’s rotating reflection game.' : 'This game is available whenever you want to revisit it.'}</p>
      </div>
      <FeaturedGame game={game} mood={mood} mainToday={mainToday} entries={entries} moods={moods} todayKey={todayKey} onSave={saveGameEntry} />
    </section>
  );
}

function FeaturedGame({ game, mood, mainToday, entries, moods, todayKey, onSave }) {
  const games = {
    match: <EmotionalMatchGame onSave={onSave} />,
    constellation: <ConstellationGame mood={mood} onSave={onSave} />,
    garden: <MoodGardenGame mood={mood} onSave={onSave} />,
    memory: <MemoryJarGame entries={entries} moods={moods} todayKey={todayKey} onSave={onSave} />,
    orbit: <OrbitGame onSave={onSave} />,
    night: <NightSkyGame mood={mood} mainToday={mainToday} onSave={onSave} />
  };
  return games[game] || games.match;
}

function GameOutcomeHistory({ entries }) {
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 6);
  return (
    <section className="collection-card game-history">
      <h2>Previous Game Outcomes</h2>
      {recentEntries.length === 0 ? <p>Saved game outcomes will show here after you save a game.</p> : <div className="game-history-list">
        {recentEntries.map((entry) => (
          <article className="game-history-card" key={entry.id}>
            <strong>{entry.mood} · {new Date(entry.created).toLocaleDateString()}</strong>
            <p>{stripGameData(entry.note)}</p>
            <div className="meta">
              {(entry.tags || []).filter((tag) => tag !== 'game').slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
        ))}
      </div>}
    </section>
  );
}
