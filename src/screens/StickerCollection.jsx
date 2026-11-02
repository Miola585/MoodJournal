import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { stickers, stickerPages, isStickerUnlocked } from '../data/stickers';
import { StickerArtwork } from '../components/journal/StickerArtwork';
import { useStickerDiscoveries } from '../components/journal/StickerBook';
import '../styles/editor.css';

export function StickerCollection({ privateStorage }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const { discoveries, discoveryError, loading } = useStickerDiscoveries(privateStorage);
  const categories = stickerPages.filter((page) => stickers.some((sticker) => sticker.page === page.id));
  const visible = stickers.filter((sticker) => category === 'all' || sticker.page === category);
  const unlockedCount = stickers.filter((sticker) => isStickerUnlocked(sticker, discoveries)).length;

  return <section className="screen app-screen sticker-collection-screen" aria-labelledby="sticker-collection-title">
    <header className="sticker-collection-heading">
      <div><span className="screen-kicker">Your collection</span><h1 id="sticker-collection-title">Sticker collection</h1></div>
      <span role="status">{loading ? 'Loading discoveries...' : `${unlockedCount} of ${stickers.length} available`}</span>
    </header>
    {discoveryError && <p role="alert">{discoveryError}</p>}
    <div className="sticker-collection-categories" role="group" aria-label="Sticker categories">
      {[{ id: 'all', title: 'All' }, ...categories].map((page) => <button aria-pressed={category === page.id} key={page.id} onClick={() => setCategory(page.id)} type="button">{page.title}</button>)}
    </div>
    <div className="sticker-collection-grid">
      {visible.map((sticker) => {
        const available = isStickerUnlocked(sticker, discoveries);
        return <article className="sticker-collection-item" key={sticker.id}>
          <div className="sticker-collection-art"><StickerArtwork longEdge={112} sticker={sticker} /></div>
          <h2>{sticker.name}</h2>
          <span className="sticker-collection-category">{stickerPages.find((page) => page.id === sticker.page)?.title}</span>
          <span className="sticker-collection-status">{available ? <Check aria-hidden="true" size={14} /> : <Lock aria-hidden="true" size={14} />}{available ? 'Available' : loading ? 'Checking discovery...' : 'Discover in Daily Constellation'}</span>
          <button className="secondary-button" aria-label={`Use ${sticker.name} in journal`} disabled={!available} onClick={() => navigate('/journal/write', { state: { stickerId: sticker.id } })} type="button">Use in journal</button>
        </article>;
      })}
    </div>
  </section>;
}
