import { useMemo, useState } from 'react';
import { matchThemes } from './gameUtils';

export function EmotionalMatchGame({ onSave }) {
  const cards = useMemo(() => matchThemes.flatMap((theme) => [
    { id: `${theme.id}-emotion`, theme: theme.id, label: theme.label },
    { id: `${theme.id}-strategy`, theme: theme.id, label: theme.pieces[0] },
    { id: `${theme.id}-affirmation`, theme: theme.id, label: theme.pieces[1] },
    { id: `${theme.id}-symbol`, theme: theme.id, label: theme.pieces[2] }
  ]).sort(() => Math.random() - 0.5), []);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const chooseCard = (card) => {
    if (selected.includes(card.id) || matched.includes(card.id) || selected.length === 2) return;
    const nextSelected = [...selected, card.id];
    setSelected(nextSelected);
    if (nextSelected.length === 2) {
      const first = cards.find((item) => item.id === nextSelected[0]);
      if (first?.theme === card.theme) {
        setMatched((current) => [...current, ...nextSelected]);
        setSelected([]);
      } else {
        setTimeout(() => setSelected([]), 700);
      }
    }
  };
  return (
    <article className="minigame-card">
      <h3>Featured: Emotional Match</h3>
      <p>Match a feeling with a strategy, affirmation, or symbol from the same mood family.</p>
      <div className="match-grid">
        {cards.map((card) => {
          const visible = selected.includes(card.id) || matched.includes(card.id);
          return <button className={visible ? 'match-card visible' : 'match-card'} key={card.id} onClick={() => chooseCard(card)} type="button">{visible ? card.label : '?'}</button>;
        })}
      </div>
      <button disabled={matched.length < cards.length} onClick={() => onSave('Emotional Match', 'Completed the emotional matching game.', ['emotional-match'])} type="button">Save win</button>
    </article>
  );
}
