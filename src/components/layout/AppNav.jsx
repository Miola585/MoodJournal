import { useState } from 'react';
import { navLabels } from '../../data/journalData';

const primaryViews = ['checkin', 'entries', 'calendar', 'activities'];

export function AppNav({ activeView, views, onOpen, variant = 'body', includeSettings = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const viewSet = new Set(views);
  const primary = primaryViews.filter((item) => viewSet.has(item));
  const secondary = views.filter((item) => !primaryViews.includes(item));
  if (includeSettings) secondary.push('settings');
  const openView = (item) => {
    setMenuOpen(false);
    onOpen(item);
  };
  if (variant === 'top') {
    return (
      <nav className="topnav" aria-label="App sections">
        {primary.map((item) => (
          <button className={activeView === item ? 'topnav-link active' : 'topnav-link'} key={item} onClick={() => openView(item)} type="button">
            {navLabels[item] || item}
          </button>
        ))}
        {secondary.length > 0 && (
          <div className="more-nav">
            <button className="topnav-link" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} type="button">More</button>
            {menuOpen && (
              <div className="more-nav-menu">
                {secondary.map((item) => (
                  <button className={activeView === item ? 'active' : ''} key={item} onClick={() => openView(item)} type="button">
                    {navLabels[item] || item}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav className="body-tabs" aria-label="App sections">
      {views.map((item) => (
        <button className={activeView === item ? 'active' : ''} key={item} onClick={() => onOpen(item)} type="button">
          {navLabels[item] || item}
        </button>
      ))}
    </nav>
  );
}
