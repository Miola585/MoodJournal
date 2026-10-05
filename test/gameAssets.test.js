import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { orbitArtwork, gardenArtwork } from '../src/components/games/gameArtwork.js';
import { planetSeeds } from '../src/components/games/gameUtils.js';

test('game image references resolve to files in the repository', async () => {
  for (const source of ['gameUtils.js', 'gameArtwork.js']) {
    const sourceUrl = new URL(`../src/components/games/${source}`, import.meta.url);
    const code = await readFile(sourceUrl, 'utf8');
    const references = [...code.matchAll(/new URL\('([^']+)', import\.meta\.url\)/gu)];
    if (source === 'gameArtwork.js') assert.ok(references.length > 0);
    for (const [, asset] of references) {
      await assert.doesNotReject(access(new URL(asset, sourceUrl)), `${source} references missing asset ${asset}`);
    }
  }
});

test('each orbit subject and garden flower family has its artwork mapping', () => {
  for (const planet of planetSeeds) assert.ok(orbitArtwork[planet.name]?.image, planet.name);
  for (const family of ['wildflower', 'rose', 'sunflower', 'daisy']) {
    for (const intensity of ['low', 'medium', 'high']) assert.ok(gardenArtwork.flowers[family][intensity], `${family}: ${intensity}`);
  }
  for (const stage of ['sprout', 'leafy', 'stalk', 'buds']) assert.ok(gardenArtwork.growth[stage]?.image, stage);
});
