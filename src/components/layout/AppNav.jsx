import { navLabels } from '../../data/journalData';

export function AppNav({ activeView, views, onOpen }) {
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
