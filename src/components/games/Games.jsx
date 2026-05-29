import { useState } from 'react';
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
  scavengerSets
} from './gameUtils';

export function Games({ nav, entries, onSave, moods, createEntry, todayKey, getPrimaryEntry, groupEntriesByDate }) {
  const gameEntries = entries.filter((entry) => (entry.tags || []).includes('game'));
  return (
    <section className="screen app-screen games-screen">
      <h1>Games</h1>
      {nav}
      <MiniGames entries={entries} onSave={onSave} moods={moods} createEntry={createEntry} todayKey={todayKey} getPrimaryEntry={getPrimaryEntry} />
      <NightSkyGalaxy entries={entries} moods={moods} groupEntriesByDate={groupEntriesByDate} getPrimaryEntry={getPrimaryEntry} />
      <div className="collection-grid">
        <ConstellationGallery entries={gameEntries} moods={moods} />
        <MemoryJarCollection entries={gameEntries} moods={moods} />
      </div>
    </section>
  );
}

function MiniGames({ entries, onSave, moods, createEntry, todayKey, getPrimaryEntry }) {
  const dayNumber = Math.floor(new Date(todayKey()).getTime() / 86400000);
  const huntItems = scavengerSets[dayNumber % scavengerSets.length];
  const featuredGame = rotatingGames[dayNumber % rotatingGames.length];
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = moods.find((item) => item.key === mainToday?.mood) || moods[0];
  const [huntDone, setHuntDone] = useState([]);
  const [bubbleRunning, setBubbleRunning] = useState(false);
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
  const toggleHuntItem = (item) => {
    setHuntDone((current) => (
      current.includes(item) ? current.filter((doneItem) => doneItem !== item) : [...current, item]
    ));
  };

  return (
    <section className="minigames-section" id="minigames">
      <h2>Mini Games</h2>
      <p className="recommendation-note">Breathing and scavenger hunt stay available every day. The featured game changes daily.</p>
      <div className="minigame-grid daily-games">
        <article className="minigame-card breathing-game">
          <h3>Breathing Bubble</h3>
          <p>Follow the bubble as it grows and settles.</p>
          <div className={bubbleRunning ? 'breathing-bubble active' : 'breathing-bubble'} />
          <button onClick={() => setBubbleRunning(!bubbleRunning)} type="button">{bubbleRunning ? 'Pause' : 'Start'}</button>
        </article>
        <article className="minigame-card">
          <h3>Daily Scavenger Hunt</h3>
          <p>Use your space to ground yourself for a minute.</p>
          <div className="hunt-list">
            {huntItems.map((item) => (
              <label key={item}>
                <input checked={huntDone.includes(item)} onChange={() => toggleHuntItem(item)} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          <button disabled={huntDone.length === 0} onClick={() => setHuntDone([])} type="button">Clear finds</button>
        </article>
      </div>
      <section className="featured-game-section">
        <div>
          <h2>Featured Today: {gameLabels[featuredGame]}</h2>
          <p>One rotating reflection game keeps the page focused.</p>
        </div>
        <FeaturedGame game={featuredGame} mood={mood} mainToday={mainToday} entries={entries} moods={moods} todayKey={todayKey} onSave={saveGameEntry} />
      </section>
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
