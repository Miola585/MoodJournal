import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSupportDiagnostics, filterSupportRequests, supportErrorMessage, validateSupportRequest } from '../src/utils/support.js';

test('support request validation requires a valid type, title, and description', () => {
  const valid = { category: 'bug', title: 'Sticker moves', body: 'It shifts after rotation.' };
  assert.equal(validateSupportRequest(valid), '');
  assert.match(validateSupportRequest({ ...valid, category: 'unknown' }), /type/u);
  assert.match(validateSupportRequest({ ...valid, title: '  ' }), /title/u);
  assert.match(validateSupportRequest({ ...valid, body: '  ' }), /more/u);
  assert.match(validateSupportRequest({ ...valid, title: 'x'.repeat(121) }), /120/u);
  assert.match(validateSupportRequest({ ...valid, body: 'x'.repeat(5001) }), /5,000/u);
  assert.match(validateSupportRequest({ ...valid, steps: 'x'.repeat(2001) }), /2,000/u);
});

test('diagnostics only include approved page and display facts', () => {
  assert.deepEqual(collectSupportDiagnostics({ pathname: '/entries', theme: 'night', mode: 'dark', width: 390.2, height: 844.4, userAgent: 'Mozilla/5.0 Chrome/120 Safari/537' }), {
    page: '/entries', theme: 'night', mode: 'dark', browser: 'Chrome', viewport: '390x844'
  });
});

test('admin filters combine search, type, and status', () => {
  const requests = [
    { id: '1', category: 'bug', title: 'Sticker shifts', body: 'After rotation', status: 'new' },
    { id: '2', category: 'feature', title: 'Monthly mood', body: 'A summary', status: 'planned' }
  ];
  assert.deepEqual(filterSupportRequests(requests, { search: 'STICKER', category: 'bug', status: 'new' }), [requests[0]]);
  assert.deepEqual(filterSupportRequests(requests, { search: 'sticker', category: 'feature', status: 'all' }), []);
});

test('missing support schema produces an honest setup error', () => {
  assert.match(supportErrorMessage({ code: '42P01' }), /not ready/u);
  assert.match(supportErrorMessage({ code: 'PGRST205' }), /Supabase/u);
});
