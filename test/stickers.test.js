import assert from 'node:assert/strict';
import test from 'node:test';
import { clampStickerPosition, createStickerPlacement, normalizeStickerPlacements } from '../src/utils/stickerUtils.js';
import { isStickerUnlocked, stickerById, stickerPages } from '../src/data/stickers.js';
import { normalizeImportedEntry } from '../src/utils/journalImport.js';

test('sticker pages have stable catalog IDs and constellation unlocks remain locked until discovered', () => {
  assert.equal(stickerPages.length, 5);
  assert.equal(stickerById.size, new Set(stickerById.keys()).size);
  for (const sticker of stickerById.values()) {
    const [x, y, width, height] = sticker.crop;
    assert.ok(width > 0 && height > 0 && x >= 0 && y >= 0 && x + width <= 256 && y + height <= 256);
  }
  assert.deepEqual(stickerById.get('cafe-leaf').crop, [54, 30, 146, 172]);
  const special = stickerById.get('night-shooting-star');
  assert.equal(isStickerUnlocked(special, {}), false);
  assert.equal(isStickerUnlocked(special, { constellation: true }), true);
});

test('sticker positions survive backup normalization and reject unsafe data', () => {
  const placement = createStickerPlacement('sunrise-cloud');
  const [normalized] = normalizeStickerPlacements([placement]);
  assert.equal(placement.size, 32);
  const imported = normalizeImportedEntry({
    id: 'page-1', created: '2026-09-30T12:00:00.000Z', dateKey: '2026-09-30', stickers: [placement]
  });
  assert.deepEqual(imported.stickers, [normalized]);
  assert.throws(() => normalizeStickerPlacements([{ ...placement, x: 500 }]), /invalid sticker position/);
  assert.throws(() => normalizeStickerPlacements([placement, placement]), /invalid sticker placement/);
});

test('stickers on page details survive backups without moving older writing stickers', () => {
  const writing = createStickerPlacement('sunrise-cloud');
  const details = createStickerPlacement('sunrise-cloud', [writing], 'details');
  const imported = normalizeImportedEntry({
    id: 'page-2', created: '2026-09-30T12:00:00.000Z', dateKey: '2026-09-30', stickers: [writing, details]
  });
  assert.equal(imported.stickers[0].region, undefined);
  assert.equal(imported.stickers[1].region, 'details');
  assert.throws(() => normalizeStickerPlacements([{ ...details, region: 'outside' }]), /invalid sticker position/);
});

test('stickers can reach the full writing surface while staying on the page', () => {
  const placement = createStickerPlacement('sunrise-cloud');
  assert.equal(clampStickerPosition(-4), 0);
  assert.equal(clampStickerPosition(104), 100);
  assert.deepEqual(normalizeStickerPlacements([{ ...placement, x: 0, y: 100 }])[0].x, 0);
});
