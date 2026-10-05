import { ArrowLeft, ArrowRight, CheckCircle2, Heart, Pause, Play, RotateCcw, Sparkles, Wind, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DailyGroundingTools } from '../components/games/DailyGroundingTools';
import { quickActivityGroups } from '../data/journalData';
import { todayKey } from '../utils/journalUtils';
import { PageHeader } from '../components/layout/PageHeader';
import { usePrivateStorageState } from '../hooks/usePrivateStorageState';
import { selectDailyActivities, selectFeaturedDailyActivity } from '../utils/activityUtils';

export function Activities({ nav, privateStorage }) {
  const today = todayKey();
  const list = useMemo(() => selectDailyActivities(quickActivityGroups, today), [today]);
  const featured = useMemo(() => selectFeaturedDailyActivity(list, today), [list, today]);
  const choices = useMemo(() => featured ? [featured, ...list.filter((activity) => activity !== featured)] : [], [featured, list]);
  const storageKey = `activityCompletions:${today}`;
  const notesStorageKey = `activityNotes:${today}`;
  const [completed, setCompleted] = useState(() => readStoredObject(storageKey));
  const [notes, setNotes, notesStorageError] = usePrivateStorageState(privateStorage, notesStorageKey, {});
  const [selectedTitle, setSelectedTitle] = useState(featured?.title || '');
  const [openedTitle, setOpenedTitle] = useState('');
  const [focusTitle, setFocusTitle] = useState('');
  const beginButtonRef = useRef(null);
  const selectedActivity = choices.find((activity) => activity.title === selectedTitle) || featured;
  const selectedIndex = choices.indexOf(selectedActivity);

  useEffect(() => {
    if (!list.some((activity) => activity.title === selectedTitle)) {
      setSelectedTitle(featured?.title || '');
      setOpenedTitle('');
    }
  }, [featured, list, selectedTitle]);

  useEffect(() => {
    if (!focusTitle || openedTitle !== focusTitle) return;
    const panel = document.getElementById(`activity-panel-${toId(focusTitle)}`);
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: 'start' });
    setFocusTitle('');
  }, [focusTitle, openedTitle]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(completed));
  }, [completed, storageKey]);

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

  const browseActivity = (direction) => {
    const next = choices[(selectedIndex + direction + choices.length) % choices.length];
    setSelectedTitle(next.title);
    setOpenedTitle('');
    setFocusTitle('');
  };

  const closeActivity = () => {
    setOpenedTitle('');
    beginButtonRef.current?.focus({ preventScroll: true });
    beginButtonRef.current?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <section className="screen app-screen activities-screen">
      <PageHeader align="center" eyebrow={formatActivityDate(today)} title="Quick Activities" subtitle="Choose a small pause for right now." />
      {nav}

      <section className="activities-focus" aria-labelledby="activity-picker-title">
        {notesStorageError && <p className="form-error" role="alert">{notesStorageError}</p>}
        <h2 className="visually-hidden" id="activity-picker-title">Choose an activity</h2>
        {selectedActivity && (
          <div className="activity-feature" aria-labelledby="activity-feature-title">
            <div className="activity-feature-copy">
              <span className="activities-eyebrow">{selectedActivity === featured ? 'Suggested for today' : activityLabels[selectedActivity.kind]} &middot; {selectedActivity.minutes} min</span>
              <h2 id="activity-feature-title">{selectedActivity.title}</h2>
              <p>{selectedActivity.detail}</p>
              {completed[selectedActivity.title] && <span className="activity-feature-completed"><CheckCircle2 aria-hidden="true" size={17} /> Completed today</span>}
              <button
                aria-controls={`activity-panel-${toId(selectedActivity.title)}`}
                aria-expanded={openedTitle === selectedActivity.title}
                className="primary activity-feature-button"
                onClick={() => { setOpenedTitle(selectedActivity.title); setFocusTitle(selectedActivity.title); }}
                ref={beginButtonRef}
                type="button"
              >
                {completed[selectedActivity.title] || openedTitle === selectedActivity.title ? 'Open activity' : 'Begin activity'}
                <ArrowRight aria-hidden="true" size={18} />
              </button>
            </div>
            <span className="activity-feature-art" aria-hidden="true" />
            <div className="activity-feature-navigation" role="group" aria-label="Browse quick activities">
              <button className="secondary activity-browse-button" aria-label="Previous activity" title="Previous activity" onClick={() => browseActivity(-1)} disabled={choices.length < 2} type="button"><ArrowLeft aria-hidden="true" size={20} /></button>
              <span role="status" aria-live="polite" aria-atomic="true">
                {selectedIndex + 1} / {choices.length}
                <span className="visually-hidden">: {selectedActivity.title}</span>
              </span>
              <button className="secondary activity-browse-button" aria-label="Next activity" title="Next activity" onClick={() => browseActivity(1)} disabled={choices.length < 2} type="button"><ArrowRight aria-hidden="true" size={20} /></button>
            </div>
          </div>
        )}

        <div className="activity-sheet-stack">
          {list.map((activity) => (
            <ActivitySheet
              active={activity.title === openedTitle}
              activity={activity}
              dateLabel={formatActivityDate(today)}
              done={Boolean(completed[activity.title])}
              key={activity.title}
              note={notes[activity.title] || ''}
              onDoneChange={(done) => setActivityDone(activity.title, done)}
              onNoteChange={(note) => setActivityNote(activity.title, note)}
              onClose={closeActivity}
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
  body: Wind,
  reflection: Heart,
  action: Sparkles
};

const activityLabels = { body: 'A moment for your body', reflection: 'A moment to reflect', action: 'A small step' };

function ActivitySheet({ active, activity, dateLabel, done, note, onDoneChange, onNoteChange, onClose }) {
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
  const Icon = activityIcons[activity.kind] || Heart;
  const panelId = `activity-panel-${toId(activity.title)}`;
  const headingId = `activity-heading-${toId(activity.title)}`;

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
      aria-labelledby={headingId}
      className={done ? 'activity-journal-sheet done' : 'activity-journal-sheet'}
      hidden={!active}
      id={panelId}
      tabIndex={-1}
    >
      <div className="activity-sheet-topline">
        <span className="activity-sheet-date">{dateLabel}</span>
        <button className="secondary activity-browse-button" aria-label="Close activity" title="Close activity" onClick={onClose} type="button"><X aria-hidden="true" size={20} /></button>
      </div>
      <header className="activity-sheet-heading">
        <span className="activity-sheet-icon"><Icon aria-hidden="true" size={24} /></span>
        <div>
          <span>{activity.minutes} minute pause</span>
          <h2 id={headingId}>{activity.title}</h2>
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
            placeholder={activity.notePrompt || 'Notice anything you want to remember?'}
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
          <input className="journal-checkbox-input" checked={done} onChange={(event) => onDoneChange(event.target.checked)} type="checkbox" />
          <span className="journal-checkbox-mark" aria-hidden="true"><Sparkles size={14} strokeWidth={2.5} /></span>
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
