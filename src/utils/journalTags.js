import { noteDocToPlainText } from './journalRichText.js';

const tagKey = (tag) => tag.normalize('NFC').toLowerCase();
const internalTags = new Set(['free-write', 'game']);
export const isInternalTag = (tag) => typeof tag === 'string' && internalTags.has(tagKey(tag));

function uniqueTags(tags) {
  const seen = new Set();
  return tags.filter((tag) => {
    if (typeof tag !== 'string' || !tag.trim() || isInternalTag(tag)) return false;
    const key = tagKey(tag);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractInlineTags(writing = '') {
  const text = String(writing).normalize('NFC');
  const tags = [];
  const pattern = /(?<![\p{L}\p{N}\p{M}_/#&=.%?+\-])#([\p{L}\p{N}_][\p{L}\p{N}\p{M}_]*(?:-[\p{L}\p{N}_][\p{L}\p{N}\p{M}_]*)*)/gu;
  for (const match of text.matchAll(pattern)) {
    const tokenStart = text.slice(0, match.index).match(/\S*$/)?.[0] || '';
    if (/:\/\/|www\./i.test(tokenStart) || tokenStart.startsWith('/')) continue;
    tags.push(match[1]);
  }
  return uniqueTags(tags);
}

export function inlineEntryTags(entry) {
  let writing = entry?.note || '';
  if (entry?.noteDoc) {
    try { writing = noteDocToPlainText(entry.noteDoc); }
    catch { /* Legacy plain writing stays searchable if a rich-text document is damaged. */ }
  }
  return extractInlineTags(writing);
}

export const manualEntryTags = (entry) => uniqueTags(Array.isArray(entry?.tags) ? entry.tags : []);
export const effectiveEntryTags = (entry) => uniqueTags([...manualEntryTags(entry), ...inlineEntryTags(entry)]);
export const matchesEntryTag = (entry, query) => {
  const search = tagKey(String(query).trim().replace(/^#/, ''));
  return !search || effectiveEntryTags(entry).some((tag) => tagKey(tag).includes(search));
};

export function updateManualTags(entry, text) {
  const markers = (entry.tags || []).filter(isInternalTag);
  return [...markers, ...uniqueTags(text.split(',').map((tag) => tag.trim().replace(/^#/, '')))];
}
