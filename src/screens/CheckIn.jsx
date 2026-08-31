import { useState } from 'react';
import { createEntry, factors, guidedPrompts, moods } from '../data/journalData';

export function CheckIn({ nav, onSave }) {
  const [entry, setEntry] = useState(createEntry);
  const [promptType, setPromptType] = useState('Reflect');
  const mood = moods.find((item) => item.key === entry.mood);
  const setField = (field, value) => setEntry((current) => ({ ...current, [field]: value }));
  const toggleList = (field, value) => {
    setEntry((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value]
    }));
  };
  const submit = (event) => {
    event.preventDefault();
    if (!entry.mood || !entry.note.trim()) return;
    onSave(entry);
    setEntry(createEntry());
  };

  return (
    <section className="screen app-screen">
      <div className="tool-heading">
        <h1>Daily Mood Check-In</h1>
        {nav}
        <p>Name what you feel, notice what shaped it, and choose one small next step.</p>
      </div>
      <p className="support-note">This journal can help you notice patterns, but it is not a crisis service. If you might hurt yourself or someone else, call or text 988 in the U.S. now.</p>
      <form className="flow" onSubmit={submit}>
        <div className="mood-grid">
          {moods.map((item) => (
            <button className={entry.mood === item.key ? 'mood selected' : 'mood'} key={item.key} onClick={() => setField('mood', item.key)} style={{ '--mood': item.color }} type="button">
              <span>{item.emoji}</span>
              {item.key}
            </button>
          ))}
        </div>
        <div className="panel two-col">
          <label>Specific feeling
            <select value={entry.specificFeeling} onChange={(event) => setField('specificFeeling', event.target.value)}>
              <option value="">Choose one</option>
              {(mood?.feelings || []).map((feeling) => <option key={feeling}>{feeling}</option>)}
            </select>
          </label>
          <label>Intensity: {entry.intensity}/10
            <input min="1" max="10" type="range" value={entry.intensity} onChange={(event) => setField('intensity', Number(event.target.value))} />
          </label>
        </div>
        <ChipGroup label="What might be affecting your mood?" values={factors} selected={entry.factors} onToggle={(value) => toggleList('factors', value)} />
        <div className="panel three-col">
          <label>Meals
            <select value={entry.meals} onChange={(event) => setField('meals', event.target.value)}>
              <option value="">--</option><option>Light</option><option>Regular</option><option>Heavy</option><option>Skipped</option>
            </select>
          </label>
          <label>Water
            <select value={entry.water} onChange={(event) => setField('water', event.target.value)}>
              <option value="">--</option><option>0-1 cups</option><option>2-3 cups</option><option>4+ cups</option>
            </select>
          </label>
          <label>Sleep
            <select value={entry.sleep} onChange={(event) => setField('sleep', event.target.value)}>
              <option value="">--</option><option>0-4 hrs</option><option>5-6 hrs</option><option>7-8 hrs</option><option>9+ hrs</option>
            </select>
          </label>
        </div>
        <div className="panel">
          <label>Guided journaling mode
            <select value={promptType} onChange={(event) => setPromptType(event.target.value)}>
              {Object.keys(guidedPrompts).map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Journal prompt
            <textarea value={entry.note} onChange={(event) => setField('note', event.target.value)} placeholder={guidedPrompts[promptType][entry.intensity % guidedPrompts[promptType].length]} />
          </label>
        </div>
        <div className="panel two-col">
          <label>Tags
            <input value={entry.tags.join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="school, family, anxiety" />
          </label>
          <label>One small next step
            <input value={entry.copingStep} onChange={(event) => setField('copingStep', event.target.value)} placeholder="Drink water, text a friend, take a walk" />
          </label>
        </div>
        <button className="primary" type="submit">Save Check-In</button>
      </form>
    </section>
  );
}

function ChipGroup({ label, values, selected, onToggle }) {
  return (
    <div className="panel">
      <p className="field-label">{label}</p>
      <div className="chips">
        {values.map((value) => (
          <button className={selected.includes(value) ? 'chip selected' : 'chip'} key={value} onClick={() => onToggle(value)} type="button">{value}</button>
        ))}
      </div>
    </div>
  );
}
