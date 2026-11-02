import test from 'node:test';
import assert from 'node:assert/strict';
import { mainDestinations, sectionForView, sectionTabs } from '../src/data/appNavigation.js';
import { viewPaths } from '../src/data/journalData.js';
import { viewFromPath } from '../src/utils/journalUtils.js';

test('primary and contextual destinations share stable section metadata', () => {
  assert.deepEqual(mainDestinations.map((item) => item.label), ['Today', 'My journal', 'Little breaks']);
  for (const [section, tabs] of Object.entries(sectionTabs)) {
    for (const tab of tabs) {
      assert.equal(sectionForView(tab.view), section);
      assert.ok(viewPaths[tab.view]);
    }
  }
  assert.equal(sectionForView('checkin'), 'today');
  assert.equal(sectionForView('games'), 'explore');
  assert.equal(sectionForView('moodColors'), 'explore');
  assert.equal(sectionForView('preferences'), null);
});

test('nested paths resolve to their most specific destination without prefix collisions', () => {
  assert.equal(viewFromPath('/support/preview/staff', viewPaths), 'staffPreview');
  assert.equal(viewFromPath('/support/preview', viewPaths), 'supportPreview');
  assert.equal(viewFromPath('/explore/stickers', viewPaths), 'stickers');
  assert.equal(viewFromPath('/explore/mood-colors', viewPaths), 'moodColors');
  assert.equal(viewFromPath('/games/constellation', viewPaths), 'games');
  assert.equal(viewFromPath('/entries-old', viewPaths), 'home');
});
