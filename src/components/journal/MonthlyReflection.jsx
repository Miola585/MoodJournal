import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, ChartNoAxesCombined } from 'lucide-react';
import { buildMonthlyReflection } from '../../utils/monthlyReflection';
import { moods } from '../../data/journalData';

export function MonthlyReflection({ book, today, pageNumber, partial }) {
  const data = buildMonthlyReflection(book, today, moods);
  const label = new Date(`${book.month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const hasIntensity = data.averageIntensity !== null;
  const tooltipStyle = { background: 'var(--journal-paper)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85em' };
  return <>
    <article className="book-leaf book-reflection-leaf"><div className="book-page-running-head"><span>{label}</span><ChartNoAxesCombined size={16} /></div>
      <p className="app-eyebrow">{book.month === today.slice(0, 7) ? 'The month so far' : 'Looking back'}</p><h2>Your month in view.</h2>
      {data.checkInDays > 0 ? <>
        <p className="book-reflection-caption">One primary check-in per day. Missing days stay blank.</p>
        {hasIntensity && <section className="book-month-chart"><h3>Intensity through the month</h3><div role="img" aria-label="Daily recorded intensity from 1 to 10; missing days are gaps">
          <ResponsiveContainer width="100%" height={220}><LineChart accessibilityLayer={false} data={data.intensityData} margin={{ top: 12, right: 12, left: -28, bottom: 6 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="day" ticks={[1, 7, 14, 21, data.intensityData.length]} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: '.75em' }} />
            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: '.75em' }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(day) => `Day ${day}`} formatter={(value) => [`${value}/10`, 'Intensity']} />
            <Line type="linear" dataKey="intensity" stroke="var(--interactive-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--interactive-accent)' }} connectNulls={false} isAnimationActive={false} />
          </LineChart></ResponsiveContainer>
        </div></section>}
        {data.moodData.length > 0 && <section className="book-month-chart"><h3>Feelings you recorded</h3><div role="img" aria-label="Number of primary check-in days for each recorded mood">
          <ResponsiveContainer width="100%" height={Math.max(160, data.moodData.length * 44)}><BarChart accessibilityLayer={false} data={data.moodData} layout="vertical" margin={{ top: 8, right: 14, left: 0, bottom: 8 }}>
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: '.75em' }} />
            <YAxis type="category" dataKey="name" width={124} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: '.7em' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Days']} cursor={{ fill: 'var(--surface-secondary)' }} />
            <Bar dataKey="value" barSize={16} radius={[0, 3, 3, 0]} isAnimationActive={false}>{data.moodData.map((item) => <Cell key={item.name} fill={item.fill} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </div></section>}
        <details className="book-chart-values"><summary>Chart values</summary>
          <table><caption>Recorded daily intensity</caption><thead><tr><th scope="col">Day</th><th scope="col">Intensity</th></tr></thead><tbody>{data.intensityData.filter((value) => value.intensity !== null).map((value) => <tr key={value.day}><th scope="row">{value.dateKey}</th><td>{value.intensity}/10</td></tr>)}</tbody></table>
          <table><caption>Recorded feelings</caption><thead><tr><th scope="col">Feeling</th><th scope="col">Days</th></tr></thead><tbody>{data.moodData.map((value) => <tr key={value.name}><th scope="row">{value.name}</th><td>{value.value}</td></tr>)}</tbody></table>
        </details>
      </> : <div className="book-reflection-empty"><BookOpen size={32} /><h3>A month in your own words.</h3><p>No check-ins saved for this month. Your writing and keepsakes still belong here.</p></div>}
      <footer className="book-page-number">{pageNumber}<span>A month in view</span></footer>
    </article>
    <aside className="book-leaf book-reflection-leaf" aria-label="Monthly insights"><div className="book-page-running-head"><span>Small things to notice</span><BookOpen size={16} /></div><h2>A little reflection.</h2>
      {partial && <p className="book-reflection-caption" role="status">Totals show the content available so far. Some keepsakes are still loading or could not be read.</p>}
      <dl className="book-month-totals">{[['Journal days', data.journalDays], ['Free writes', data.freeWrites], ['Check-ins', data.checkIns], ['Keepsakes', data.keepsakes]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <section className="book-month-insights"><h3>From your check-ins</h3>
        {data.averageIntensity !== null && <p>Average recorded intensity: <strong>{data.averageIntensity}/10</strong>.</p>}
        {data.insights.length ? data.insights.map((insight) => <p key={insight}>{insight}</p>) : <p>{data.checkInDays ? 'There are not enough repeated details to describe a pattern yet.' : 'Insights will appear when there are saved check-ins.'}</p>}
        {data.factors.length > 0 && <><h3>What you mentioned</h3><ul>{data.factors.map((factor) => <li key={factor.name}><span>{factor.name}</span><span>{factor.value} {factor.value === 1 ? 'day' : 'days'}</span></li>)}</ul></>}
      </section><p className="book-reflection-caption">These are observations from saved check-ins, not scores or explanations for how you feel. Free writes are not assigned a mood.</p>
      <footer className="book-page-number"><span>{label}</span>{pageNumber + 1}</footer>
    </aside>
  </>;
}
