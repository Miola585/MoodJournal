import { featureCards, resourceLinks } from '../data/journalData';
import { PageHeader } from '../components/layout/PageHeader';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import artCredits from '../data/artCredits.json';

export function About({ nav }) {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (hash !== '#art-credits') return;
    const heading = document.getElementById('art-credits-title');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
  }, [hash, key]);

  return (
    <section className="screen app-screen">
      <PageHeader title="About Mood Journal" subtitle="A personal place for reflection, emotional awareness, and gentle support." />
      {nav}
      <div className="feature-cards">
        {featureCards.map((card) => (
          <article className="feature-card" key={card.title}>
            <img src={card.image} alt="" />
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
      <section className="art-credits" id="art-credits" aria-labelledby="art-credits-title">
        <h2 id="art-credits-title" tabIndex={-1}>Art credits</h2>
        <ul>
          {artCredits.map((credit) => (
            <li key={credit.id}>
              <div><strong>{credit.artwork}</strong>{credit.usage === 'planned' && <span>Upcoming library project</span>}</div>
              <div>
                <a href={credit.creatorUrl} target="_blank" rel="noreferrer">{credit.creator}</a>
                {credit.sourceUrl && <a className="art-credit-source" href={credit.sourceUrl} target="_blank" rel="noreferrer">{credit.sourceLabel}</a>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <Links />
    </section>
  );
}

function Links() {
  return (
    <section className="links-section" id="links">
      <h2>Links</h2>
      <div className="links-row">
        {resourceLinks.map((link) => (
          <a className="resource-link" href={link.href} key={link.href} target="_blank" rel="noreferrer">
            <article className={`resource-card ${link.className}`}>
              <h3>{link.title}</h3>
              <span className="tag">{link.tag}</span>
              <p>{link.text}</p>
            </article>
          </a>
        ))}
      </div>
    </section>
  );
}
