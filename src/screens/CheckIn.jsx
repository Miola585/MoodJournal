import { useState } from 'react';
import { createEntry, factors, guidedPrompts, moods } from '../data/journalData';

const stepLabels = ['Mood', 'Details', 'Journal', 'Context'];
const primaryMoodKeys = ['Happy', 'Calm', 'Content', 'Sad', 'Overwhelmed'];
const promptModes = ['Reflect', 'Gratitude', 'Grounding', 'Growth', 'Support'];
const intensityLevels = [
  { label: 'Very light', value: 2 },
  { label: 'Light', value: 4 },
  { label: 'Medium', value: 6 },
  { label: 'Strong', value: 8 },
  { label: 'Very strong', value: 10 }
];
const bodyCheckGroups = [
  {
    field: 'meals',
    label: 'Meals',
    options: [
      { label: 'Skipped or not yet', value: 'Skipped' },
      { label: 'Light meal', value: 'Light' },
      { label: 'Regular meal', value: 'Regular' },
      { label: 'Full meal', value: 'Heavy' }
    ]
  },
  {
    field: 'water',
    label: 'Water',
    options: [
      { label: 'A few sips', value: '0-1 cups' },
      { label: 'Some water', value: '2-3 cups' },
      { label: 'Feeling hydrated', value: '4+ cups' }
    ]
  },
  {
    field: 'sleep',
    label: 'Sleep',
    options: [
      { label: 'Very little 0-4 hrs', value: '0-4 hrs' },
      { label: 'Not enough 5-6 hrs', value: '5-6 hrs' },
      { label: 'Enough rest 7-8 hrs', value: '7-8 hrs' },
      { label: 'Extra rest 9+ hrs', value: '9+ hrs' }
    ]
  }
];

export function CheckIn({ nav, onSave }) {
  const [entry, setEntry] = useState(createEntry);
  const [promptType, setPromptType] = useState('Reflect');
  const [step, setStep] = useState(0);
  const [showMoreMoods, setShowMoreMoods] = useState(false);
  const [showBodyDetails, setShowBodyDetails] = useState(false);
  const [showExtraContext, setShowExtraContext] = useState(false);
  const mood = moods.find((item) => item.key === entry.mood);
  const visibleMoods = showMoreMoods ? moods : moods.filter((item) => primaryMoodKeys.includes(item.key));
  const canSave = Boolean(entry.mood && entry.note.trim());
  const setField = (field, value) => setEntry((current) => ({ ...current, [field]: value }));
  const selectMood = (value) => {
    setEntry((current) => ({
      ...current,
      mood: value,
      specificFeeling: current.mood === value ? current.specificFeeling : ''
    }));
  };
  const toggleList = (field, value) => {
    setEntry((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value]
    }));
  };
  const goNext = () => {
    if (step === 0 && !entry.mood) return;
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  };
  const goBack = () => setStep((current) => Math.max(current - 1, 0));
  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    onSave(entry);
    setEntry(createEntry());
    setPromptType('Reflect');
    setStep(0);
    setShowMoreMoods(false);
    setShowBodyDetails(false);
    setShowExtraContext(false);
  };

  return (
    <section className="screen app-screen checkin-screen">
      <div className="tool-heading">
        <h1>Daily Mood Check-In</h1>
        {nav}
        <p>Name what you feel, notice what shaped it, and choose one small next step.</p>
      </div>
      <form className="flow checkin-flow" onSubmit={submit}>
        <div className="checkin-progress" aria-label="Check-in progress">
          {stepLabels.map((label, index) => (
            <button
              className={index === step ? 'step-pill active' : index < step ? 'step-pill complete' : 'step-pill'}
              disabled={index > 0 && !entry.mood}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>

        <div className="checkin-step-panel">
          {step === 0 && (
            <div className="checkin-step-content">
              <div className="step-copy">
                <span>Start here</span>
                <h2>How are you feeling right now?</h2>
                <p>Pick the closest one. You can name it more clearly next.</p>
              </div>
              <div className="mood-grid checkin-mood-grid">
                {visibleMoods.map((item) => (
                  <button className={entry.mood === item.key ? 'mood selected' : 'mood'} key={item.key} onClick={() => selectMood(item.key)} style={{ '--mood': item.color }} type="button">
                    <span>{item.emoji}</span>
                    {item.key}
                  </button>
                ))}
              </div>
              <button className="secondary subtle-action" onClick={() => setShowMoreMoods((current) => !current)} type="button">
                {showMoreMoods ? 'Show fewer moods' : 'More feelings'}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="checkin-step-content">
              <div className="step-copy">
                <span>Details</span>
                <h2>{entry.mood ? `What kind of ${entry.mood.toLowerCase()} is it?` : 'Add a little more detail'}</h2>
                <p>Optional. These details can help you notice patterns later.</p>
              </div>
              <div className="panel quiet-panel detail-choice-panel">
                <ChoiceChips label="Specific feeling" values={mood?.feelings || []} selected={entry.specificFeeling} onSelect={(value) => setField('specificFeeling', value)} />
                <div className="choice-section">
                  <p className="field-label">How strong does this feeling feel?</p>
                  <div className="choice-grid intensity-grid" role="group" aria-label="Intensity">
                    {intensityLevels.map((level) => (
                      <button className={entry.intensity === level.value ? 'choice-button intensity-choice selected' : 'choice-button intensity-choice'} key={level.label} onClick={() => setField('intensity', level.value)} type="button">
                        <span>{level.label}</span>
                        <small>{level.value}/10</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <ChipGroup label="What might be affecting your mood?" values={factors} selected={entry.factors} onToggle={(value) => toggleList('factors', value)} />
            </div>
          )}

          {step === 2 && (
            <div className="checkin-step-content">
              <div className="step-copy">
                <span>Journal</span>
                <h2>Write one honest note.</h2>
                <p>No perfect wording needed. A few real words are enough.</p>
              </div>
              <div className="panel journal-step-panel">
                <ChoiceChips label="Guided journaling mode" values={promptModes} selected={promptType} onSelect={setPromptType} variant="prompt" />
                <label>Journal prompt
                  <textarea value={entry.note} onChange={(event) => setField('note', event.target.value)} placeholder={guidedPrompts[promptType][entry.intensity % guidedPrompts[promptType].length]} />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="checkin-step-content">
              <div className="step-copy">
                <span>Optional context</span>
                <h2>Add anything that might help later.</h2>
                <p>Skip what does not matter today.</p>
              </div>
              <Disclosure title="Body check" open={showBodyDetails} onToggle={() => setShowBodyDetails((current) => !current)}>
                <div className="body-check-grid">
                  {bodyCheckGroups.map((group) => (
                    <TapCardGroup
                      key={group.field}
                      label={group.label}
                      onSelect={(value) => setField(group.field, value)}
                      options={group.options}
                      value={entry[group.field]}
                    />
                  ))}
                </div>
              </Disclosure>
              <Disclosure title="Tiny extras" open={showExtraContext} onToggle={() => setShowExtraContext((current) => !current)}>
                <div className="two-col">
                  <label>Tags
                    <input value={entry.tags.join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="school, family, tired, nervous" />
                  </label>
                  <label>One small next step
                    <input value={entry.copingStep} onChange={(event) => setField('copingStep', event.target.value)} placeholder="drink water, stretch, message someone" />
                  </label>
                </div>
              </Disclosure>
              <p className="support-note compact-support-note">This journal can help you notice patterns, but it is not a crisis service. If you might hurt yourself or someone else, call or text 988 in the U.S. now.</p>
            </div>
          )}
        </div>

        <div className={step === 2 && canSave ? 'checkin-action-bar has-save' : 'checkin-action-bar'}>
          <button className="secondary" disabled={step === 0} onClick={goBack} type="button">Back</button>
          {step < stepLabels.length - 1 && (
            <button className="primary" disabled={step === 0 && !entry.mood} onClick={goNext} type="button">{step === 2 ? 'Continue to context' : 'Next'}</button>
          )}
          {(step === stepLabels.length - 1 || (step === 2 && canSave)) && (
            <button className="primary" disabled={!canSave} type="submit">Save Check-In</button>
          )}
        </div>
      </form>
    </section>
  );
}

function ChoiceChips({ label, values, selected, onSelect, variant = 'feeling' }) {
  return (
    <div className="choice-section">
      <p className="field-label">{label}</p>
      {values.length > 0 ? (
        <div className={`choice-grid ${variant}-chip-grid`} role="group" aria-label={label}>
          {values.map((value) => (
            <button className={selected === value ? 'choice-button selected' : 'choice-button'} key={value} onClick={() => onSelect(value)} type="button">
              {value}
            </button>
          ))}
        </div>
      ) : (
        <p className="choice-empty">Pick a mood first.</p>
      )}
    </div>
  );
}

function TapCardGroup({ label, value, options, onSelect }) {
  return (
    <div className="body-card-group">
      <p className="field-label">{label}</p>
      <div className="body-card-options" role="group" aria-label={label}>
        {options.map((option) => (
          <button className={value === option.value ? 'body-card selected' : 'body-card'} key={option.value} onClick={() => onSelect(option.value)} type="button">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Disclosure({ title, open, onToggle, children }) {
  return (
    <div className="panel disclosure-panel">
      <button className="disclosure-trigger" onClick={onToggle} type="button" aria-expanded={open}>
        <span>{title}</span>
        <span>{open ? '-' : '+'}</span>
      </button>
      {open && <div className="disclosure-content">{children}</div>}
    </div>
  );
}

function ChipGroup({ label, values, selected, onToggle }) {
  return (
    <div className="panel quiet-panel">
      <p className="field-label">{label}</p>
      <div className="chips">
        {values.map((value) => (
          <button className={selected.includes(value) ? 'chip selected' : 'chip'} key={value} onClick={() => onToggle(value)} type="button">{value}</button>
        ))}
      </div>
    </div>
  );
}
