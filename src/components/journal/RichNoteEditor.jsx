import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Bold, Italic, List, Plus } from 'lucide-react';
import { normalizeNoteDoc, noteDocToPlainText, plainTextToNoteDoc } from '../../utils/journalRichText';

const extensions = [StarterKit.configure({
  blockquote: false,
  code: false,
  codeBlock: false,
  heading: false,
  horizontalRule: false,
  orderedList: false,
  strike: false,
  underline: false,
  link: false
}), Placeholder.configure({ placeholder: 'Start writing here...' })];

export function RichNoteEditor({ note, noteDoc, onChange, onAddNote, addNoteButtonRef, canAddNote, required, toolbarTarget }) {
  const initialContent = useRef(normalizeNoteDoc(noteDoc) || plainTextToNoteDoc(note));
  const currentContent = useRef(JSON.stringify(initialContent.current));
  const editor = useEditor({
    extensions,
    content: initialContent.current,
    editorProps: { attributes: { 'aria-label': 'Journal entry', 'aria-multiline': 'true', 'aria-required': String(required), role: 'textbox' } },
    onUpdate: ({ editor: changedEditor }) => {
      const doc = normalizeNoteDoc(changedEditor.getJSON());
      currentContent.current = JSON.stringify(doc);
      onChange(noteDocToPlainText(doc), doc);
    }
  });
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => current ? {
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      bulletList: current.isActive('bulletList')
    } : null
  });

  useEffect(() => {
    if (!editor) return;
    const next = normalizeNoteDoc(noteDoc) || plainTextToNoteDoc(note);
    const serialized = JSON.stringify(next);
    if (serialized !== currentContent.current) {
      currentContent.current = serialized;
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, note, noteDoc]);

  return (
    <div className="rich-note-editor">
      {toolbarTarget && createPortal(<div aria-label="Writing tools" className="journal-format-toolbar" role="toolbar">
        <button aria-label="Bold" aria-pressed={Boolean(active?.bold)} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold" type="button"><Bold aria-hidden="true" size={18} /></button>
        <button aria-label="Italic" aria-pressed={Boolean(active?.italic)} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic" type="button"><Italic aria-hidden="true" size={18} /></button>
        <button aria-label="Bulleted list" aria-pressed={Boolean(active?.bulletList)} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bulleted list" type="button"><List aria-hidden="true" size={18} /></button>
        <span aria-hidden="true" className="journal-format-divider" />
        <button aria-label="Add note" className="journal-add-note" disabled={!canAddNote} onClick={onAddNote} ref={addNoteButtonRef} title={canAddNote ? 'Add note' : 'Note limit reached'} type="button"><Plus aria-hidden="true" size={18} /><span>Add note</span></button>
      </div>, toolbarTarget)}
      <EditorContent className="journal-editor-content" editor={editor} />
    </div>
  );
}
