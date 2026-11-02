import { getGalaxyStarShape, getStarColor } from './gameUtils';
import { ArrowRight } from 'lucide-react';
import { stickerById } from '../../data/stickers';

export function getJournalStars(entries, moods, groupEntriesByDate, getPrimaryEntry) {
  const grouped = groupEntriesByDate(entries);
  return Object.entries(grouped).map(([dateKey, dayEntries], index) => {
    const entry = getPrimaryEntry(dayEntries);
    const mood = moods.find((item) => item.key === entry?.mood) || moods[0];
    const intensity = Number(entry?.intensity || mood.score || 5);
    const shape = getGalaxyStarShape(intensity);
    return {
      id: dateKey,
      entryId: entry?.id,
      dateKey,
      mood,
      intensity,
      shape,
      starColor: getStarColor(mood, intensity),
      x: 8 + ((index * 23) % 84),
      y: 10 + ((index * 37) % 78)
    };
  });
}

export function NightSkyGalaxy({ entries, moods, groupEntriesByDate, getPrimaryEntry, onStart }) {
  const stars = getJournalStars(entries, moods, groupEntriesByDate, getPrimaryEntry);
  return (
    <section className="galaxy-section">
      <div>
        <h2>Personal Night Sky</h2>
        {stars.length > 0 && <p>Your saved journal days, gathered as stars.</p>}
      </div>
      <div className={`galaxy-map${stars.length === 0 ? ' galaxy-map--empty' : ''}`}>
        {stars.length === 0 && (
          <div className="galaxy-empty">
            <img className="galaxy-empty-art" src={stickerById.get('night-twinkle').image} alt="" />
            <h3>Your first star is waiting</h3>
            <button className="primary" onClick={onStart} type="button">
              Start writing <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        )}
        {stars.map((star) => (
          <svg
            aria-label={`${star.dateKey}: ${star.mood.key}, intensity ${star.intensity} of 10, ${star.shape.points}-point star`}
            className="galaxy-star"
            key={star.id}
            role="img"
            style={{ '--star-x': `${star.x}%`, '--star-y': `${star.y}%`, '--star-size': `${10 + star.intensity * 2}px`, '--star-color': star.starColor }}
            viewBox="0 0 100 100"
          >
            <polygon className="galaxy-star-glow" points={star.shape.polygon} />
            <polygon className="galaxy-star-core" points={star.shape.polygon} />
          </svg>
        ))}
      </div>
    </section>
  );
}

export function NightSkyGame({ mood, mainToday }) {
  const brightness = Math.max(2, Math.min(10, Number(mainToday?.intensity || mood.score || 5)));
  const starColor = getStarColor(mood, brightness);
  return (
    <article className="minigame-card">
      <h3>Featured: Night Sky Reflection</h3>
      <p>Add today's star to your personal emotional galaxy.</p>
      <div className="night-sky">
        <span style={{ '--star-brightness': brightness / 10, '--star-color': starColor }} />
      </div>
    </article>
  );
}
