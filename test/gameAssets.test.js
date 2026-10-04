import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('game image references resolve to files in the repository', async () => {
  for (const source of ['gameUtils.js', 'MoodGardenGame.jsx']) {
    const sourceUrl = new URL(`../src/components/games/${source}`, import.meta.url);
    const code = await readFile(sourceUrl, 'utf8');
    const references = [...code.matchAll(/new URL\('([^']+)', import\.meta\.url\)/gu)];
    if (source === 'MoodGardenGame.jsx') assert.ok(references.length > 0);
    for (const [, asset] of references) {
      await assert.doesNotReject(access(new URL(asset, sourceUrl)), `${source} references missing asset ${asset}`);
    }
  }
});
