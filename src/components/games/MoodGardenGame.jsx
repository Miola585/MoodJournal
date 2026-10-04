import { useMemo, useState } from 'react';
import { todayKey } from '../../utils/journalUtils';

const gardenSprites = [
  new URL('../../../img/1111x_PixelPlants/MoodGarden_Selected/00_Shared_Growth_Stages/growth-01-sprout.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/MoodGarden_Selected/01_Low_Intensity/low-04-daisy.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/MoodGarden_Selected/02_Medium_Intensity/medium-03-sunflower-pair.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/MoodGarden_Selected/04_Neutral_Foliage/foliage-04-broad.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/MoodGarden_Selected/03_High_Intensity/high-04-daisy-cluster.png', import.meta.url).href
];

const weatherByMood = {
  Happy: 'sunny',
  Content: 'steady',
  Excited: 'sparkly',
  Calm: 'breezy',
  Anxious: 'windy',
  Sad: 'rainy',
  Angry: 'warm',
  Lonely: 'resting',
  Grateful: 'sunny',
  Tired: 'cloudy',
  Overwhelmed: 'windy',
  Panic: 'windy',
  Numb: 'resting'
};

export function MoodGardenGame({ mood, mainToday, todayEntries = [] }) {
  const today = todayKey();
  const storageKey = `gardenTendedToday:${today}`;
  const hasCheckIn = Boolean(mainToday?.mood);
  const intensity = Number(mainToday?.intensity || mood.score || 5);
  const growthSignal = Math.max(1, Math.min(5, Math.ceil(intensity / 2)));
  const weather = hasCheckIn ? weatherByMood[mood.key] || 'steady' : 'resting';
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [tended, setTended] = useState(() => localStorage.getItem(storageKey) === 'true');

  const plants = useMemo(() => {
    if (!hasCheckIn) {
      return [{
        id: 'starter-sprout',
        mood: 'Starter sprout',
        signal: 'resting',
        from: 'complete a check-in',
        sprite: gardenSprites[3],
        delay: 0,
        size: 0.78
      }];
    }

    const baseCount = Math.max(2, Math.min(10, mood.score || 5));
    return Array.from({ length: baseCount }, (_, index) => ({
      id: `${mood.key}-${index}`,
      mood: mood.key,
      signal: `growth ${growthSignal}/5`,
      from: mainToday ? 'today\'s check-in' : 'today',
      sprite: gardenSprites[index % gardenSprites.length],
      delay: index * 0.08,
      size: 0.82 + (index % 4) * 0.08,
      tilt: weather === 'windy' ? (index % 2 === 0 ? -5 : 5) : 0
    }));
  }, [growthSignal, hasCheckIn, mainToday, mood.key, mood.score, weather]);

  const extraMoments = Math.max(0, todayEntries.length - plants.length);
  const activePlant = selectedPlant || plants[0];

  const tendGarden = () => {
    setTended(true);
    localStorage.setItem(storageKey, 'true');
  };

  return (
    <div className={`game-surface garden-surface garden-mood-${weather} ${tended ? 'garden-tended' : ''}`}>
      <p className="game-instruction">Your current mood shapes the garden weather and growth stage.</p>
      <div className={`garden-preview garden-weather-${weather}`} style={{ '--garden-color': mood.color }}>
        {!hasCheckIn && <p className="garden-empty-note">Complete a check-in to grow today's garden.</p>}
        <div className="garden-sky-detail" aria-hidden="true" />
        <div className="garden-ground-line" aria-hidden="true" />
        {plants.map((plant, index) => (
          <button
            aria-label={`Garden plant for ${plant.mood}`}
            className={activePlant.id === plant.id ? 'garden-plant selected' : 'garden-plant'}
            key={plant.id}
            onClick={() => setSelectedPlant(plant)}
            style={{
              '--plant-delay': `${plant.delay}s`,
              '--plant-left': `${12 + (index * 76) / Math.max(plants.length - 1, 1)}%`,
              '--plant-bottom': `${16 + (index % 3) * 2.4}%`,
              '--plant-size': plant.size,
              '--plant-tilt': `${plant.tilt || 0}deg`
            }}
            type="button"
          >
            <img alt="" src={plant.sprite} />
            <span>{plant.signal}</span>
          </button>
        ))}
        {tended && <div className="garden-sparkles" aria-hidden="true" />}
      </div>
      <div className="garden-control-row">
        <button className="primary" onClick={tendGarden} type="button">{tended ? 'Tended today' : 'Tend garden'}</button>
        <div className="meta garden-meta">
          <span>{hasCheckIn ? mood.key : 'starter'}</span>
          <span>{weather}</span>
          <span>{hasCheckIn ? `growth ${growthSignal}/5` : 'resting'}</span>
          {extraMoments > 0 && <span>+{extraMoments} more moments</span>}
        </div>
      </div>
      <article className="garden-detail-panel">
        <p><strong>Mood:</strong> {activePlant.mood}</p>
        <p><strong>Signal:</strong> {activePlant.signal}</p>
        <p><strong>From:</strong> {activePlant.from}</p>
      </article>
    </div>
  );
}
