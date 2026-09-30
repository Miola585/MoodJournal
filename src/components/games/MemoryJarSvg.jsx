export function MemoryJarSvg({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={`memory-jar-illustration ${className}`.trim()}
      viewBox="0 0 320 420"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="memory-jar-svg-body"
        d="M96 68v36c0 13-7 22-22 34-17 14-26 34-26 56v151c0 43 27 68 70 68h84c43 0 70-25 70-68V194c0-22-9-42-26-56-15-12-22-21-22-34V68Z"
      />
      <rect className="memory-jar-svg-rim" x="82" y="20" width="156" height="52" rx="12" />
      <path className="memory-jar-svg-rim-line" d="M89 36h142M89 49h142M89 62h142" />
      <rect className="memory-jar-svg-panel" x="88" y="177" width="144" height="137" rx="48" />
      <path className="memory-jar-svg-highlight" d="M81 164c-9 17-13 35-13 58v105c0 23 8 42 23 55" />
      <path className="memory-jar-svg-glint" d="M231 146c13 12 20 28 22 48" />
      <path className="memory-jar-svg-base" d="M89 374c21 18 121 18 142 0" />
    </svg>
  );
}
