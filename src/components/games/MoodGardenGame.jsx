const gardenSprites = [
  new URL('../../../img/1111x_PixelPlants/pixelplants_sunflowers/PP_sunflowers1/PP_SF1-1.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_rosesred/PP_rosesred1/PP_RR1-1.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_flowerswhite_allfixed/PP_whiteflowers1/PP_WF1-1.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_mixedfoliage/previews_MF/PP_MF_preview (1).png', import.meta.url).href
];

export function MoodGardenGame({ mood, onSave }) {
  const growth = Math.max(2, Math.min(8, mood.score || 5));
  return (
    <article className="minigame-card">
      <h3>Mood Garden</h3>
      <p>Your current mood grows a small garden preview.</p>
      <div className="garden-preview" style={{ '--garden-color': mood.color }}>
        {Array.from({ length: growth }, (_, index) => (
          <img
            alt=""
            key={index}
            src={gardenSprites[index % gardenSprites.length]}
            style={{ '--plant-delay': `${index * 0.08}s` }}
          />
        ))}
      </div>
      <button onClick={() => onSave('Mood Garden', `${mood.key} grew ${growth} garden pieces today.`, ['mood-garden'])} type="button">Save garden</button>
    </article>
  );
}
