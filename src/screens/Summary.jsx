import { countBy, countMany, getPatternNotes, isCheckIn, topLabel } from '../utils/journalUtils';

export function Summary({ nav, entries }) {
  const checkInEntries = entries.filter(isCheckIn);
  const last7 = checkInEntries.filter((entry) => Date.now() - new Date(entry.created).getTime() < 7 * 24 * 60 * 60 * 1000);
  const moodCounts = countBy(last7, 'mood');
  const factorCounts = countMany(last7, 'factors');
  const avgIntensity = last7.length ? (last7.reduce((sum, entry) => sum + Number(entry.intensity || 0), 0) / last7.length).toFixed(1) : '-';
  const chartEntries = checkInEntries.slice().sort((a, b) => new Date(a.created) - new Date(b.created)).slice(-14);
  const patterns = getPatternNotes(checkInEntries);
  return (
    <section className="screen app-screen">
      <h1>Weekly Summary</h1>
      {nav}
      <div className="stats-grid">
        <Stat label="Check-ins this week" value={last7.length} />
        <Stat label="Average intensity" value={avgIntensity === '-' ? avgIntensity : `${avgIntensity}/10`} />
        <Stat label="Most common mood" value={topLabel(moodCounts)} />
        <Stat label="Top factor" value={topLabel(factorCounts)} />
      </div>
      <div className="panel">
        <h2>Intensity over time</h2>
        <IntensityChart entries={chartEntries} />
      </div>
      <div className="panel">
        <h2>Patterns noticed</h2>
        {patterns.length === 0 ? <p>Add a few more entries to see patterns.</p> : patterns.map((pattern) => <p key={pattern}>{pattern}</p>)}
      </div>
      <div className="panel">
        <h2>Mood trends</h2>
        {Object.entries(moodCounts).map(([mood, count]) => <Bar key={mood} label={mood} value={count} max={Math.max(...Object.values(moodCounts), 1)} />)}
      </div>
      <div className="panel">
        <h2>Common factors</h2>
        {Object.entries(factorCounts).map(([factor, count]) => <Bar key={factor} label={factor} value={count} max={Math.max(...Object.values(factorCounts), 1)} />)}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Bar({ label, value, max }) {
  return <div className="bar"><span>{label}</span><div><i style={{ width: `${(value / max) * 100}%` }} /></div><strong>{value}</strong></div>;
}

function IntensityChart({ entries }) {
  if (entries.length === 0) return <p>No intensity data yet.</p>;
  const points = entries.map((entry, index) => {
    const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 100;
    const y = 100 - (Number(entry.intensity || 0) / 10) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Mood intensity over time">
        <polyline points={points} />
      </svg>
      <div className="chart-labels">
        {entries.map((entry) => <span key={entry.id}>{entry.intensity}</span>)}
      </div>
    </div>
  );
}
