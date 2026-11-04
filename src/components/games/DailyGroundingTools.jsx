import { ArrowLeft, ArrowRight, CheckCircle2, Ear, Eye, Hand, Pause, Play, RotateCcw, Wind, Flower2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PauseNote } from './PauseNote';

const breathingPhases = ['Breathe in', 'Hold', 'Breathe out', 'Rest'];
const groundingSteps = [
  '5 things you can see',
  '4 things you can feel',
  '3 things you can hear',
  '2 things you can smell',
  '1 slow breath'
];

export function DailyGroundingTools({ todayKey, selectedTool, focusActiveTool = false, active = true, privateStorage }) {
  const today = todayKey();
  const sensesStorageKey = `grounding54321:${today}`;
  const activeTool = selectedTool === 'senses' ? 'senses' : 'breathing';
  const panelRef = useRef(null);
  const bloomRef = useRef(null);
  const [sensesDone, setSensesDone] = useState(() => readStoredList(sensesStorageKey));
  const [senseIndex, setSenseIndex] = useState(() => {
    const saved = readStoredList(sensesStorageKey);
    const next = groundingSteps.findIndex((step) => !saved.includes(step));
    return next < 0 ? 4 : next;
  });
  const SenseIcon = [Eye, Hand, Ear, Flower2, Wind][senseIndex];
  const [bubbleRunning, setBubbleRunning] = useState(false);
  const [bubbleStarted, setBubbleStarted] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!active || !focusActiveTool) return;
    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active, activeTool, focusActiveTool]);

  useEffect(() => {
    if (!bubbleRunning) return undefined;
    const startedAt = performance.now();
    const timer = setInterval(() => {
      setPhaseIndex(Math.floor((elapsed.current + performance.now() - startedAt) / 4000) % breathingPhases.length);
    }, 100);
    return () => {
      elapsed.current += performance.now() - startedAt;
      clearInterval(timer);
    };
  }, [bubbleRunning]);

  useEffect(() => {
    // Keep the petals and phase text together when returning to a paused breath.
    const animation = bloomRef.current?.getAnimations()[0];
    if (animation) animation.currentTime = elapsed.current;
  }, [activeTool, bubbleRunning, bubbleStarted]);

  useEffect(() => {
    if (!active || activeTool !== 'breathing') setBubbleRunning(false);
  }, [active, activeTool]);

  useEffect(() => {
    localStorage.setItem(sensesStorageKey, JSON.stringify(sensesDone));
  }, [sensesDone, sensesStorageKey]);

  const sensesComplete = sensesDone.length === groundingSteps.length;
  const breathingLabel = bubbleStarted ? breathingPhases[phaseIndex] : 'Ready when you are';

  const noticeSense = () => {
    const item = groundingSteps[senseIndex];
    setSensesDone((current) => current.includes(item) ? current : [...current, item]);
    setSenseIndex((current) => Math.min(current + 1, groundingSteps.length - 1));
  };

  const startBubble = () => {
    elapsed.current = 0;
    setBubbleStarted(true);
    setBubbleRunning(true);
  };

  const resetBubble = () => {
    setBubbleRunning(false);
    setBubbleStarted(false);
    setPhaseIndex(0);
  };

  return (
    <section className="grounding-tools" id="grounding-tools">
      <div
        aria-label={activeTool === 'senses' ? 'Five senses' : 'Breathing'}
        className="grounding-workspace"
        id={`grounding-panel-${activeTool}`}
        ref={panelRef}
        role="region"
        tabIndex={-1}
      >
        {activeTool === 'breathing' && (
          <div className="grounding-tool-content breathing-tool-content">
            <header>
              <span className="app-eyebrow">A softer pace</span>
              <h3>Breathe with the circle.</h3>
            </header>
            <button aria-label={bubbleStarted ? bubbleRunning ? 'Pause breathing' : 'Continue breathing' : 'Start breathing'} className={`breathing-bubble breathing-flower${bubbleStarted ? ' started' : ''}${bubbleRunning ? ' active' : ''} phase-${phaseIndex}`} onClick={() => bubbleStarted ? setBubbleRunning((current) => !current) : startBubble()} type="button">
              <svg className="breathing-petals" viewBox="0 0 280 280" fill="none" aria-hidden="true">
                <circle cx="140" cy="140" r="132" className="breathing-guide" />
                <g className="breathing-bloom" ref={bloomRef}>{Array.from({ length: 8 }, (_, index) => <ellipse key={index} cx="140" cy="99" rx="47" ry="77" transform={`rotate(${index * 45} 140 140)`} />)}</g>
                <circle className="breathing-center" cx="140" cy="140" r="65" />
              </svg>
              <span aria-live="polite">{breathingLabel}</span>
            </button>
            <div className="grounding-actions">
              {bubbleStarted && (
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

        {activeTool === 'senses' && (
          <div className="grounding-tool-content senses-tool-content">
            <header>
              <span className="app-eyebrow">Five senses</span>
              <h3>Come back to what's around you.</h3>
            </header>
            <div className="sense-step" aria-live="polite" aria-atomic="true">
              <SenseIcon size={64} aria-hidden="true" />
              <h4>{groundingSteps[senseIndex]}</h4>
              <span>{senseIndex + 1} of {groundingSteps.length}</span>
            </div>
            <div className="sense-progress" aria-label={`${sensesDone.length} of 5 senses noticed`}>
              {groundingSteps.map((item, index) => <span key={item} className={sensesDone.includes(item) ? 'done' : ''} aria-current={index === senseIndex ? 'step' : undefined} />)}
            </div>
            <div className="sense-actions">
              <button className="secondary" type="button" disabled={senseIndex === 0} onClick={() => setSenseIndex((current) => current - 1)}><ArrowLeft size={17} />Back</button>
              <button className="primary" type="button" disabled={sensesComplete && senseIndex === 4} onClick={noticeSense}>I noticed<ArrowRight size={17} /></button>
            </div>
            <div className="grounding-workspace-footer">
              {sensesComplete && (
                <p className="grounding-complete">
                  <CheckCircle2 aria-hidden="true" size={16} />
                  Grounding complete
                </p>
              )}
              <button className="secondary subtle-control" disabled={sensesDone.length === 0} onClick={() => { setSensesDone([]); setSenseIndex(0); }} type="button">
                Reset
              </button>
            </div>
          </div>
        )}
        {privateStorage && <PauseNote key={`${privateStorage.ownerId}:${activeTool}:${today}`} privateStorage={privateStorage} storageKey={`groundingNoteV1:${activeTool}:${today}`} />}
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
