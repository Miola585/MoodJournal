import { useEffect, useState } from 'react';
import { activities } from '../data/journalData';
import { isCheckIn, todayKey } from '../utils/journalUtils';
import { DailyGroundingTools } from '../components/games/DailyGroundingTools';

export function Activities({ nav, entries }) {
  const recentMood = entries.find(isCheckIn)?.mood;
  const list = activities[recentMood] || activities.default;
  return (
    <section className="screen app-screen">
      <h1>Activities</h1>
      {nav}
      {recentMood && <p className="recommendation-note">Based on your latest check-in, here are a few ideas for feeling {recentMood.toLowerCase()}.</p>}
      <div className="activity-grid">
        {list.map((activity) => <ActivityCard activity={activity} key={activity.title} />)}
      </div>
      <DailyGroundingTools todayKey={todayKey} />
    </section>
  );
}

function ActivityCard({ activity }) {
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(activity.minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearInterval(timer);
  }, [running, secondsLeft]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <article className={done ? 'activity-card done' : 'activity-card'}>
      <div>
        <label className="activity-check">
          <input checked={done} onChange={(event) => setDone(event.target.checked)} type="checkbox" />
          <h2>{activity.title}</h2>
        </label>
        <span>{activity.minutes} min</span>
      </div>
      <p>{activity.detail}</p>
      <div className="timer-row">
        <strong>{minutes}:{seconds}</strong>
        <button onClick={() => setRunning(!running)} type="button">{running ? 'Pause' : 'Start'}</button>
        <button onClick={() => { setRunning(false); setSecondsLeft(activity.minutes * 60); }} type="button">Reset</button>
      </div>
    </article>
  );
}
