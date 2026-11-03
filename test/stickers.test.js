import assert from 'node:assert/strict';
import test from 'node:test';
import { clampStickerPosition, createStickerPlacement, fitStickerOnPage, normalizeStickerPlacements, stickerHeightScale, stickerOnPage } from '../src/utils/stickerUtils.js';
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

test('independent sticker height and whole-page region survive backup normalization', () => {
  const placement = { ...createStickerPlacement('cafe-coffee', [], 'page'), heightScale: .45 };
  const imported = normalizeImportedEntry({ id: 'height-page', created: '2026-09-30T12:00:00Z', stickers: [placement] });
  assert.deepEqual(imported.stickers, [placement]);
  assert.equal(stickerHeightScale(undefined), 1);
  assert.equal(stickerHeightScale(-1), .25);
  assert.equal(stickerHeightScale(4), 1);
  for (const heightScale of [0, 1.1, NaN, Infinity, '0.5', null]) {
    assert.throws(() => normalizeStickerPlacements([{ ...placement, heightScale }]), /invalid sticker position/);
  }
  const legacy = createStickerPlacement('cafe-coffee');
  assert.equal(normalizeStickerPlacements([legacy])[0].heightScale, undefined);
});

test('legacy sticker regions map to a shared page without changing saved coordinates', () => {
  const writing = createStickerPlacement('cafe-coffee');
  const details = { ...writing, region: 'details' };
  const regions = { writing: { x: 0, y: 25, width: 1, height: .75 }, details: { x: 0, y: 0, width: 1, height: .25 } };
  assert.equal(stickerOnPage(writing, regions).y, 49);
  assert.equal(stickerOnPage(details, regions).y, 8);
  assert.equal(writing.y, 32);
  const fullPage = { ...writing, region: 'page' };
  assert.deepEqual(stickerOnPage(fullPage, regions), fullPage);
});

test('stickers fit page edges across sizes, rotations, heights, and narrow viewports', () => {
  for (const width of [120, 240, 800]) for (const height of [80, 500]) {
    for (const rotation of [-180, -45, 0, 45, 90, 180]) for (const heightScale of [.25, .5, 1]) {
      for (const position of [0, 100]) {
        const sticker = stickerById.get('cafe-coffee');
        const placement = { ...createStickerPlacement(sticker.id), size: 48, rotation, heightScale, x: position, y: position };
        const frame = fitStickerOnPage(placement, sticker.crop, { width, height });
        const [, , w, h] = sticker.crop;
        const scale = frame.longEdge / Math.max(w, h);
        const angle = rotation * Math.PI / 180;
        const extentX = (w * scale * Math.abs(Math.cos(angle)) + h * scale * heightScale * Math.abs(Math.sin(angle))) / 2;
        const extentY = (w * scale * Math.abs(Math.sin(angle)) + h * scale * heightScale * Math.abs(Math.cos(angle))) / 2;
        assert.ok(frame.x / 100 * width - extentX >= 17.9);
        assert.ok(frame.x / 100 * width + extentX <= width - 17.9);
        assert.ok(frame.y / 100 * height - extentY >= 17.9);
        assert.ok(frame.y / 100 * height + extentY <= height - 17.9);
      }
    }
  }
});
