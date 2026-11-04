import { stickerHeightScale } from '../../utils/stickerUtils';

export function stickerArtworkSize(sticker, longEdge, heightScale) {
  const [, , width, height] = sticker.crop;
  const scale = longEdge / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale * stickerHeightScale(heightScale)) };
}

export function StickerArtwork({ sticker, className = '', longEdge, heightScale, style }) {
  const [x, y, width, height] = sticker.crop;
  const size = stickerArtworkSize(sticker, longEdge, heightScale);
  return (
    <span className={`sticker-artwork ${className}`} style={{ ...size, ...style }}>
      <img
        alt=""
        draggable="false"
        src={sticker.image}
        style={{
          width: `${256 / width * 100}%`,
          height: `${256 / height * 100}%`,
          left: `${-x / width * 100}%`,
          top: `${-y / height * 100}%`
        }}
      />
    </span>
  );
}
