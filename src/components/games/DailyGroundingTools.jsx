import { CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { scavengerSets } from './gameUtils';

const breathingPhases = ['Breathe in', 'Hold', 'Breathe out', 'Rest'];
const groundingSteps = [
  '5 things you can see',
  '4 things you can feel',
  '3 things you can hear',
  '2 things you can smell',
  '1 slow breath'
];

export function DailyGroundingTools({ todayKey }) {
  const today = todayKey();
  const dayNumber = Math.floor(new Date(today).getTime() / 86400000);
  const huntItems = scavengerSets[dayNumber % scavengerSets.length];
  const huntStorageKey = `groundingHunt:${today}`;
  const sensesStorageKey = `grounding54321:${today}`;
  const [huntDone, setHuntDone] = useState(() => readStoredList(huntStorageKey));
  const [sensesDone, setSensesDone] = useState(() => readStoredList(sensesStorageKey));
  const [bubbleRunning, setBubbleRunning] = useState(false);
  const [bubbleStarted, setBubbleStarted] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (!bubbleRunning) return undefined;
    const timer = setInterval(() => {
      setPhaseIndex((current) => (current + 1) % breathingPhases.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [bubbleRunning]);

  useEffect(() => {
    localStorage.setItem(huntStorageKey, JSON.stringify(huntDone));
  }, [huntDone, huntStorageKey]);

  useEffect(() => {
    localStorage.setItem(sensesStorageKey, JSON.stringify(sensesDone));
  }, [sensesDone, sensesStorageKey]);

  const huntProgress = `${huntDone.length}/${huntItems.length} found`;
  const huntComplete = huntDone.length === huntItems.length;
  const sensesComplete = sensesDone.length === groundingSteps.length;
  const breathingLabel = bubbleStarted ? breathingPhases[phaseIndex] : 'Ready when you are';

  const toggleHuntItem = (item) => {
    setHuntDone((current) => (
      current.includes(item) ? current.filter((doneItem) => doneItem !== item) : [...current, item]
    ));
  };

  const toggleSensesStep = (item) => {
    setSensesDone((current) => (
      current.includes(item) ? current.filter((doneItem) => doneItem !== item) : [...current, item]
    ));
  };

  const startBubble = () => {
    setBubbleStarted(true);
    setBubbleRunning(true);
  };

  const resetBubble = () => {
    setBubbleRunning(false);
    setBubbleStarted(false);
    setPhaseIndex(0);
  };

  return (
    <section className="minigames-section grounding-tools" id="grounding-tools">
      <h2>Quick Grounding Tools</h2>
      <p className="recommendation-note">Use these when you want a quick reset without writing a full entry.</p>
      <div className="minigame-grid daily-games">
        <article className="minigame-card breathing-game">
          <div className="grounding-card-head">
            <h3>Breathing Bubble</h3>
            <span>{breathingLabel}</span>
          </div>
          <p>Follow the bubble for one slow round.</p>
          <div className={bubbleRunning ? `breathing-bubble active phase-${phaseIndex}` : 'breathing-bubble'}>
            <span>{breathingLabel}</span>
          </div>
          <div className="grounding-actions">
            {!bubbleStarted ? (
              <button onClick={startBubble} type="button">
                <Play aria-hidden="true" size={16} />
                Start
              </button>
            ) : (
              <>
                <button onClick={() => setBubbleRunning((current) => !current)} type="button">
                  {bubbleRunning ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
                  {bubbleRunning ? 'Pause' : 'Start'}
                </button>
                <button className="secondary" onClick={resetBubble} type="button">
                  <RotateCcw aria-hidden="true" size={16} />
                  Reset
                </button>
              </>
            )}
          </div>
        </article>
        <article className="minigame-card">
          <div className="grounding-card-head">
            <h3>Daily Scavenger Hunt</h3>
            <span>{huntComplete ? 'Grounding complete' : huntProgress}</span>
          </div>
          <p>Use your space to ground yourself for a minute.</p>
          <div className="hunt-list">
            {huntItems.map((item) => (
              <label className={huntDone.includes(item) ? 'checked' : ''} key={item}>
                <input checked={huntDone.includes(item)} onChange={() => toggleHuntItem(item)} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          {huntComplete && (
            <p className="grounding-complete">
              <CheckCircle2 aria-hidden="true" size={16} />
              Grounding complete
            </p>
          )}
          <button className="secondary subtle-control" disabled={huntDone.length === 0} onClick={() => setHuntDone([])} type="button">
            Clear finds
          </button>
        </article>
        <article className="minigame-card">
          <div className="grounding-card-head">
            <h3>5-4-3-2-1 Grounding</h3>
            <span>{sensesComplete ? 'Grounding complete' : `${sensesDone.length}/${groundingSteps.length}`}</span>
          </div>
          <p>Name what is around you, one sense at a time.</p>
          <div className="hunt-list senses-list">
            {groundingSteps.map((item) => (
              <label className={sensesDone.includes(item) ? 'checked' : ''} key={item}>
                <input checked={sensesDone.includes(item)} onChange={() => toggleSensesStep(item)} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          {sensesComplete && (
            <p className="grounding-complete">
              <CheckCircle2 aria-hidden="true" size={16} />
              Grounding complete
            </p>
          )}
          <button className="secondary subtle-control" disabled={sensesDone.length === 0} onClick={() => setSensesDone([])} type="button">
            Reset
          </button>
        </article>
      </div>
    </section>
  );
}

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
