const cafeArtUrl = new URL('../../../img/Theme Img/coffecup.png', import.meta.url).href;

export function ThemeAtmosphere() {
  return (
    <div className="theme-atmosphere" aria-hidden="true">
      <span className="atmosphere-layer layer-one" />
      <span className="atmosphere-layer layer-two" />
      <span className="atmosphere-layer layer-three" />
      <span className="atmosphere-particles" />
      <img className="theme-art-image theme-art-cafe-image" src={cafeArtUrl} alt="" />
      <svg className="theme-art theme-art-ocean" viewBox="0 0 1200 720" preserveAspectRatio="none">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M84 548c62-42 124 42 186 0s124 42 186 0 124 42 186 0 124 42 186 0 124 42 186 0" />
          <path d="M150 604c42-28 84 28 126 0s84 28 126 0" />
          <path d="M880 138c44 0 80 36 80 80 0 58-62 100-80 124-18-24-80-66-80-124 0-44 36-80 80-80z" />
          <path d="M824 218c30 10 82 10 112 0M846 274c20 8 48 8 68 0" />
          <circle cx="214" cy="172" r="18" />
          <circle cx="292" cy="230" r="10" />
          <circle cx="1028" cy="424" r="14" />
        </g>
      </svg>
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
          <path d="M906 122c-54 18-82 76-64 130s76 82 130 64c-50 56-144 34-166-40s26-150 100-154z" />
          <path d="M178 206h86l70 58 84-96 92 160 80-86" />
          <circle cx="178" cy="206" r="8" />
          <circle cx="264" cy="206" r="8" />
          <circle cx="334" cy="264" r="8" />
          <circle cx="418" cy="168" r="8" />
          <circle cx="510" cy="328" r="8" />
          <circle cx="590" cy="242" r="8" />
          <path d="M168 556h18M177 547v18M1042 466h22M1053 455v22M948 560h14M955 553v14" />
        </g>
      </svg>
      <svg className="theme-art theme-art-sunrise" viewBox="0 0 1200 720" preserveAspectRatio="none">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M196 562h320" />
          <path d="M278 562a78 78 0 0 1 156 0" />
          <path d="M356 420v-58M292 446l-42-42M420 446l42-42M246 514h-60M526 514h-60" />
          <path d="M790 214c34-44 104-26 114 28 42-18 84 12 84 58H750c0-48 48-80 92-62" />
          <path d="M738 384h272M786 436h164" />
        </g>
      </svg>
    </div>
  );
}
