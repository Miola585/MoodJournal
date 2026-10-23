import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveEntryTags, extractInlineTags, inlineEntryTags, matchesEntryTag, updateManualTags } from '../src/utils/journalTags.js';

test('hashtags support Unicode, underscores, numbers and internal hyphens anywhere in writing', () => {
  assert.deepEqual(extractInlineTags('Start #school then (#caf\u00e9), #\u5bb6\u65cf #self-care #day_2 #123\n#end.'), ['school', 'caf\u00e9', '\u5bb6\u65cf', 'self-care', 'day_2', '123', 'end']);
});
test('hashtags ignore lone hashes, embedded fragments and URL tokens', () => {
  assert.deepEqual(extractInlineTags('# ## ###no abc#fragment /page#anchor https://x.test/!#hidden www.test.com/#other #yes'), ['yes']);
});
test('tags deduplicate case-insensitively and normalize combining accents', () => {
  assert.deepEqual(extractInlineTags('#School #school #SCHOOL #cafe\u0301 #caf\u00e9'), ['School', 'caf\u00e9']);
});
test('effective tags derive from writing and preserve manually added tags after hashtag removal', () => {
  const entry = { note: '#School #walking', tags: ['school', 'old'] };
  assert.deepEqual(effectiveEntryTags(entry), ['school', 'old', 'walking']);
  assert.deepEqual(effectiveEntryTags({ ...entry, note: 'No hashtags' }), ['school', 'old']);
  assert.deepEqual(entry.tags, ['school', 'old']);
  assert.equal(matchesEntryTag(entry, ' #WALK '), true);
  assert.equal(matchesEntryTag(entry, 'alk'), true);
  assert.equal(matchesEntryTag(entry, '#missing'), false);
});
test('rich text joins marks but not paragraphs and never scans other entry fields', () => {
  const entry = { note: 'stale #ignore', specificFeeling: '#title', copingStep: '#next', stickyNotes: [{ text: '#sticky' }], noteDoc: {
    type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: '#sc', marks: [{ type: 'bold' }] }, { type: 'text', text: 'hool' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '#garden' }] }
    ]
  } };
  const original = JSON.stringify(entry);
  assert.deepEqual(inlineEntryTags(entry), ['school', 'garden']);
  assert.equal(JSON.stringify(entry), original);
});
test('internal markers stay stored but cannot be added by ordinary controls or inline tags', () => {
  const entry = { type: 'checkin', tags: ['game', 'free-write', 'manual'], note: '#game #free-write #new' };
  assert.deepEqual(effectiveEntryTags(entry), ['manual', 'new']);
  assert.deepEqual(updateManualTags(entry, 'fresh, #fresh, GAME, free-write'), ['game', 'free-write', 'fresh']);
  assert.deepEqual(updateManualTags({ tags: [] }, 'game, free-write, valid'), ['valid']);
  assert.equal(entry.type, 'checkin');
});
