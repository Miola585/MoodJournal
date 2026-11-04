import { useId } from 'react';
import '../../styles/destinationArt.css';

// Adapted from the user's Figma StudioArt; kept separate from the sticker catalog.
export function DestinationArt({ kind, compact = false }) {
  const id = useId().replace(/:/g, '');
  const viewBox = compact ? (kind === 'wonders' ? '65 0 280 280' : '100 38 200 200') : '0 0 400 300';
  return <svg className={`destination-art destination-art-${kind}`} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--scene-sky)" /><stop offset="1" stopColor="var(--scene-haze)" />
      </linearGradient>
    </defs>
    <path d="M0 0h400v300H0z" fill={`url(#${id}-sky)`} />
    {kind === 'wonders' && <g transform="translate(0 24)">
      <ellipse cx="209" cy="211" rx="111" ry="10" fill="var(--scene-line)" opacity=".1" />
      <g transform="rotate(-8 175 125)">
        <rect x="91" y="43" width="179" height="155" rx="8" fill="var(--scene-leaf)" />
        <rect x="99" y="39" width="166" height="151" rx="5" fill="var(--journal-paper)" stroke="var(--scene-line)" />
        <path d="M118 64h53m-53 15h78m-78 84h105m-105 10h70" stroke="var(--scene-line)" strokeWidth="2" opacity=".25" />
        <path d="M132 144q48-4 54-50-48-5-54 50Z" fill="var(--scene-leaf)" /><path d="m130 149 45-43" stroke="var(--scene-stem)" strokeWidth="2" />
      </g>
      <path d="m262 153 47 45" stroke="var(--scene-stem)" strokeWidth="16" strokeLinecap="round" />
      <circle cx="236" cy="123" r="51" fill="var(--scene-sky)" fillOpacity=".65" stroke="var(--scene-line)" strokeWidth="5" />
      <path d="M207 101q17-20 39-13" stroke="var(--journal-paper)" strokeWidth="5" strokeLinecap="round" />
      <path d="M221 143q26-5 33-35-30-3-33 35Z" fill="var(--scene-leaf)" /><path d="m220 147 24-28" stroke="var(--scene-stem)" strokeWidth="2" />
      <circle cx="309" cy="64" r="17" fill="var(--scene-sun)" />
    </g>}
    {kind === 'garden' && <g transform="translate(0 25)">
      <circle cx="304" cy="63" r="27" fill="var(--scene-sun)" />
      <path d="M0 180Q80 118 194 172T400 145V300H0Z" fill="var(--scene-line)" opacity=".22" />
      <path d="M0 213Q120 145 243 193T400 185V300H0Z" fill="var(--scene-leaf)" opacity=".7" />
      <g stroke="var(--scene-stem)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M86 260q9-77 3-113m-2 51q-26-9-26-28 25 3 26 28m3-17q19-5 24-21-20-4-24 21" />
        <path d="M271 260q-7-76-4-116m1 54q24-5 25-23-23 1-25 23m-1-20q-19-1-24-16 20-3 24 16" />
      </g>
      <g fill="var(--scene-star)">
        {[0, 60, 120, 180, 240, 300].map((rotation) => <ellipse key={rotation} cx="88" cy="134" rx="8" ry="13" transform={`rotate(${rotation} 88 145)`} />)}
        {[0, 72, 144, 216, 288].map((rotation) => <ellipse key={rotation} cx="268" cy="132" rx="8" ry="13" transform={`rotate(${rotation} 268 144)`} />)}
      </g>
      <circle cx="88" cy="145" r="6" fill="var(--scene-sun)" />
      <circle cx="268" cy="144" r="6" fill="var(--scene-sun)" />
      <path d="M160 233q23-42 59-36" stroke="var(--scene-stem)" strokeWidth="2" />
      <ellipse cx="186" cy="207" rx="14" ry="5" fill="var(--scene-leaf)" transform="rotate(-30 186 207)" />
    </g>}
    {kind === 'orbit' && <g transform="translate(0 25)">
      <g stroke="var(--scene-line)" opacity=".55">
        <ellipse cx="200" cy="120" rx="55" ry="39" />
        <ellipse cx="200" cy="120" rx="105" ry="73" />
        <ellipse cx="200" cy="120" rx="158" ry="101" strokeDasharray="2 6" />
      </g>
      <circle cx="200" cy="120" r="24" fill="var(--scene-sun)" />
      <circle cx="147" cy="117" r="10" fill="var(--scene-star)" />
      <circle cx="260" cy="61" r="15" fill="var(--scene-tint)" />
      <circle cx="323" cy="176" r="12" fill="var(--scene-leaf)" />
      <circle cx="67" cy="65" r="8" fill="var(--scene-star)" />
    </g>}
    {kind === 'sky' && <g transform="translate(0 25)">
      <circle cx="304" cy="63" r="27" fill="var(--scene-sun)" />
      <path d="m73 90 63 66 58-98 77 96 61-36" stroke="var(--scene-line)" strokeWidth="1.5" />
      {[[73, 90], [136, 156], [194, 58], [271, 154], [332, 118]].map(([x, y]) => <path key={x} d={`M${x} ${y - 5}v10m-5-5h10`} stroke="var(--scene-star)" strokeWidth="2" strokeLinecap="round" />)}
      {[[41, 42], [97, 211], [167, 30], [224, 195], [370, 67], [345, 209], [36, 172], [246, 99]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="var(--scene-star)" />)}
      <path d="M0 222q80-42 183-15T400 202v98H0Z" fill="var(--scene-leaf)" opacity=".3" />
    </g>}
    {kind === 'jar' && <g transform="translate(0 15)">
      <ellipse cx="200" cy="217" rx="82" ry="8" fill="var(--scene-line)" opacity=".12" />
      <path d="M171 53v23q0 9-11 18l-11 10q-5 5-5 14v64q0 30 35 30h46q32 0 32-30v-64q0-9-6-14l-11-10q-10-9-10-18V53Z" fill="var(--journal-paper)" fillOpacity=".5" stroke="var(--scene-line)" strokeWidth="1.5" />
      <rect x="168" y="43" width="66" height="15" rx="4" fill="var(--scene-leaf)" stroke="var(--scene-line)" />
      <path d="M174 48h54m-54 5h54" stroke="var(--scene-line)" opacity=".5" />
      <rect x="162" y="176" width="43" height="17" rx="5" fill="var(--scene-leaf)" transform="rotate(-9 162 176)" />
      <rect x="207" y="163" width="33" height="19" rx="5" fill="var(--scene-sun)" transform="rotate(12 207 163)" />
      <rect x="167" y="143" width="38" height="18" rx="5" fill="var(--scene-star)" transform="rotate(6 167 143)" />
      <rect x="205" y="129" width="34" height="16" rx="4" fill="var(--scene-line)" transform="rotate(-6 205 129)" />
      <path d="M157 116v60q0 18 9 23" stroke="var(--journal-paper)" strokeWidth="5" strokeLinecap="round" opacity=".8" />
      <path d="m102 86 3 7 7 2-7 3-3 7-2-7-7-3 7-2Z" fill="var(--scene-sun)" />
      <rect x="278" y="99" width="30" height="17" rx="4" fill="var(--scene-star)" transform="rotate(-16 278 99)" />
    </g>}
    {(kind === 'breathe' || kind === 'senses') && <g transform="translate(0 18)">
      <circle cx="200" cy="120" r="91" fill="var(--scene-leaf)" opacity=".12" />
      <circle cx="200" cy="120" r="68" fill="var(--scene-leaf)" opacity=".22" />
      {kind === 'breathe' ? <>
      <circle cx="200" cy="120" r="43" fill="var(--scene-leaf)" />
      <path d="M178 119q22 11 44 0" stroke="var(--journal-paper)" strokeWidth="2" strokeLinecap="round" />
      <path d="M167 88q32-28 65 0" stroke="var(--journal-paper)" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
      </> : <>
        <path d="M142 121q58-68 116 0-58 68-116 0Z" fill="var(--journal-paper)" stroke="var(--scene-line)" strokeWidth="1.5" />
        <circle cx="200" cy="121" r="23" fill="var(--scene-leaf)" />
        <circle cx="200" cy="121" r="10" fill="var(--scene-stem)" />
        <circle cx="207" cy="113" r="4" fill="var(--scene-star)" />
      </>}
    </g>}
  </svg>;
}
