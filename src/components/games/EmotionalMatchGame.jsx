import { useState } from 'react';
import { matchPairs } from './gameUtils';

export function EmotionalMatchGame() {
  const [cards, setCards] = useState(createDeck);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const [wrongPair, setWrongPair] = useState([]);
  const [moves, setMoves] = useState(0);
  const matchedPairs = matchPairs.filter((pair) => (
    cards.filter((card) => card.pairId === pair.id).every((card) => matched.includes(card.id))
  ));
  const complete = matched.length === cards.length;

  const chooseCard = (card) => {
    if (selected.includes(card.id) || matched.includes(card.id) || selected.length === 2 || wrongPair.length > 0) return;
    const nextSelected = [...selected, card.id];
    setSelected(nextSelected);
    if (nextSelected.length !== 2) return;

    setMoves((current) => current + 1);
    const first = cards.find((item) => item.id === nextSelected[0]);
    if (first?.pairId === card.pairId && first.id !== card.id) {
      setMatched((current) => [...current, ...nextSelected]);
      setSelected([]);
      return;
    }

    setWrongPair(nextSelected);
    setTimeout(() => {
      setSelected([]);
      setWrongPair([]);
    }, 760);
  };

  const resetGame = () => {
    setCards(createDeck());
    setSelected([]);
    setMatched([]);
    setWrongPair([]);
    setMoves(0);
  };

  return (
    <div className="game-surface match-surface">
      <p className="game-instruction">Flip two cards and find the support that belongs with each feeling.</p>
      <div className="match-status-row">
        <span>Moves: {moves}</span>
        <span>Matches: {matchedPairs.length}/{matchPairs.length}</span>
        <button aria-label="Reset Emotional Match" className="secondary" onClick={resetGame} type="button">Reset</button>
      </div>
      <div className="match-grid emotional-match-grid" role="group" aria-label="Emotional Match cards">
        {cards.map((card) => {
          const visible = selected.includes(card.id) || matched.includes(card.id) || wrongPair.includes(card.id);
          const isMatched = matched.includes(card.id);
          return (
            <button
              aria-label={visible ? card.label : 'Hidden card'}
              className={`match-card reflection-card ${visible ? 'visible' : ''} ${isMatched ? 'matched' : ''} ${wrongPair.includes(card.id) ? 'wrong' : ''}`}
              key={card.id}
              onClick={() => chooseCard(card)}
              type="button"
            >
              <span className="card-back-symbol" aria-hidden="true" />
              <span className="card-face">{visible ? card.label : ''}</span>
              {isMatched && <span className="matched-marker">Matched</span>}
            </button>
          );
        })}
      </div>
      {complete && (
        <div className="match-complete">
          <p className="success-message">All matched. Pick one support to carry with you.</p>
          <div className="support-chip-row">
            {matchedPairs.map((pair) => <span key={pair.id}>{pair.support}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function createDeck() {
  const deck = matchPairs.flatMap((pair) => [
    { id: `${pair.id}-feeling`, pairId: pair.id, type: 'feeling', label: pair.feeling },
    { id: `${pair.id}-support`, pairId: pair.id, type: 'support', label: pair.support }
  ]);
  return deck.sort(() => Math.random() - 0.5);
}
