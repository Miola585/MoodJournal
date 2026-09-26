import { CheckCircle2, ListChecks, Pause, Play, RotateCcw, Search, Waves } from 'lucide-react';
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

const groundingTools = [
  { id: 'breathing', title: 'Breathing', icon: Waves },
  { id: 'scavenger', title: 'Scavenger hunt', icon: Search },
  { id: 'senses', title: '5-4-3-2-1', icon: ListChecks }
];

export function DailyGroundingTools({ todayKey }) {
  const today = todayKey();
  const dayNumber = Math.floor(new Date(today).getTime() / 86400000);
  const huntItems = scavengerSets[dayNumber % scavengerSets.length];
  const huntStorageKey = `groundingHunt:${today}`;
  const sensesStorageKey = `grounding54321:${today}`;
  const [activeTool, setActiveTool] = useState('breathing');
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
    if (activeTool !== 'breathing') setBubbleRunning(false);
  }, [activeTool]);

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

  const statusByTool = {
    breathing: bubbleStarted ? breathingLabel : 'One slow round',
    scavenger: huntComplete ? 'Complete' : huntProgress,
    senses: sensesComplete ? 'Complete' : `${sensesDone.length}/${groundingSteps.length}`
  };

  return (
    <section className="grounding-tools" id="grounding-tools" aria-labelledby="grounding-tools-title">
      <header className="grounding-tools-heading">
        <span className="activities-eyebrow">More ways to pause</span>
        <h2 id="grounding-tools-title">Choose one grounding tool</h2>
        <p>Open one when a little more structure would help.</p>
      </header>

      <div className="grounding-tool-tabs" role="tablist" aria-label="Grounding tools">
        {groundingTools.map(({ id, title, icon: Icon }) => (
          <button
            aria-controls={`grounding-panel-${id}`}
            aria-selected={activeTool === id}
            className={activeTool === id ? 'grounding-tool-tab selected' : 'grounding-tool-tab'}
            id={`grounding-tab-${id}`}
            key={id}
            onClick={() => setActiveTool(id)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" size={19} />
            <span>{title}</span>
            <small>{statusByTool[id]}</small>
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`grounding-tab-${activeTool}`}
        className="grounding-workspace"
        id={`grounding-panel-${activeTool}`}
        role="tabpanel"
      >
        {activeTool === 'breathing' && (
          <div className="grounding-tool-content breathing-tool-content">
            <header>
              <h3>Breathing Bubble</h3>
              <p>Follow the bubble for one slow round.</p>
            </header>
            <div aria-live="polite" className={bubbleRunning ? `breathing-bubble active phase-${phaseIndex}` : 'breathing-bubble'}>
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
                    {bubbleRunning ? 'Pause' : 'Continue'}
                  </button>
                  <button className="secondary" onClick={resetBubble} type="button">
                    <RotateCcw aria-hidden="true" size={16} />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTool === 'scavenger' && (
          <div className="grounding-tool-content">
            <header>
              <h3>Daily Scavenger Hunt</h3>
              <p>Use your space to notice a few steady details.</p>
            </header>
            <div className="hunt-list">
              {huntItems.map((item) => (
                <label className={huntDone.includes(item) ? 'checked' : ''} key={item}>
                  <input checked={huntDone.includes(item)} onChange={() => toggleHuntItem(item)} type="checkbox" />
                  {item}
                </label>
              ))}
            </div>
            <div className="grounding-workspace-footer">
              {huntComplete && (
                <p className="grounding-complete">
                  <CheckCircle2 aria-hidden="true" size={16} />
                  Grounding complete
                </p>
              )}
              <button className="secondary subtle-control" disabled={huntDone.length === 0} onClick={() => setHuntDone([])} type="button">
                Clear finds
              </button>
            </div>
          </div>
        )}

        {activeTool === 'senses' && (
          <div className="grounding-tool-content">
            <header>
              <h3>5-4-3-2-1 Grounding</h3>
              <p>Name what is around you, one sense at a time.</p>
            </header>
            <div className="hunt-list senses-list">
              {groundingSteps.map((item) => (
                <label className={sensesDone.includes(item) ? 'checked' : ''} key={item}>
                  <input checked={sensesDone.includes(item)} onChange={() => toggleSensesStep(item)} type="checkbox" />
                  {item}
                </label>
              ))}
            </div>
            <div className="grounding-workspace-footer">
              {sensesComplete && (
                <p className="grounding-complete">
                  <CheckCircle2 aria-hidden="true" size={16} />
                  Grounding complete
                </p>
              )}
              <button className="secondary subtle-control" disabled={sensesDone.length === 0} onClick={() => setSensesDone([])} type="button">
                Reset
              </button>
            </div>
          </div>
        )}
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
