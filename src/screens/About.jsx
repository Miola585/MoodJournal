import { featureCards, resourceLinks } from '../data/journalData';

export function About({ nav }) {
  return (
    <section className="screen app-screen">
      <h1>About the App</h1>
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
