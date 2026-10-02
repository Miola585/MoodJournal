import { normalizeNoteDoc } from '../../utils/journalRichText';

function renderNode(node, key) {
  if (node.type === 'text') {
    let text = node.text;
    if (node.marks?.some((mark) => mark.type === 'italic')) text = <em>{text}</em>;
    if (node.marks?.some((mark) => mark.type === 'bold')) text = <strong>{text}</strong>;
    return <span key={key}>{text}</span>;
  }
  if (node.type === 'hardBreak') return <br key={key} />;
  const children = node.content?.map((child, index) => renderNode(child, index)) || null;
  if (node.type === 'paragraph') return <p key={key}>{children}</p>;
  if (node.type === 'bulletList') return <ul key={key}>{children}</ul>;
  if (node.type === 'listItem') return <li key={key}>{children}</li>;
  return children;
}

export function RichNoteContent({ doc, fallback }) {
  let content = null;
  try {
    content = normalizeNoteDoc(doc);
  } catch {
    // A damaged local entry can still show its plain writing.
  }
  return <div className="entry-preview rich-note-content">{content ? content.content?.map((node, index) => renderNode(node, index)) : <p>{fallback || 'No writing on this page.'}</p>}</div>;
}
