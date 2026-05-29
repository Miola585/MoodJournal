const gardenSprites = [
  new URL('../../../img/1111x_PixelPlants/pixelplants_sunflowers/Growing Sunflowers/PP_SF1-1.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_rosesred/Baby Roses/PP_RR11-1.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_flowerswhite_allfixed/Baby White flowers/PP_WF1-10.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_mixedfoliage/Leaves and mixed single flowers/PP_MF12-10.png', import.meta.url).href,
  new URL('../../../img/1111x_PixelPlants/pixelplants_sunflowers/Matured Sunflowers/PP_SF10-1.png', import.meta.url).href
];

const weatherByMood = {
  Happy: 'sunny',
  Content: 'mild',
  Excited: 'sparkly',
  Calm: 'misty',
  Anxious: 'breezy',
  Sad: 'rainy',
  Angry: 'warm',
  Lonely: 'moonlit',
  Grateful: 'golden',
  Tired: 'cloudy',
  Overwhelmed: 'foggy',
  Panic: 'stormy',
  Numb: 'quiet'
};

export function MoodGardenGame({ mood, mainToday }) {
  const growth = Math.max(2, Math.min(8, mood.score || 5));
  const intensity = Number(mainToday?.intensity || mood.score || 5);
  const weather = weatherByMood[mood.key] || 'mild';
  return (
    <article className="minigame-card">
      <h3>Mood Garden</h3>
      <p>Your current mood shapes the garden weather and growth stage.</p>
      <div className={`garden-preview garden-weather-${weather}`} style={{ '--garden-color': mood.color }}>
        {Array.from({ length: growth }, (_, index) => (
          <img
            alt=""
            key={index}
            src={gardenSprites[index % gardenSprites.length]}
            style={{ '--plant-delay': `${index * 0.08}s` }}
          />
        ))}
      </div>
      <div className="meta garden-meta">
        <span>{mood.key}</span>
        <span>{weather}</span>
        <span>growth {Math.ceil(intensity / 2)}/5</span>
      </div>
    </article>
  );
}
