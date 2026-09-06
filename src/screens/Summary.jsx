import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { countBy, countMany, formatDateKey, getPatternNotes, isCheckIn, topLabel } from '../utils/journalUtils';

const moodPalette = ['#c9825a', '#d9a441', '#8fae73', '#7eaeb4', '#9c8bc2', '#d88b9b', '#b98b66', '#7f9f83'];
const factorPalette = '#b87955';

export function Summary({ nav, entries }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const checkInEntries = entries.filter(isCheckIn);
  const weekDays = buildWeekDays(weekOffset);
  const weekKeys = new Set(weekDays.map((day) => day.dateKey));
  const weeklyEntries = checkInEntries.filter((entry) => weekKeys.has(entry.dateKey || formatDateKey(new Date(entry.created))));
  const moodCounts = countBy(weeklyEntries, 'mood');
  const factorCounts = countMany(weeklyEntries, 'factors');
  const avgIntensity = weeklyEntries.length
    ? (weeklyEntries.reduce((sum, entry) => sum + Number(entry.intensity || 0), 0) / weeklyEntries.length).toFixed(1)
    : '-';
  const intensityData = buildIntensityData(weekDays, weeklyEntries);
  const moodData = Object.entries(moodCounts).map(([name, value], index) => ({
    name,
    value,
    fill: moodPalette[index % moodPalette.length]
  }));
  const factorData = Object.entries(factorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
  const patterns = getPatternNotes(weeklyEntries);
  const weekRange = `${weekDays[0].monthDay} - ${weekDays[weekDays.length - 1].monthDay}`;
  const weekLabel = weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Previous week' : `${Math.abs(weekOffset)} weeks ago`;
  const hasIntensityData = intensityData.some((day) => day.intensity !== null);
  const hasMoodData = moodData.length > 0;
  const hasFactorData = factorData.length > 0;

  return (
    <section className="screen app-screen summary-screen">
      <header className="summary-heading">
        <span>{weekLabel}</span>
        <h1>Weekly Summary</h1>
        <p>{weekRange} - A softer look at check-ins, mood patterns, and common factors.</p>
        <div className="summary-week-nav" aria-label="Choose summary week">
          <button className="secondary" type="button" onClick={() => setWeekOffset((offset) => offset - 1)}>
            <ChevronLeft aria-hidden="true" size={17} />
            Previous week
          </button>
          <button className="secondary" type="button" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            This week
          </button>
          <button className="secondary" type="button" onClick={() => setWeekOffset((offset) => Math.min(offset + 1, 0))} disabled={weekOffset === 0}>
            Next week
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      </header>
      {nav}

      <div className="summary-stat-grid">
        <Stat label="Check-ins this week" value={weeklyEntries.length} helper={`${countFilledDays(intensityData)} of 7 days`} />
        <Stat label="Average intensity" value={avgIntensity === '-' ? avgIntensity : `${avgIntensity}/10`} helper={avgIntensity === '-' ? 'No check-ins yet' : intensityLabel(avgIntensity)} />
        <Stat label="Most common mood" value={topLabel(moodCounts)} helper={hasMoodData ? 'Shows up most' : 'Add a check-in'} />
        <Stat label="Top factor" value={topLabel(factorCounts)} helper={hasFactorData ? 'Most repeated note' : 'No factors yet'} />
      </div>

      <section className="summary-chart-card summary-chart-card-wide">
        <ChartHeader title="Intensity over the week" note="Daily averages from this week's check-ins." />
        <div className="summary-chart-frame">
          {hasIntensityData ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={intensityData} margin={{ top: 18, right: 18, bottom: 16, left: -16 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-text)" fontSize={12} fontWeight={800} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} stroke="var(--muted-text)" fontSize={12} fontWeight={800} />
                <Tooltip content={<SummaryTooltip labelSuffix="/10" emptyLabel="No check-in" />} cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  stroke="var(--chart-line)"
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, fill: 'var(--chart-dot)', stroke: 'var(--chart-line)' }}
                  activeDot={{ r: 7, strokeWidth: 2, fill: 'var(--hero-surface)', stroke: 'var(--chart-line)' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyAnalyticsFrame type="line" message="No check-ins this week yet." />
          )}
        </div>
      </section>

      <div className="summary-chart-grid">
        <section className="summary-chart-card">
          <ChartHeader title="Mood mix" note="How moods showed up across the week." />
          <div className="summary-chart-frame">
            {hasMoodData ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip content={<SummaryTooltip />} />
                  <Pie data={moodData} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={3}>
                    {moodData.map((entry, index) => (
                      <Cell key={`mood-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyAnalyticsFrame type="donut" message="Add check-ins to see your mood mix." />
            )}
          </div>
          {hasMoodData && <MoodLegend data={moodData} />}
        </section>

        <section className="summary-chart-card">
          <ChartHeader title="Common factors" note="The factors that appeared most often." />
          <div className="summary-chart-frame">
            {hasFactorData ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={factorData} layout="vertical" margin={{ top: 10, right: 22, bottom: 8, left: 62 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 6" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} stroke="var(--muted-text)" fontSize={12} fontWeight={800} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={118} stroke="var(--muted-text)" fontSize={12} fontWeight={800} />
                  <Tooltip content={<SummaryTooltip />} cursor={{ fill: 'var(--chart-hover)' }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} fill={factorPalette} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyAnalyticsFrame type="bars" message="No repeated factors yet." />
            )}
          </div>
        </section>
      </div>

      <section className="summary-chart-card patterns-card">
        <ChartHeader title="Patterns noticed" note="Gentle observations from this week's check-ins." />
        {patterns.length === 0 ? (
          <p>Add a few more check-ins this week to see patterns.</p>
        ) : (
          <div className="pattern-list">
            {patterns.map((pattern) => <p key={pattern}>{pattern}</p>)}
          </div>
        )}
      </section>
    </section>
  );
}

function Stat({ label, value, helper }) {
  return (
    <div className="summary-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function ChartHeader({ title, note }) {
  return (
    <div className="summary-chart-header">
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  );
}

function EmptyAnalyticsFrame({ type, message }) {
  return (
    <div className={`empty-analytics-frame empty-analytics-frame-${type}`}>
      <div aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>{message}</p>
    </div>
  );
}

function MoodLegend({ data }) {
  return (
    <div className="mood-legend">
      {data.map((item) => (
        <span key={item.name}>
          <i style={{ background: item.fill }} />
          {item.name} - {item.value}
        </span>
      ))}
    </div>
  );
}

function SummaryTooltip({ active, payload, label, labelSuffix = '', emptyLabel = 'No data' }) {
  if (!active || !payload?.length) return null;
  const item = payload.find((entry) => entry.value !== null && entry.value !== undefined) || payload[0];
  const value = item.value === null || item.value === undefined ? emptyLabel : `${item.value}${labelSuffix}`;
  return (
    <div className="summary-tooltip">
      <strong>{label || item.name}</strong>
      <span>{value}</span>
    </div>
  );
}

function buildWeekDays(weekOffset = 0) {
  const today = new Date();
  today.setDate(today.getDate() + weekOffset * 7);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      date,
      dateKey: formatDateKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      monthDay: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });
}

function buildIntensityData(weekDays, entries) {
  return weekDays.map((day) => {
    const dayEntries = entries.filter((entry) => (entry.dateKey || formatDateKey(new Date(entry.created))) === day.dateKey);
    const intensity = dayEntries.length
      ? Number((dayEntries.reduce((sum, entry) => sum + Number(entry.intensity || 0), 0) / dayEntries.length).toFixed(1))
      : null;
    return { ...day, intensity };
  });
}

function countFilledDays(days) {
  return days.filter((day) => day.intensity !== null).length;
}

function intensityLabel(value) {
  const numeric = Number(value);
  if (numeric >= 8) return 'High energy week';
  if (numeric >= 5) return 'Moderate week';
  return 'Gentler week';
}
