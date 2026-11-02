import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Home, Leaf, List, Moon, Search, Sparkles, Sun, Wind } from 'lucide-react';
import { useGameStorageState } from '../../hooks/useGameStorageState';
import { DestinationArt } from '../layout/DestinationArt';
import { PauseNote } from './PauseNote';
import { confirmJournalNavigation } from '../../hooks/useJournalDraft';
import '../../styles/smallWonders.css';

const places = [
  { id: 'here', label: 'Where I am', icon: Search },
  { id: 'indoors', label: 'Indoors', icon: Home },
  { id: 'outside', label: 'Outside', icon: Leaf }
];
const wonders = [
  { id: 'light', title: 'Something catching the light', icon: Sun, hints: ['A reflection or a patch of light.', 'A window, a glass, or a lamp.', 'A leaf, a puddle, or a sunlit path. Never look directly at the sun.'] },
  { id: 'texture', title: "A texture you hadn't noticed", icon: Leaf, hints: ['Something smooth, ridged, or woven.', 'A cushion, a book cover, or the edge of a table.', 'Bark, a stone, or a leaf. Leave it where it is.'] },
  { id: 'movement', title: 'Something moving, even a little', icon: Wind, hints: ['A shifting shadow, a cloud, or your breath.', 'A curtain, a clock, or your shoulders.', 'A blade of grass or a passing cloud.'] },
  { id: 'detail', title: 'A tiny detail', icon: Search, hints: ['A little mark or a spot of color.', 'A stitch, an illustration, or a favorite object.', 'A leaf vein, a pebble, or a mark on the path.'] },
  { id: 'comfort', title: 'Something that feels comforting', icon: Moon, hints: ['A familiar color, object, or place to rest.', 'A mug, a blanket, or a quiet corner.', 'Shade, a tree, or a familiar view.'] },
  { id: 'curve', title: 'A gentle curve', icon: Moon, hints: ['An arch, a rounded edge, or a winding line.', 'A cup handle, a chair, or a plant.', 'A leaf, a branch, or a bending path.'] },
  { id: 'color', title: "A color you'd like to keep", icon: Sparkles, hints: ["You don't need to name it. Just notice it.", 'A book, a piece of fabric, or part of the room.', 'The sky, a petal, or a stone.'] },
  { id: 'pattern', title: 'A little repetition', icon: List, hints: ['Lines, dots, or shapes that repeat.', 'Tiles, stripes, or stitches.', 'Leaf edges, paving, or branches.'] }
];
const emptyHunt = { stage: 'setup', place: 'here', target: 3, finds: [], cursor: 0 };
function normalizeHunt(value) {
  return {
    stage: ['setup', 'hunt', 'complete'].includes(value?.stage) ? value.stage : 'setup',
    place: places.some((place) => place.id === value?.place) ? value.place : 'here',
    target: value?.target === 5 ? 5 : 3,
    finds: [...new Set(Array.isArray(value?.finds) ? value.finds.filter((id) => wonders.some((wonder) => wonder.id === id)) : [])].slice(0, 5),
    cursor: Number.isInteger(value?.cursor) && value.cursor >= 0 ? value.cursor : 0
  };
}

export function SmallWonders({ today, privateStorage }) {
  const [hunt, save, error, ready] = useGameStorageState(privateStorage, `gameSmallWondersV1:${today}`, normalizeHunt);
  const [place, setPlace] = useState('here');
  const [target, setTarget] = useState(3);
  const [earlierFinds] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(`groundingHunt:${today}`));
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch { return []; }
  });
  const state = hunt.stage ? hunt : emptyHunt;
  const pageRef = useRef(null);
  useEffect(() => {
    if (!hunt.stage) return;
    const title = pageRef.current?.querySelector('h1');
    title?.setAttribute('tabindex', '-1');
    title?.focus({ preventScroll: true });
  }, [hunt.stage]);
  const remaining = wonders.filter((wonder) => !state.finds.includes(wonder.id));
  const current = remaining[state.cursor % remaining.length];
  const Icon = current?.icon || Sparkles;
  const completed = state.stage === 'complete' || !current;
  const change = (patch) => save((stored) => ({ ...stored, ...patch }));
  const found = () => save((stored) => {
    const finds = [...new Set([...stored.finds, current.id])];
    return { ...stored, finds, cursor: 0, stage: finds.length >= stored.target ? 'complete' : 'hunt' };
  });
  return <section className="wonders-page" aria-label="Small wonders scavenger hunt" ref={pageRef}>
    {error && <p className="form-error" role="alert">{error} Your progress is unchanged. Please try again.</p>}
    {!hunt.stage && !error && <p role="status">Opening your field notebook...</p>}
    {state.stage === 'setup' ? <>
      <header className="wonders-intro">
        <div><span className="app-eyebrow">Small wonders</span><h1>A little wonder, right where you are.</h1><p>A gentle scavenger hunt.</p></div>
        <DestinationArt kind="wonders" />
      </header>
      <div className="wonders-setup">
        <fieldset disabled={!ready}><legend>Where would you like to look?</legend><div className="wonders-place-options">{places.map(({ id, label, icon: PlaceIcon }) => <button key={id} type="button" aria-pressed={place === id} onClick={() => setPlace(id)}><PlaceIcon size={24} aria-hidden="true" />{label}</button>)}</div></fieldset>
        <fieldset disabled={!ready}><legend>How many little wonders?</legend><div className="wonders-length-options">{[3, 5].map((count) => <button key={count} type="button" aria-pressed={target === count} onClick={() => setTarget(count)}>{count} wonders</button>)}</div></fieldset>
        <div className="wonders-begin"><p>Stay somewhere safe. Nothing needs to be picked up.</p><button className="primary" disabled={!ready} onClick={() => change({ ...emptyHunt, place, target, stage: 'hunt' })} type="button">Begin noticing<ArrowRight size={18} aria-hidden="true" /></button></div>
      </div>
    </> : completed ? <div className="wonders-complete">
      <span className="app-eyebrow">Small wonders, noticed</span>
      <h1>{state.finds.length ? 'The ordinary has its wonders.' : 'A pause counts, too.'}</h1>
      <p>{state.finds.length} of {state.target} wonders noticed.</p>
      <ul className="wonders-collected">{state.finds.map((id) => { const wonder = wonders.find((item) => item.id === id); return <li key={id}><wonder.icon size={22} aria-hidden="true" /><span>{wonder.title}</span><Check size={18} aria-hidden="true" /></li>; })}</ul>
      <PauseNote privateStorage={privateStorage} storageKey={`groundingNoteV1:scavenger:${today}`} />
      <button className="secondary" type="button" disabled={!ready} onClick={() => { if (confirmJournalNavigation() && window.confirm('Start a new hunt? This replaces today\'s finds, but keeps your saved note.')) change(emptyHunt); }}>Start a new hunt</button>
    </div> : <>
      <header className="wonders-hunt-heading"><span className="app-eyebrow">Small wonders</span><h1>Look a little closer.</h1><p>{places.find((item) => item.id === state.place)?.label}</p></header>
      <div className="wonders-progress" aria-label={`${state.finds.length} of ${state.target} wonders noticed`}>{Array.from({ length: state.target }, (_, index) => <span key={index} className={index < state.finds.length ? 'found' : ''}>{index < state.finds.length ? <Check size={18} aria-hidden="true" /> : index + 1}</span>)}</div>
      <article className="wonders-prompt" aria-live="polite" aria-atomic="true">
        <Icon className="wonders-prompt-symbol" size={72} aria-hidden="true" /><h2>{current.title}</h2><p>{current.hints[places.findIndex((item) => item.id === state.place)]}</p>
        <div className="wonders-prompt-actions"><button className="secondary" disabled={!ready} onClick={() => change({ cursor: state.cursor + 1 })} type="button">Try another</button><button className="primary" disabled={!ready} onClick={found} type="button">Found it<Check size={18} aria-hidden="true" /></button></div>
      </article>
      <div className="wonders-hunt-footer"><span>No hurry. Notice what you can.</span><button className="secondary" disabled={!ready} onClick={() => change({ stage: 'complete' })} type="button">Finish here</button></div>
    </>}
    {earlierFinds.length > 0 && <details className="wonders-earlier"><summary>Earlier finds today ({earlierFinds.length})</summary><ul>{earlierFinds.map((item, index) => <li key={`${item}:${index}`}>{item}</li>)}</ul></details>}
  </section>;
}
