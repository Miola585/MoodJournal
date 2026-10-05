import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { artworkPathsFromSource } from '../scripts/audit-art-credits.mjs';

const credits = JSON.parse(await readFile(new URL('../src/data/artCredits.json', import.meta.url), 'utf8'));

test('credit inventory resolves static JS and CSS images without treating remote links as local art', () => {
  const root = path.resolve('sample-project');
  const source = path.join(root, 'src/styles/example.css');
  const code = `new URL('../../img/Theme Img/cresent_moon.png', import.meta.url); url('../../img/example.svg'); url('https://example.com/image.png')`;
  assert.deepEqual(artworkPathsFromSource(code, source, root), ['img/Theme Img/cresent_moon.png', 'img/example.svg']);
});

test('art credits keep named creators, source links and review status with their active files', async () => {
  assert.equal(new Set(credits.map((credit) => credit.id)).size, credits.length);
  for (const credit of credits) {
    assert.ok(credit.creator && credit.artwork && credit.licenseStatus);
    assert.equal(new URL(credit.creatorUrl).protocol, 'https:');
    if (credit.sourceUrl) assert.equal(new URL(credit.sourceUrl).protocol, 'https:');
    if (credit.licenseEvidence) await assert.doesNotReject(access(new URL(`../${credit.licenseEvidence}`, import.meta.url)));
    assert.ok(Array.isArray(credit.files) && credit.files.length > 0);
    if (credit.usage === 'active') {
      for (const file of credit.files) await assert.doesNotReject(access(new URL(`../${file}`, import.meta.url)));
    }
  }
  assert.equal(credits.find((credit) => credit.id === 'library').usage, 'planned');
  assert.equal(credits.find((credit) => credit.id === 'seashells').files.length, 3);
  assert.equal(credits.find((credit) => credit.id === 'crescent-moon').licenseEvidence, null);
});

test('the removed dark moon is no longer imported and the replacement has a credit', async () => {
  const atmosphere = await readFile(new URL('../src/components/layout/ThemeAtmosphere.jsx', import.meta.url), 'utf8');
  assert.ok(!atmosphere.includes('night-celestial-accent.png'));
  const themes = await readFile(new URL('../src/styles/themes.css', import.meta.url), 'utf8');
  assert.ok(!themes.includes('night-celestial-accent.png'));
  const moon = credits.find((credit) => credit.id === 'crescent-moon');
  assert.ok(atmosphere.includes(moon.files[0]));
});
