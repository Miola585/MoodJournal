import { getStarColor } from './gameUtils';

export function NightSkyGalaxy({ entries, moods, groupEntriesByDate, getPrimaryEntry }) {
  const grouped = groupEntriesByDate(entries);
  const stars = Object.entries(grouped).map(([dateKey, dayEntries], index) => {
    const entry = getPrimaryEntry(dayEntries);
    const mood = moods.find((item) => item.key === entry?.mood) || moods[0];
    const intensity = Number(entry?.intensity || mood.score || 5);
    return {
      id: dateKey,
      dateKey,
      mood,
      intensity,
      starColor: getStarColor(mood, intensity),
      x: 8 + ((index * 23) % 84),
      y: 10 + ((index * 37) % 78)
    };
  });
  return (
    <section className="galaxy-section">
      <div>
        <span className="galaxy-eyebrow">Journal view</span>
        <h2>Personal Night Sky</h2>
        <p>Your saved journal days become stars here. Daily Constellation is a separate drawing game.</p>
      </div>
      <div className="galaxy-map">
        {stars.length === 0 && <p>Add journal entries to begin your sky.</p>}
        {stars.map((star) => (
          <span
            className="galaxy-star"
            key={star.id}
            style={{ '--star-x': `${star.x}%`, '--star-y': `${star.y}%`, '--star-size': `${10 + star.intensity * 2}px`, '--star-color': star.starColor }}
            title={`${star.dateKey}: ${star.mood.key}`}
          />
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
