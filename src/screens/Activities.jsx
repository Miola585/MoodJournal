import { CheckCircle2, Footprints, Heart, Pause, Play, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DailyGroundingTools } from '../components/games/DailyGroundingTools';
import { activities } from '../data/journalData';
import { todayKey } from '../utils/journalUtils';

export function Activities({ nav }) {
  const list = activities.default;
  const today = todayKey();
  const storageKey = `activityCompletions:${today}`;
  const notesStorageKey = `activityNotes:${today}`;
  const [completed, setCompleted] = useState(() => readStoredObject(storageKey));
  const [notes, setNotes] = useState(() => readStoredObject(notesStorageKey));
  const [selectedTitle, setSelectedTitle] = useState(list[0]?.title || '');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(completed));
  }, [completed, storageKey]);

  useEffect(() => {
    localStorage.setItem(notesStorageKey, JSON.stringify(notes));
  }, [notes, notesStorageKey]);

  const completedActivities = useMemo(
    () => list.filter((activity) => completed[activity.title]),
    [completed, list]
  );

  const setActivityDone = (title, done) => {
    setCompleted((current) => ({ ...current, [title]: done }));
  };

  const setActivityNote = (title, note) => {
    setNotes((current) => ({ ...current, [title]: note }));
  };

  return (
    <section className="screen app-screen activities-screen">
      <header className="activities-heading">
        <span className="activities-date">{formatActivityDate(today)}</span>
        <h1>Quick Activities</h1>
        <p>Choose a small pause for right now.</p>
      </header>
      {nav}

      <section className="activities-focus" aria-labelledby="activity-picker-title">
        <h2 className="visually-hidden" id="activity-picker-title">Choose an activity</h2>
        <div className="activity-selector" role="tablist" aria-label="Quick activities">
          {list.map((activity) => {
            const Icon = activityIcons[activity.title] || Heart;
            const selected = activity.title === selectedTitle;
            return (
              <button
                aria-controls={`activity-panel-${toId(activity.title)}`}
                aria-selected={selected}
                className={selected ? 'activity-selector-button selected' : 'activity-selector-button'}
                id={`activity-tab-${toId(activity.title)}`}
                key={activity.title}
                onClick={() => setSelectedTitle(activity.title)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" size={20} />
                <span>
                  <strong>{activity.title}</strong>
                  <small>{activity.minutes} min</small>
                </span>
                {completed[activity.title] && <CheckCircle2 aria-label="Completed today" size={17} />}
              </button>
            );
          })}
        </div>

        <div className="activity-sheet-stack">
          {list.map((activity) => (
            <ActivitySheet
              active={activity.title === selectedTitle}
              activity={activity}
              dateLabel={formatActivityDate(today)}
              done={Boolean(completed[activity.title])}
              key={activity.title}
              note={notes[activity.title] || ''}
              onDoneChange={(done) => setActivityDone(activity.title, done)}
              onNoteChange={(note) => setActivityNote(activity.title, note)}
            />
          ))}
        </div>
      </section>

      <DailyGroundingTools todayKey={todayKey} />

      {completedActivities.length > 0 && (
        <section className="completed-today" aria-labelledby="completed-activities-title">
          <div>
            <span className="activities-eyebrow">Today&apos;s small wins</span>
            <h2 id="completed-activities-title">Completed activities</h2>
          </div>
          <div className="completed-chip-row">
            {completedActivities.map((activity) => (
              <span className="completed-chip" key={activity.title}>
                <CheckCircle2 aria-hidden="true" size={16} />
                {activity.title}
              </span>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

const activityIcons = {
  '10-minute walk': Footprints,
  'Gratitude snapshot': Heart,
  'Warm drink pause': Sparkles,
  'Shoulder drop': Wind,
  'One good thing': Heart,
  'Tiny next step': Sparkles
};

const activityNotePrompts = {
  'Shoulder drop': 'What feels a little softer now?',
  'One good thing': 'One small thing I want to remember...',
  'Tiny next step': 'The next small thing I can do is...'
};

function ActivitySheet({ active, activity, dateLabel, done, note, onDoneChange, onNoteChange }) {
  const [secondsLeft, setSecondsLeft] = useState(activity.minutes * 60);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!active) setRunning(false);
  }, [active]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((current) => Math.max(current - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && !done) {
      setRunning(false);
      onDoneChange(true);
    }
  }, [secondsLeft, done, onDoneChange]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const Icon = activityIcons[activity.title] || Heart;
  const panelId = `activity-panel-${toId(activity.title)}`;
  const tabId = `activity-tab-${toId(activity.title)}`;

  const toggleTimer = () => {
    setHasStarted(true);
    setRunning((current) => !current);
  };

  const resetTimer = () => {
    setRunning(false);
    setHasStarted(false);
    setSecondsLeft(activity.minutes * 60);
  };

  return (
    <article
      aria-labelledby={tabId}
      className={done ? 'activity-journal-sheet done' : 'activity-journal-sheet'}
      hidden={!active}
      id={panelId}
      role="tabpanel"
    >
      <div className="activity-sheet-date">{dateLabel}</div>
      <header className="activity-sheet-heading">
        <span className="activity-sheet-icon"><Icon aria-hidden="true" size={24} /></span>
        <div>
          <span>{activity.minutes} minute pause</span>
          <h2>{activity.title}</h2>
        </div>
        {done && (
          <span className="activity-sheet-status">
            <CheckCircle2 aria-hidden="true" size={16} />
            Done today
          </span>
        )}
      </header>

      <div className="activity-writing-area">
        <p className="activity-sheet-intro">{activity.detail}</p>

        <ol className="activity-step-list" aria-label={`${activity.title} steps`}>
          {activity.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>

        <label className="activity-note-field">
          <span>A small note <small>optional</small></span>
          <textarea
            maxLength={240}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder={activityNotePrompts[activity.title] || 'Notice anything you want to remember?'}
            rows={3}
            value={note}
          />
        </label>
      </div>

      <footer className="activity-sheet-footer">
        <div className="activity-timer" aria-live="polite">
          <span>{running ? 'In progress' : hasStarted ? 'Paused' : 'Timer'}</span>
          <strong>{minutes}:{seconds}</strong>
        </div>
        <div className="activity-timer-actions">
          <button className="timer-action" onClick={toggleTimer} type="button">
            {running ? <Pause aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}
            {running ? 'Pause' : hasStarted ? 'Continue' : 'Start'}
          </button>
          {hasStarted && (
            <button aria-label={`Reset ${activity.title} timer`} className="secondary timer-reset" onClick={resetTimer} type="button">
              <RotateCcw aria-hidden="true" size={17} />
              Reset
            </button>
          )}
        </div>
        <label className="activity-complete-check">
          <input checked={done} onChange={(event) => onDoneChange(event.target.checked)} type="checkbox" />
          <span>Mark complete</span>
        </label>
      </footer>
    </article>
  );
}

function readStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function formatActivityDate(dateKey) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date(`${dateKey}T12:00:00`));
}

function toId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
