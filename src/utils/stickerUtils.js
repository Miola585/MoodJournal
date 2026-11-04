const placementIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;

export function normalizeStickerPlacements(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 40) throw new Error('An entry has an invalid sticker collection.');
  const ids = new Set();
  return value.map((placement) => {
    if (!placement || typeof placement !== 'object' || Array.isArray(placement)
      || !placementIdPattern.test(placement.id) || !placementIdPattern.test(placement.stickerId)
      || ids.has(placement.id)) {
      throw new Error('An entry has an invalid sticker placement.');
    }
    ids.add(placement.id);
    const { x, y, size, rotation, layer, region, heightScale } = placement;
    if (![x, y, size, rotation, layer].every(Number.isFinite)
      || x < 0 || x > 100 || y < 0 || y > 100
      || size < 10 || size > 48 || rotation < -180 || rotation > 180
      || !Number.isInteger(layer) || layer < 0 || layer > 39
      || (heightScale !== undefined && (!Number.isFinite(heightScale) || heightScale < .25 || heightScale > 1))
      || (region !== undefined && region !== 'details' && region !== 'page')) {
      throw new Error('An entry has an invalid sticker position.');
    }
    return { id: placement.id, stickerId: placement.stickerId, x, y, size, rotation, layer, ...(region ? { region } : {}), ...(heightScale !== undefined ? { heightScale } : {}) };
  });
}

export function createStickerPlacement(stickerId, current = [], region = 'writing') {
  const offset = current.length % 5;
  return { id: crypto.randomUUID(), stickerId, x: 58 - offset * 7, y: 32 + offset * 10, size: 32, rotation: 0, layer: current.length, ...(['details', 'page'].includes(region) ? { region } : {}) };
}

export function clampStickerPosition(value) {
  return Math.max(0, Math.min(100, value));
}

export function stickerHeightScale(value) {
  return Number.isFinite(value) ? Math.max(.25, Math.min(1, value)) : 1;
}

export function stickerOnPage(placement, regions) {
  if (placement.region === 'page') return placement;
  const region = regions?.[placement.region === 'details' ? 'details' : 'writing'];
  if (!region) return placement;
  return { ...placement, x: region.x + placement.x * region.width, y: region.y + placement.y * region.height };
}

export function fitStickerOnPage(placement, crop, bounds) {
  let longEdge = Math.max(90, Math.min(310, placement.size * 6.5));
  if (!bounds?.width || !bounds?.height) return { x: placement.x, y: placement.y, longEdge };
  const [, , width, height] = crop;
  const scale = longEdge / Math.max(width, height);
  const radians = placement.rotation * Math.PI / 180;
  const c = Math.abs(Math.cos(radians)), s = Math.abs(Math.sin(radians));
  const w = width * scale, h = height * scale * stickerHeightScale(placement.heightScale);
  const rotatedWidth = w * c + h * s, rotatedHeight = w * s + h * c;
  // Leave space for selection outlines and touch handles, including after rotation.
  const inset = 18;
  const fit = Math.min(1, Math.max(1, bounds.width - inset * 2) / rotatedWidth, Math.max(1, bounds.height - inset * 2) / rotatedHeight);
  longEdge *= fit;
  const xInset = Math.min(50, (rotatedWidth * fit / 2 + inset) / bounds.width * 100);
  const yInset = Math.min(50, (rotatedHeight * fit / 2 + inset) / bounds.height * 100);
  return { x: Math.max(xInset, Math.min(100 - xInset, placement.x)), y: Math.max(yInset, Math.min(100 - yInset, placement.y)), longEdge };
}
