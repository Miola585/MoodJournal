const cafeArtUrl = new URL('../../../img/Theme Img/coffecup.png', import.meta.url).href;
const cafeNotesUrl = new URL('../../../img/Theme Img/notes.png', import.meta.url).href;
const cafeCatUrl = new URL('../../../img/Theme Img/cat_silhouette.png', import.meta.url).href;
const cafePumpkinUrl = new URL('../../../img/Theme Img/cafe-pumpkin-accent.png', import.meta.url).href;
const cafeLeafUrl = new URL('../../../img/Theme Img/cafe-fall-leaf-accent.png', import.meta.url).href;
const seafoamWaveUrl = new URL('../../../img/Theme Img/waves2.png', import.meta.url).href;
const seafoamShellUrl = new URL('../../../img/Theme Img/shell.png', import.meta.url).href;
const seafoamMarineShellUrl = new URL('../../../img/Theme Img/marine_shell.png', import.meta.url).href;
const seafoamBubblesUrl = new URL('../../../img/Theme Img/bubbles.png', import.meta.url).href;
const seafoamSeashellUrl = new URL('../../../img/Theme Img/seashell.png', import.meta.url).href;
const seafoamFishUrl = new URL('../../../img/Theme Img/fish.png', import.meta.url).href;
const seafoamStarfishUrl = new URL('../../../img/Theme Img/starfish.png', import.meta.url).href;
const seafoamCoralUrl = new URL('../../../img/Theme Img/coral.png', import.meta.url).href;
const nightCelestialUrl = new URL('../../../img/Theme Img/night-celestial-accent.png', import.meta.url).href;
const nightLightMoonUrl = new URL('../../../img/Theme Img/night-moon2-light-accent.png', import.meta.url).href;
const nightStarFlareUrl = new URL('../../../img/Theme Img/star_flare.png', import.meta.url).href;
const nightWhiteTwinkleUrl = new URL('../../../img/Theme Img/white_twinkle.png', import.meta.url).href;
const nightBannerUrl = new URL('../../../img/Theme Img/night-banner-accent.png', import.meta.url).href;
const nightSkyAccentUrl = new URL('../../../img/Theme Img/night-sky-accent-small.png', import.meta.url).href;
const gardenFlowersUrl = new URL('../../../img/Theme Img/garden-flowers-accent.png', import.meta.url).href;
const gardenLeavesUrl = new URL('../../../img/Theme Img/garden-leaves-accent.png', import.meta.url).href;
const gardenDaisyUrl = new URL('../../../img/Theme Img/garden-daisy-accent.png', import.meta.url).href;
const sunriseSunUrl = new URL('../../../img/Theme Img/sunrise-sun-accent.png', import.meta.url).href;
const sunriseRedSunUrl = new URL('../../../img/Theme Img/sunrise-red-sun-accent.png', import.meta.url).href;
const sunriseCloudUrl = new URL('../../../img/Theme Img/sunset_cloud.png', import.meta.url).href;
const sunriseTwinkleUrl = new URL('../../../img/Theme Img/yellow_twinkle.png', import.meta.url).href;
const sunriseWaveUrl = new URL('../../../img/Theme Img/sunrise-wave-accent.png', import.meta.url).href;
const sunriseGradientUrl = new URL('../../../img/Theme Img/sunrise-gradient-accent.png', import.meta.url).href;

export function ThemeAtmosphere() {
  return (
    <div className="theme-atmosphere" aria-hidden="true">
      <span className="atmosphere-layer layer-one" />
      <span className="atmosphere-layer layer-two" />
      <span className="atmosphere-layer layer-three" />
      <span className="atmosphere-particles" />
      <img className="theme-art-image theme-art-cafe-image" src={cafeArtUrl} alt="" />
      <img className="theme-art-image theme-art-cafe-notes" src={cafeNotesUrl} alt="" />
      <img className="theme-art-image theme-art-cafe-cat" src={cafeCatUrl} alt="" />
      <img className="theme-art-image theme-art-cafe-pumpkin" src={cafePumpkinUrl} alt="" />
      <img className="theme-art-image theme-art-cafe-leaf" src={cafeLeafUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-wave" src={seafoamWaveUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-shell" src={seafoamShellUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-marine-shell" src={seafoamMarineShellUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-bubbles" src={seafoamBubblesUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-seashell" src={seafoamSeashellUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-fish" src={seafoamFishUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-starfish" src={seafoamStarfishUrl} alt="" />
      <img className="theme-art-image theme-art-ocean-coral" src={seafoamCoralUrl} alt="" />
      <img className="theme-art-image theme-art-night-celestial" src={nightCelestialUrl} alt="" />
      <img className="theme-art-image theme-art-night-moon-light" src={nightLightMoonUrl} alt="" />
      <img className="theme-art-image theme-art-night-star-flare" src={nightStarFlareUrl} alt="" />
      <img className="theme-art-image theme-art-night-twinkle-dark" src={nightWhiteTwinkleUrl} alt="" />
      <img className="theme-art-image theme-art-night-banner-light" src={nightBannerUrl} alt="" />
      <img className="theme-art-image theme-art-night-accent-dark" src={nightSkyAccentUrl} alt="" />
      <img className="theme-art-image theme-art-garden-flowers" src={gardenFlowersUrl} alt="" />
      <img className="theme-art-image theme-art-garden-leaves" src={gardenLeavesUrl} alt="" />
      <img className="theme-art-image theme-art-garden-daisy" src={gardenDaisyUrl} alt="" />
      <img className="theme-art-image theme-art-garden-daisy-alt" src={gardenDaisyUrl} alt="" />
      <img className="theme-art-image theme-art-sunrise-sun" src={sunriseSunUrl} alt="" />
      <img className="theme-art-image theme-art-sunrise-red-sun" src={sunriseRedSunUrl} alt="" />
      <img className="theme-art-image theme-art-sunrise-cloud" src={sunriseCloudUrl} alt="" />
      <img className="theme-art-image theme-art-sunrise-twinkle" src={sunriseTwinkleUrl} alt="" />
      <img className="theme-art-image theme-art-sunrise-wave" src={sunriseWaveUrl} alt="" />
      <img className="theme-art-image theme-art-sunrise-gradient" src={sunriseGradientUrl} alt="" />
      <svg className="theme-art theme-art-garden" viewBox="0 0 1200 720" preserveAspectRatio="none">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M156 626c24-90 66-156 128-198" />
          <path d="M222 508c-64-14-92-64-74-118 64 10 96 54 74 118z" />
          <path d="M286 426c70-14 116-56 128-126-68 8-112 46-128 126z" />
          <path d="M958 604c-10-78 10-146 60-204" />
          <path d="M1018 400c-52-8-84-44-86-98 54 4 86 38 86 98z" />
          <path d="M1016 402c54-6 94-42 108-98-58 0-94 32-108 98z" />
        </g>
      </svg>
      <svg className="theme-art theme-art-night" viewBox="0 0 1200 720" preserveAspectRatio="none">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M178 206h86l70 58 84-96 92 160 80-86" />
          <circle cx="178" cy="206" r="8" />
          <circle cx="264" cy="206" r="8" />
          <circle cx="334" cy="264" r="8" />
          <circle cx="418" cy="168" r="8" />
          <circle cx="510" cy="328" r="8" />
          <circle cx="590" cy="242" r="8" />
          <path d="M86 610h24M98 598v24M216 676h16M224 668v16M336 508h18M345 499v18" />
          <path d="M728 110h12M734 104v12M962 164h18M971 155v18M1106 342h22M1117 331v22" />
          <path d="M776 602h14M783 595v14M1024 656h20M1034 646v20M112 382h12M118 376v12" />
        </g>
      </svg>
    </div>
  );
}
