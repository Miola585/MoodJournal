import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { navLabels } from '../../data/journalData';

const primaryViews = ['checkin', 'entries', 'calendar', 'activities'];

export function AppNav({ activeView, views, onOpen, variant = 'body', includeSettings = false, moreActions = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const viewSet = new Set(views);
  const primary = primaryViews.filter((item) => viewSet.has(item));
  const secondary = views.filter((item) => !primaryViews.includes(item));
  if (includeSettings) secondary.push('settings');
  const openView = (item) => {
    setMenuOpen(false);
    setMobileOpen(false);
    onOpen(item);
  };
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [activeView]);
  useEffect(() => {
    if (!mobileOpen && !menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    const closeOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [mobileOpen, menuOpen]);
  if (variant === 'top') {
    return (
      <nav className="topnav-shell" aria-label="App sections" ref={navRef}>
        <button
          aria-controls="primary-app-navigation"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          className="topnav-menu-button icon-button"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
        >
          {mobileOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
        <div className={mobileOpen ? 'topnav open' : 'topnav'} id="primary-app-navigation">
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
                  {moreActions}
                </div>
              )}
            </div>
          )}
        </div>
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
