const MAX_TEXT_LENGTH = 1000000;
const MAX_NODES = 20000;

export function plainTextToNoteDoc(text = '') {
  return {
    type: 'doc',
    content: String(text).split('\n').map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {})
    }))
  };
}

export function normalizeNoteDoc(value) {
  if (value === undefined || value === null) return null;
  let count = 0;
  let length = 0;
  const read = (node, parent, depth) => {
    if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 8 || ++count > MAX_NODES) {
      throw new Error('An imported entry has invalid formatted writing.');
    }
    const allowed = {
      root: ['doc'],
      doc: ['paragraph', 'bulletList'],
      bulletList: ['listItem'],
      listItem: ['paragraph', 'bulletList'],
      paragraph: ['text', 'hardBreak']
    }[parent] || [];
    if (!allowed.includes(node.type)) throw new Error('An imported entry has unsupported formatting.');
    if (node.type === 'text') {
      if (typeof node.text !== 'string' || !node.text || (length += node.text.length) > MAX_TEXT_LENGTH) {
        throw new Error('An imported entry has invalid formatted writing.');
      }
      const marks = node.marks || [];
      if (!Array.isArray(marks) || marks.some((mark) => !mark || !['bold', 'italic'].includes(mark.type))) {
        throw new Error('An imported entry has unsupported formatting.');
      }
      return { type: 'text', text: node.text, ...(marks.length ? { marks: [...new Set(marks.map((mark) => mark.type))].map((type) => ({ type })) } : {}) };
    }
    if (node.type === 'hardBreak') return { type: 'hardBreak' };
    if (node.content !== undefined && !Array.isArray(node.content)) {
      throw new Error('An imported entry has invalid formatted writing.');
    }
    const content = (node.content || []).map((child) => read(child, node.type, depth + 1));
    return { type: node.type, ...(content.length ? { content } : {}) };
  };
  return read(value, 'root', 0);
}

export function noteDocToPlainText(doc) {
  const blocks = [];
  const inlineText = (node) => (node.content || []).map((child) => child.type === 'hardBreak' ? '\n' : child.text || '').join('');
  const visit = (node) => {
    if (node.type === 'paragraph') blocks.push(inlineText(node));
    else (node.content || []).forEach(visit);
  };
  visit(normalizeNoteDoc(doc) || plainTextToNoteDoc(''));
  return blocks.join('\n');
}
