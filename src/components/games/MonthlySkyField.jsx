import '../../styles/personalNightSky.css';

export function SkyBackground() {
  return <svg className="personal-sky-background" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {Array.from({ length: 70 }, (_, index) => <circle key={index} cx={(index * 173 + 31) % 1200} cy={(index * 113 + 71) % 730} r={index % 3 === 0 ? 1.2 : .7} fill="currentColor" />)}
    <path d="M0 740Q230 645 480 740T1200 700V800H0Z" fill="#181e32" />
    <path d="M0 780Q280 710 610 775T1200 755V800H0Z" fill="#111726" />
  </svg>;
}

export function MonthlySkyField({ stars, selectedDay, onSelect, empty }) {
  return <div className="personal-sky-field" aria-label="Saved journal days">
    {stars.length ? stars.map((star) => <button key={star.id} type="button" className="personal-sky-star"
      aria-label={`${star.dateKey}: ${star.label}${star.intensity == null ? '' : `, intensity ${star.intensity} of 10`}, ${star.shape.points}-point star, ${star.entryCount} ${star.entryCount === 1 ? 'entry' : 'entries'}`}
      aria-pressed={selectedDay === star.dateKey} onClick={() => onSelect(star.dateKey)}
      style={{ '--sky-x': `${star.x}%`, '--sky-wide-x': `${star.wideX}%`, top: `${star.y}%`, '--star-color': star.starColor }}>
      <svg className="galaxy-star" viewBox="0 0 100 100" aria-hidden="true"><polygon className="galaxy-star-glow" points={star.shape.polygon} /><polygon className="galaxy-star-core" points={star.shape.polygon} /></svg>
    </button>) : <div className="personal-sky-empty">{empty}</div>}
  </div>;
}
