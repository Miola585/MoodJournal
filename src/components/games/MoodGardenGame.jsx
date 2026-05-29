export function MoodGardenGame({ mood, onSave }) {
  const growth = Math.max(2, Math.min(8, mood.score || 5));
  return (
    <article className="minigame-card">
      <h3>Featured: Mood Garden</h3>
      <p>Your current mood grows a small garden preview.</p>
      <div className="garden-preview" style={{ '--garden-color': mood.color }}>
        {Array.from({ length: growth }, (_, index) => <span key={index} />)}
      </div>
      <button onClick={() => onSave('Mood Garden', `${mood.key} grew ${growth} garden pieces today.`, ['mood-garden'])} type="button">Save garden</button>
    </article>
  );
}
