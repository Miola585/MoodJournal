import { constellationStars } from '../games/gameUtils';
import '../../styles/library.css';

export function ConstellationDecal({ constellation }) {
  const ratio = Number.isFinite(constellation.aspectRatio) && constellation.aspectRatio > 0 ? constellation.aspectRatio : 1;
  const stars = (constellation.starPositions || constellation.stars || []).map((star) => typeof star === 'object' ? star : constellationStars.find((value) => value.id === star)).filter(Boolean);
  const lines = constellation.connections || [];
  // Frame the saved drawing, not the unused sky, without changing its geometry.
  const xs = stars.map((star) => star.x), ys = stars.map((star) => star.y / ratio);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  const padding = Math.max(4, Math.max(width, height) * .1);
  const viewBox = stars.length ? `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}` : `0 0 100 ${100 / ratio}`;
  return <svg className="constellation-decal" viewBox={viewBox} role="img" aria-label={`${constellation.name || 'Constellation'}, ${lines.length} connections`}>
    {lines.map(([from, to], index) => {
      const a = stars.find((star) => star.id === from);
      const b = stars.find((star) => star.id === to);
      return a && b ? <line key={index} x1={a.x} y1={a.y / ratio} x2={b.x} y2={b.y / ratio} /> : null;
    })}
    {stars.map((star) => <g key={star.id}><circle cx={star.x} cy={star.y / ratio} r="2.6" className="decal-halo" /><path d={`M${star.x - 1.8} ${star.y / ratio}h3.6M${star.x} ${star.y / ratio - 1.8}v3.6`} /><circle cx={star.x} cy={star.y / ratio} r=".6" /></g>)}
  </svg>;
}
