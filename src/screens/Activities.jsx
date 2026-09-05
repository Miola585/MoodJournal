import { CheckCircle2, Footprints, Heart, Pause, Play, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { activities } from '../data/journalData';
import { todayKey } from '../utils/journalUtils';
import { DailyGroundingTools } from '../components/games/DailyGroundingTools';

export function Activities({ nav, entries }) {
  const list = activities.default;
  const today = todayKey();
  const storageKey = `activityCompletions:${today}`;
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  });

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

  return (
    <section className="screen app-screen activities-screen">
      <div className="activities-heading">
        <h1>Activities</h1>
        <p>Small resets you can do in a few minutes.</p>
      </div>
      {nav}
      {entries?.length > 0 && <p className="recommendation-note">Pick one small reset that fits your energy today.</p>}
      <section className="activities-group">
        <div className="section-kicker">
          <h2>Quick Activities</h2>
          <p>Tiny resets you can do right here.</p>
        </div>
        <div className="activity-grid">
          {list.map((activity) => (
            <ActivityCard
              activity={activity}
              done={Boolean(completed[activity.title])}
              key={activity.title}
              onDoneChange={(done) => setActivityDone(activity.title, done)}
            />
          ))}
        </div>
      </section>
      <DailyGroundingTools todayKey={todayKey} />
      {completedActivities.length > 0 && (
        <section className="activities-group completed-today">
          <div className="section-kicker">
            <h2>Completed Today</h2>
            <p>Small progress counts.</p>
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

function ActivityCard({ activity, done, onDoneChange }) {
  const [secondsLeft, setSecondsLeft] = useState(activity.minutes * 60);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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
  }, [secondsLeft, done]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const Icon = activityIcons[activity.title] || Heart;
  const timerLabel = done ? 'Done today' : running ? 'Running' : hasStarted ? 'Paused' : `${activity.minutes} min`;

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
    <article className={done ? 'activity-card done' : 'activity-card'}>
      <div className="activity-card-top">
        <span className="activity-icon">
          <Icon aria-hidden="true" size={22} />
        </span>
        <span className="activity-duration">{timerLabel}</span>
        <label className="activity-check">
          <input checked={done} onChange={(event) => onDoneChange(event.target.checked)} type="checkbox" />
          <h2>{activity.title}</h2>
        </label>
      </div>
      <p>{activity.detail}</p>
      <div className="timer-row">
        <strong>{minutes}:{seconds}</strong>
        <button className="timer-action" onClick={toggleTimer} type="button">
          {running ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
          {running ? 'Pause' : 'Start'}
        </button>
        {hasStarted && (
          <button className="secondary timer-reset" onClick={resetTimer} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        )}
      </div>
      {done && (
        <p className="done-note">
          <CheckCircle2 aria-hidden="true" size={16} />
          Done today
        </p>
      )}
    </article>
  );
}
