const immersiveGames = new Set(['garden', 'constellation', 'orbit']);

export function GamePageShell({ game, label, children }) {
  const layout = immersiveGames.has(game) ? 'immersive' : 'contained';
  return (
    <section className={`game-route-shell game-page game-page-${game} game-layout-${layout}`} aria-label={`${label} game`}>
      {children}
    </section>
  );
}
