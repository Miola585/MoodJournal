import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JournalTags } from '../components/journal/JournalTags';
import { Angry, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Circle, Footprints, Frown, Heart, Leaf, Meh, MessageCircle, MessageCircleQuestionMark, Moon, RotateCw, Smile, Sparkles, Wind, X } from 'lucide-react';
import { createEntry, factors, guidedPrompts, moods } from '../data/journalData';
import { isJournalDateAllowed, todayKey } from '../utils/journalUtils';
import { confirmJournalNavigation, useJournalDraft } from '../hooks/useJournalDraft';
import { DraftRecoveryNotice, SaveState } from '../components/journal/DraftRecoveryNotice';
import '../styles/checkin.css';

const stepLabels = ['Notice', 'Reflect', 'Close'];
const primaryMoodKeys = ['Happy', 'Content', 'Calm', 'Sad', 'Overwhelmed'];
const moodLabels = { Happy: 'Bright', Sad: 'Low' };
const moodIcons = { Happy: Smile, Content: Smile, Calm: Smile, Sad: Frown, Overwhelmed: Frown, Excited: Smile, Anxious: Frown, Angry, Lonely: Frown, Grateful: Heart, Tired: Moon, Panic: Frown, Numb: Meh };
const intensityChoices = [{ label: 'A little', value: 2 }, { label: 'Noticeable', value: 5 }, { label: 'A lot', value: 8 }];
const promptModes = ['Reflect', 'Gratitude', 'Grounding', 'Growth', 'Support'];
const supportChoices = ['Rest', 'Move', 'Reach out', 'Breathe', 'Take space', 'Nothing right now'];
const supportIcons = [Moon, Footprints, MessageCircle, Wind, Leaf, Circle];
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

export function CheckIn({ nav, entries = [], onSave, onDone, onPause, onHelp, privateStorage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const saving = useRef(false);
  const [entry, setEntry] = useState(() => {
    const initial = createEntry();
    const seed = location.state || {};
    if (moods.some((item) => item.key === seed.mood)) initial.mood = seed.mood;
    if (seed.dateKey && isJournalDateAllowed(seed.dateKey)) initial.dateKey = seed.dateKey;
    return initial;
  });
  const [promptType, setPromptType] = useState('Reflect');
  const [promptIndex, setPromptIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [savedEntry, setSavedEntry] = useState(null);
  const [draftCleanupError, setDraftCleanupError] = useState('');
  const [supportChoice, setSupportChoice] = useState('');
  const [showMoreMoods, setShowMoreMoods] = useState(false);
  const [showExtraContext, setShowExtraContext] = useState(false);
  const [showFactors, setShowFactors] = useState(false);
  const [showFullCheckIn, setShowFullCheckIn] = useState(false);
  const [saveState, setSaveState] = useState('');
  const draftState = useJournalDraft({ privateStorage, formId: 'checkin:new', draft: entry, setDraft: setEntry });
  const mood = moods.find((item) => item.key === entry.mood);
  const visibleMoods = [
    ...primaryMoodKeys.map((key) => moods.find((item) => item.key === key)),
    ...moods.filter((item) => !primaryMoodKeys.includes(item.key) && (showMoreMoods || item.key === entry.mood))
  ];
  const prompt = guidedPrompts[promptType][promptIndex % guidedPrompts[promptType].length];
  const sameDayCheckIns = entries.filter((item) => (item.type || 'checkin') === 'checkin' && item.dateKey === entry.dateKey);
  const isAdditionalCheckIn = sameDayCheckIns.length > 0 && !showFullCheckIn;
  const dateAllowed = isJournalDateAllowed(entry.dateKey);
  const recoveryResolved = draftState.draftReady && !draftState.storedDraft;
  const canSave = Boolean(recoveryResolved && dateAllowed && entry.mood);
  const setField = (field, value) => {
    setSaveState('');
    setEntry((current) => ({ ...current, [field]: value }));
  };
  const selectMood = (value) => {
    setSaveState('');
    setEntry((current) => ({
      ...current,
      mood: value,
      specificFeeling: current.mood === value ? current.specificFeeling : ''
    }));
  };
  const toggleList = (field, value) => {
    setSaveState('');
    setEntry((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value]
    }));
  };
  const goNext = () => {
    if (!recoveryResolved || (step === 0 && !entry.mood)) return;
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  };
  const goBack = () => setStep((current) => Math.max(current - 1, 0));
  const submit = async (event) => {
    event?.preventDefault();
    if (!canSave || saving.current) return;
    saving.current = true;
    setSaveState('saving');
    let saved = false;
    try {
      saved = await onSave(entry);
    } catch {
      saved = false;
    }
    if (!saved) {
      saving.current = false;
      setSaveState('error');
      return;
    }
    try {
      await draftState.clearDraft(entry);
    } catch {
      setDraftCleanupError('Your entry was saved, but the device draft could not be removed.');
    }
    setSaveState('saved');
    setSavedEntry(entry);
  };

  if (savedEntry) return (
    <section className="screen app-screen checkin-screen checkin-complete">
      {nav}
      <div className="checkin-complete-content">
        <span className="checkin-complete-mark" aria-hidden="true"><Sparkles size={36} /></span>
        <p className="page-header-eyebrow">Your journal</p>
        <h1>You made room for what's here</h1>
        <time dateTime={savedEntry.dateKey}>{new Date(`${savedEntry.dateKey}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time>
        <p className="checkin-kept"><Check aria-hidden="true" />Moment kept</p>
        <FeelingRecap entry={savedEntry} includeDetails />
        {draftCleanupError && <p className="form-error" role="alert">{draftCleanupError}</p>}
        <div className="checkin-complete-actions">
          <button className="primary" onClick={onDone} type="button">Back to today <ArrowRight aria-hidden="true" size={17} /></button>
          <button className="secondary" onClick={onPause} type="button">Take a pause</button>
        </div>
      </div>
    </section>
  );

  return (
    <section className="screen app-screen checkin-screen">
      {nav}
      <form className="flow checkin-flow" onSubmit={submit} aria-busy={saveState === 'saving'}>
        <fieldset className="checkin-fields" disabled={saveState === 'saving'}>
        <div className="checkin-top-row">
          <label>
            <CalendarDays aria-hidden="true" size={17} />
            <span className="visually-hidden">Journal date</span>
            <input aria-describedby={!dateAllowed ? 'checkin-date-warning' : undefined} max={todayKey()} onChange={(event) => setField('dateKey', event.target.value)} required type="date" value={entry.dateKey} />
          </label>
          <nav className="checkin-step-nav" aria-label="Check-in progress">
            {stepLabels.map((label, index) => (
              <button aria-current={index === step ? 'step' : undefined} className={index <= step ? 'reached' : ''} disabled={isAdditionalCheckIn || !recoveryResolved || (index > 0 && !entry.mood)} key={label} onClick={() => setStep(index)} type="button">{label}</button>
            ))}
          </nav>
          <div className="checkin-top-actions">
            {onHelp && <button aria-label="Help & feedback" onClick={onHelp} title="Help & feedback" type="button"><MessageCircleQuestionMark aria-hidden="true" /></button>}
            <button aria-label="Close check-in" onClick={() => { if (confirmJournalNavigation()) navigate('/'); }} type="button"><X aria-hidden="true" /><span>Close</span></button>
          </div>
        </div>
        {!dateAllowed && <p className="form-error" id="checkin-date-warning" role="alert">Choose today or an earlier date.</p>}
        <DraftRecoveryNotice record={draftState.storedDraft} onRestore={() => { setSupportChoice(''); draftState.restoreDraft(); }} onDiscard={draftState.discardDraft} />

        {isAdditionalCheckIn ? (
          <div className="checkin-step-panel compact-checkin-panel">
            <div className="checkin-step-content">
              <div className="step-copy">
                <span>Another moment</span>
                <h2>How are you feeling now?</h2>
                <p>Add a quick mood moment without replacing the main reflection for this day.</p>
              </div>
              <MoodChoices items={visibleMoods} selected={entry.mood} onSelect={selectMood} />
              <button className="secondary subtle-action" onClick={() => setShowMoreMoods((current) => !current)} type="button">{showMoreMoods ? 'Show fewer moods' : 'More feelings'}</button>
              <label className="compact-checkin-note">Optional note
                <textarea value={entry.note} onChange={(event) => setField('note', event.target.value)} placeholder="What changed, or what do you want to remember?" />
              </label>
              <button className="ghost-button compact-details-toggle" onClick={() => setShowFullCheckIn(true)} type="button">
                <ChevronDown aria-hidden="true" size={17} />Add more detail
              </button>
            </div>
          </div>
        ) : <>
        <div className="checkin-step-panel">
          {step === 0 && (
            <div className="checkin-step-content ritual-notice">
              <div className="step-copy">
                <h1>What's here right now?</h1>
                <p>Choose what feels closest.</p>
              </div>
              <MoodChoices items={visibleMoods} selected={entry.mood} onSelect={selectMood} />
              <button aria-expanded={showMoreMoods} className="ghost-button subtle-action" onClick={() => setShowMoreMoods((current) => !current)} type="button">
                {showMoreMoods ? 'Show fewer moods' : 'More feelings'}
              </button>
              {mood && <div className="ritual-notice-detail">
                <ChoiceChips label="Does one feel closer?" values={mood.feelings} selected={entry.specificFeeling} onSelect={(value) => setField('specificFeeling', entry.specificFeeling === value ? '' : value)} />
                <div className="checkin-intensity">
                  <p className="field-label">How much space is it taking up?</p>
                  <div className="checkin-intensity-options" role="group" aria-label="Feeling intensity">
                    {intensityChoices.map(({ label, value }) => <button aria-pressed={entry.intensity === value} key={value} onClick={() => setField('intensity', value)} type="button">{label}</button>)}
                  </div>
                  <p className="checkin-intensity-value">Intensity: {entry.intensity} / 10</p>
                </div>
              </div>}
            </div>
          )}

          {step === 1 && (
            <div className="checkin-step-content ritual-reflect">
              <h1 className="visually-hidden">Reflect on this feeling</h1>
              <FeelingRecap entry={entry} />
              <div className="ritual-writing">
                <label className="ritual-prompt-picker">Need a starting point?
                  <select onChange={(event) => { setPromptType(event.target.value); setPromptIndex(0); }} value={promptType}>
                    {promptModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                </label>
                <div className="checkin-prompt-row">
                  <p id="checkin-writing-prompt">{prompt}</p>
                  <button className="ghost-button" onClick={() => setPromptIndex((current) => current + 1)} type="button"><RotateCw aria-hidden="true" />Try another prompt</button>
                </div>
                <label className="journal-writing-field">
                  <span className="visually-hidden">Your note</span>
                  <textarea aria-describedby="checkin-writing-prompt" value={entry.note} onChange={(event) => setField('note', event.target.value)} placeholder="Start wherever you are..." />
                </label>
              <Disclosure title="Anything shaping it?" open={showFactors} onToggle={() => setShowFactors((current) => !current)}>
                <ChipGroup label="Factors" values={factors} selected={entry.factors} onToggle={(value) => toggleList('factors', value)} />
              </Disclosure>
              </div>
              <button className="ghost-button" onClick={goNext} type="button">Skip writing</button>
            </div>
          )}

          {step === 2 && (
            <div className="checkin-step-content ritual-close">
              <div className="step-copy">
                <h1>What would feel supportive now?</h1>
              </div>
              <div className="ritual-support-grid" role="group" aria-label="A supportive next step">
                {supportChoices.map((choice, index) => {
                  const Icon = supportIcons[index];
                  return <button aria-pressed={supportChoice === choice || (!supportChoice && entry.copingStep === choice)} className="ritual-support-choice" key={choice} onClick={() => { setSupportChoice(choice); setField('copingStep', choice === 'Nothing right now' ? '' : choice); }} type="button"><Icon aria-hidden="true" /><span>{choice}</span></button>;
                })}
              </div>
              <FeelingRecap entry={entry} includeDetails />
              <Disclosure title="Add details" open={showExtraContext} onToggle={() => setShowExtraContext((current) => !current)}>
                <h3>How is your body?</h3>
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
                <div className="two-col">
                  <JournalTags entry={entry} onChange={(tags) => setField('tags', tags)} />
                  <label>Write your own next step
                    <input value={entry.copingStep} onChange={(event) => { setSupportChoice(''); setField('copingStep', event.target.value); }} placeholder="A small step, if one comes to mind" />
                  </label>
                </div>
              </Disclosure>
              <p className="support-note compact-support-note">This journal can help you notice patterns, but it is not a crisis service. If you might hurt yourself or someone else, call or text 988 in the U.S. now.</p>
            </div>
          )}
        </div>
        </>}

        <div className={`checkin-action-bar ritual-action-bar${isAdditionalCheckIn ? ' compact-checkin-actions' : ''}`}>
          {isAdditionalCheckIn ? <span className="compact-checkin-primary-note"><Sparkles aria-hidden="true" size={16} />Your earlier check-in stays the main one.</span> : null}
          {!isAdditionalCheckIn && <>
          {step > 0 && <button aria-label="Back" className="secondary checkin-back-button" onClick={goBack} type="button"><ArrowLeft aria-hidden="true" size={17} /><span>Back</span></button>}
          {step === 0 && <button className="secondary ritual-finish-early" disabled={!canSave || saveState === 'saving'} onClick={submit} type="button">Keep this moment</button>}
          {step < stepLabels.length - 1 && (
            <button aria-label="Continue" className="primary" disabled={!recoveryResolved || (step === 0 && !entry.mood)} onClick={goNext} type="button">Continue <ArrowRight aria-hidden="true" size={17} /></button>
          )}
          {step === stepLabels.length - 1 && (
            <button aria-label="Keep this moment" className="primary" disabled={!canSave || saveState === 'saving'} type="submit">Keep this moment</button>
          )}
          </>}
          {isAdditionalCheckIn && <button className="primary" disabled={!canSave || saveState === 'saving'} type="submit">Keep this moment</button>}
          <SaveState state={saveState} onRetry={submit} draftStatus={draftState.dirty ? draftState.draftStatus : ''} />
        </div>
        </fieldset>
      </form>
    </section>
  );
}

function MoodChoices({ items, selected, onSelect }) {
  return <div className="mood-grid checkin-mood-grid" role="group" aria-label="Current feeling">
    {items.map((item) => {
      const Icon = moodIcons[item.key];
      return <button aria-label={moodLabels[item.key] || item.key} aria-pressed={selected === item.key} className={selected === item.key ? 'mood selected' : 'mood'} key={item.key} onClick={() => onSelect(item.key)} type="button">
        <Icon aria-hidden="true" /><span>{moodLabels[item.key] || item.key}</span>
      </button>;
    })}
  </div>;
}

function FeelingRecap({ entry, includeDetails = false }) {
  const Icon = moodIcons[entry.mood] || Circle;
  return <div className="checkin-recap" aria-label="Your moment">
    <p><Icon aria-hidden="true" /><strong>{moodLabels[entry.mood] || entry.mood}{entry.specificFeeling ? ` / ${entry.specificFeeling}` : ''}</strong><span>Intensity {entry.intensity} / 10</span></p>
    {includeDetails && <>
      {entry.note && <p className="checkin-recap-note">{entry.note}</p>}
      {entry.factors.length > 0 && <p>Shaped by: {entry.factors.join(', ')}</p>}
      {entry.copingStep && <p>Next step: {entry.copingStep}</p>}
    </>}
  </div>;
}

function DetailSectionHeading({ number, label, hint }) {
  return (
    <div className="detail-section-heading">
      {number && <span className="detail-section-number" aria-hidden="true">{number}</span>}
      <div>
        <p className="field-label">{label}</p>
        {hint && <span className="detail-section-hint">{hint}</span>}
      </div>
    </div>
  );
}

function ChoiceChips({ label, values, selected, onSelect, variant = 'feeling', stepNumber, hint }) {
  return (
    <div className="choice-section">
      <DetailSectionHeading hint={hint} label={label} number={stepNumber} />
      {values.length > 0 ? (
        <div className={`choice-grid ${variant}-chip-grid`} role="group" aria-label={label}>
          {values.map((value) => (
            <button aria-pressed={selected === value} className={selected === value ? 'choice-button selected' : 'choice-button'} key={value} onClick={() => onSelect(value)} type="button">
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
          <button aria-pressed={value === option.value} className={value === option.value ? 'body-card selected' : 'body-card'} key={option.value} onClick={() => onSelect(option.value)} type="button">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Disclosure({ title, hint, number, open, onToggle, children }) {
  return (
    <div className={open ? 'disclosure-panel open' : 'disclosure-panel'}>
      <button className="disclosure-trigger" onClick={onToggle} type="button" aria-expanded={open}>
        <span className="disclosure-heading">
          {number && <span className="detail-section-number" aria-hidden="true">{number}</span>}
          <span>
            <strong>{title}</strong>
            <small>{hint}</small>
          </span>
        </span>
        <span className="disclosure-symbol" aria-hidden="true">{open ? '-' : '+'}</span>
      </button>
      {open && <div className="disclosure-content">{children}</div>}
    </div>
  );
}

function ChipGroup({ label, values, selected, onToggle, stepNumber, hint }) {
  return (
    <div className="factor-choice-panel">
      <DetailSectionHeading hint={hint} label={label} number={stepNumber} />
      <div className="chips" role="group" aria-label={label}>
        {values.map((value) => (
          <button aria-pressed={selected.includes(value)} className={selected.includes(value) ? 'chip selected' : 'chip'} key={value} onClick={() => onToggle(value)} type="button">{value}</button>
        ))}
      </div>
    </div>
  );
}
