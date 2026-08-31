import { useState } from 'react';
import { sunshineUrl } from '../data/journalData';

export function Newsletter({ nav }) {
  const [people, setPeople] = useState([
    { name: 'Jamie', school: 'Morgan State' },
    { name: 'Amy', school: 'Bowie' },
    { name: 'Teresa', school: 'UMBC' }
  ]);
  const [form, setForm] = useState({ name: '', email: '', school: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || !form.email.includes('@') || form.school.trim().length < 2) {
      setError('Please enter a name, school, and valid email.');
      return;
    }
    setPeople([...people, { name: form.name.trim(), school: form.school.trim() }]);
    setMessage(`You're all set ${form.name.trim()}!`);
    setForm({ name: '', email: '', school: '' });
    setError('');
  };

  return (
    <section className="newsletter-section app-screen" id="rsvp">
      <h1>Stay Connected</h1>
      {nav}
      <div className="newsletter-grid">
        <p>Stay connected with upcoming wellness activities, journaling prompts, and mindfulness tips. Join our community to receive gentle reminders and supportive resources.</p>
        <div className="participants">
          {people.map((person, index) => <p key={`${person.name}-${index}`}>🌻 {person.name} from {person.school} has checked in!</p>)}
          <p>🔔 {people.length} people have checked in!</p>
        </div>
      </div>
      <form className="newsletter-form" onSubmit={submit}>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>School<input value={form.school} onChange={(event) => setForm({ ...form, school: event.target.value })} /></label>
        <button className="primary" type="submit">Stay Updated!</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {message && <div className="success-box"><p>{message}<br />You'll receive updates with wellness tips and journaling prompts.</p><img src={sunshineUrl} alt="A cartoony image of the sun" /></div>}
    </section>
  );
}
