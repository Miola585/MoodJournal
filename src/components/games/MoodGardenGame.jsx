import { useEffect, useMemo, useState } from 'react';
import { todayKey } from '../../utils/journalUtils';
import { gardenArtwork } from './gameArtwork';

const gardenSprites = [
  gardenArtwork.growth.sprout,
  { label: 'Daisy', image: gardenArtwork.flowers.daisy.low },
  { label: 'Sunflowers', image: gardenArtwork.flowers.sunflower.medium },
  gardenArtwork.foliage,
  { label: 'Daisy cluster', image: gardenArtwork.flowers.daisy.high }
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

export function MoodGardenGame({ mood, mainToday, todayEntries = [], privateStorage }) {
  const today = todayKey();
  // The old unscoped flag has no known owner, so do not adopt it into an account.
  const storageKey = `gardenCare:${today}`;
  const hasCheckIn = Boolean(mainToday?.mood);
  const intensity = Number(mainToday?.intensity || mood.score || 5);
  const growthSignal = Math.max(1, Math.min(5, Math.ceil(intensity / 2)));
  const weather = hasCheckIn ? weatherByMood[mood.key] || 'steady' : 'resting';
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [careState, setCareState] = useState(null);
  const care = careState?.storage === privateStorage && careState.key === storageKey
    ? careState : { tended: false, pending: true, error: '' };
  const tended = care.tended;

  useEffect(() => {
    let active = true;
    const initial = { storage: privateStorage, key: storageKey, tended: false, pending: true, error: '' };
    setCareState(initial);
    privateStorage.read(storageKey, false)
      .then((value) => { if (active) setCareState({ ...initial, tended: value === true, pending: false }); })
      .catch((error) => { if (active) setCareState({ ...initial, pending: false, error: error.message }); });
    return () => { active = false; };
  }, [privateStorage, storageKey]);

  const plants = useMemo(() => {
    if (!hasCheckIn) {
      return [{
        id: 'starter-sprout',
        mood: 'Starter sprout',
        signal: 'resting',
        from: 'complete a check-in',
        sprite: gardenSprites[0],
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
  const activePlant = plants.find((plant) => plant.id === selectedPlantId) || plants[0];

  const tendGarden = async () => {
    if (care.pending || tended) return;
    const updateCare = (change) => setCareState((current) => (
      current?.storage === privateStorage && current.key === storageKey ? { ...current, ...change } : current
    ));
    updateCare({ pending: true, error: '' });
    try {
      await privateStorage.write(storageKey, true);
      updateCare({ tended: true, pending: false });
    } catch (error) {
      updateCare({ pending: false, error: error.message });
    }
  };

  return (
    <div className={`game-surface garden-surface garden-mood-${weather} ${tended ? 'garden-tended' : ''}`}>
      <div className={`garden-preview garden-weather-${weather}`} style={{ '--garden-color': mood.color }}>
        <div className="garden-hill garden-hill-back" aria-hidden="true" />
        <div className="garden-hill garden-hill-middle" aria-hidden="true" />
        <div className="garden-hill garden-hill-front" aria-hidden="true" />
        <div className="garden-sky-detail" aria-hidden="true" />
        <div className="garden-scene-intro">
          <span className="garden-kicker">A little space to grow</span>
          <h1>Your pocket garden.</h1>
          <p>Some days we bloom. Some days we simply take root. Both belong here.</p>
          <div className="garden-today"><span>Today feels</span><strong>{hasCheckIn ? mood.key : 'Open'}</strong><span>{hasCheckIn ? `Growth ${growthSignal}/5` : 'A fresh start'}</span></div>
        </div>
        {plants.map((plant, index) => (
          <button
            aria-label={`${plant.sprite.label}, ${plant.mood}`}
            className={activePlant.id === plant.id ? 'garden-plant selected' : 'garden-plant'}
            key={plant.id}
            onClick={() => setSelectedPlantId(plant.id)}
            style={{
              '--plant-delay': `${plant.delay}s`,
              '--plant-left': plants.length === 1 ? '50%' : `${12 + (index * 76) / (plants.length - 1)}%`,
              '--plant-bottom': `${29 + (index % 3) * 2.4}%`,
              '--plant-size': plant.size,
              '--plant-tilt': `${plant.tilt || 0}deg`
            }}
            type="button"
          >
            <img alt="" src={plant.sprite.image} />
            <span>{plant.signal}</span>
          </button>
        ))}
        {tended && <div className="garden-sparkles" aria-hidden="true" />}
        <div className="garden-moment-panel">
          <div className="garden-moment-main">
            <img alt="" src={activePlant.sprite.image} />
            <div>
              <span>Today's little moment</span>
              <h2>{activePlant.sprite.label}</h2>
              <p>{hasCheckIn ? `${mood.key} · ${weather} · ${activePlant.signal}` : 'A place to begin'}</p>
            </div>
          </div>
          <div className="garden-moment-footer">
            <span>{tended ? 'A little care, given.' : hasCheckIn ? `From ${activePlant.from}${extraMoments ? ` · ${extraMoments} more moments` : ''}` : 'Your garden is ready when you are.'}</span>
            <button className="primary" disabled={tended || care.pending} aria-busy={care.pending} onClick={tendGarden} type="button">{tended ? 'Tended today' : 'Tend garden'}</button>
          </div>
          {care.error && <p className="form-error" role="alert">{care.error}</p>}
        </div>
      </div>
    </div>
  );
}
