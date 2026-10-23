import { useEffect, useRef, useState } from 'react';
import { inlineEntryTags, manualEntryTags, updateManualTags } from '../../utils/journalTags.js';

export function JournalTags({ entry, onChange }) {
  const savedText = manualEntryTags(entry).join(', ');
  const [text, setText] = useState(savedText);
  const lastValue = useRef(savedText);
  useEffect(() => {
    if (lastValue.current !== savedText) setText(savedText);
    lastValue.current = savedText;
  }, [savedText]);
  const inline = inlineEntryTags(entry);
  return <details className="journal-tags">
    <summary>Tags</summary>
    <label>Manual tags
      <input value={text} placeholder="school, family, ideas" onChange={(event) => {
        setText(event.target.value);
        const tags = updateManualTags(entry, event.target.value);
        lastValue.current = manualEntryTags({ tags }).join(', ');
        onChange(tags);
      }} />
    </label>
    {inline.length > 0 && <div className="journal-inline-tags" aria-label="Detected hashtags">
      <span>From your writing</span>
      <div className="journal-tag-preview">{inline.map((tag) => <small key={tag} title="Edit the hashtag in your writing to remove it">#{tag}</small>)}</div>
    </div>}
  </details>;
}
