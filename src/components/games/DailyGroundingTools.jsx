import { useState } from 'react';
import { scavengerSets } from './gameUtils';

export function DailyGroundingTools({ todayKey }) {
  const dayNumber = Math.floor(new Date(todayKey()).getTime() / 86400000);
  const huntItems = scavengerSets[dayNumber % scavengerSets.length];
  const [huntDone, setHuntDone] = useState([]);
  const [bubbleRunning, setBubbleRunning] = useState(false);
  const toggleHuntItem = (item) => {
    setHuntDone((current) => (
      current.includes(item) ? current.filter((doneItem) => doneItem !== item) : [...current, item]
    ));
  };

  return (
    <section className="minigames-section grounding-tools" id="grounding-tools">
      <h2>Quick Grounding Tools</h2>
      <p className="recommendation-note">These stay in Activities so the Games tab can focus on the rotating reflection games.</p>
      <div className="minigame-grid daily-games">
        <article className="minigame-card breathing-game">
          <h3>Breathing Bubble</h3>
          <p>Follow the bubble as it grows and settles.</p>
          <div className={bubbleRunning ? 'breathing-bubble active' : 'breathing-bubble'} />
          <button onClick={() => setBubbleRunning(!bubbleRunning)} type="button">{bubbleRunning ? 'Pause' : 'Start'}</button>
        </article>
        <article className="minigame-card">
          <h3>Daily Scavenger Hunt</h3>
          <p>Use your space to ground yourself for a minute.</p>
          <div className="hunt-list">
            {huntItems.map((item) => (
              <label key={item}>
                <input checked={huntDone.includes(item)} onChange={() => toggleHuntItem(item)} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          <button disabled={huntDone.length === 0} onClick={() => setHuntDone([])} type="button">Clear finds</button>
        </article>
      </div>
    </section>
  );
}
