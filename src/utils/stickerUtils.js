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
    const { x, y, size, rotation, layer, region } = placement;
    if (![x, y, size, rotation, layer].every(Number.isFinite)
      || x < 0 || x > 100 || y < 0 || y > 100
      || size < 10 || size > 48 || rotation < -180 || rotation > 180
      || !Number.isInteger(layer) || layer < 0 || layer > 39
      || (region !== undefined && region !== 'details')) {
      throw new Error('An entry has an invalid sticker position.');
    }
    return { id: placement.id, stickerId: placement.stickerId, x, y, size, rotation, layer, ...(region === 'details' ? { region } : {}) };
  });
}

export function createStickerPlacement(stickerId, current = [], region = 'writing') {
  const offset = current.length % 5;
  return { id: crypto.randomUUID(), stickerId, x: 58 - offset * 7, y: 32 + offset * 10, size: 32, rotation: 0, layer: current.length, ...(region === 'details' ? { region } : {}) };
}

export function clampStickerPosition(value) {
  return Math.max(0, Math.min(100, value));
}
