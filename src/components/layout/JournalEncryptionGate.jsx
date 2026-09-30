import { useState } from 'react';
import { Check, Copy, Download, KeyRound, ShieldCheck } from 'lucide-react';

export function JournalEncryptionGate({ busy, error, setupRequired = false, usesAccountPassword = false, onSetup, onUnlockPassphrase, onUnlockRecovery }) {
  const [mode, setMode] = useState('passphrase');
  const [credential, setCredential] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!credential.trim()) return;
    const unlocked = setupRequired
      ? await onSetup(credential)
      : mode === 'recovery'
      ? await onUnlockRecovery(credential)
      : await onUnlockPassphrase(credential);
    if (unlocked) setCredential('');
  };

  return (
    <section className="screen app-screen encryption-gate-screen">
      <div className="encryption-gate ui-card ui-card-primary">
        <span className="encryption-gate-icon"><ShieldCheck aria-hidden="true" size={28} /></span>
        <p className="eyebrow">Private journal</p>
        <h1>{setupRequired ? 'Protect your journal first' : 'Unlock your journal'}</h1>
        <p>{setupRequired
          ? 'Confirm your account password to create a private encryption key in this browser. Your journal text will be encrypted before it is sent to Supabase.'
          : `Your entries are encrypted before storage. Enter your ${usesAccountPassword ? 'account password' : 'journal passphrase'} to open them on this device.`}</p>

        {!setupRequired && <div className="segmented-control encryption-mode-tabs" aria-label="Unlock method">
          <button aria-pressed={mode === 'passphrase'} className={mode === 'passphrase' ? 'active' : ''} onClick={() => { setMode('passphrase'); setCredential(''); }} type="button">Passphrase</button>
          <button aria-pressed={mode === 'recovery'} className={mode === 'recovery' ? 'active' : ''} onClick={() => { setMode('recovery'); setCredential(''); }} type="button">Recovery key</button>
        </div>}

        <form onSubmit={submit}>
          <label htmlFor="journal-unlock-credential">{setupRequired ? 'Account password' : mode === 'recovery' ? 'Recovery key' : usesAccountPassword ? 'Account password' : 'Journal passphrase'}</label>
          <div className="encryption-credential-row">
            <input
              autoComplete={mode === 'passphrase' ? 'current-password' : 'off'}
              autoFocus
              id="journal-unlock-credential"
              onChange={(event) => setCredential(event.target.value)}
              placeholder={mode === 'recovery' && !setupRequired ? 'MJ1...' : setupRequired || usesAccountPassword ? 'Enter your account password' : 'Enter your journal passphrase'}
              spellCheck="false"
              type={mode === 'recovery' && !setupRequired ? 'text' : 'password'}
              value={credential}
            />
            <button className="primary-button" disabled={busy || !credential.trim()} type="submit"><KeyRound aria-hidden="true" size={17} />{busy ? 'Protecting...' : setupRequired ? 'Create encrypted journal' : 'Unlock'}</button>
          </div>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="encryption-fine-print">{setupRequired ? 'Next, you will receive a one-time recovery key. Store it somewhere private and safe.' : 'If you lose both your passphrase and recovery key, nobody can restore these entries, including the app administrator.'}</p>
      </div>
    </section>
  );
}

export function RecoveryKeyNotice({ recoveryKey, onStored }) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setMessage('Recovery key copied. Keep it outside Mood Journal in a private place.');
    } catch {
      setMessage('Copy was blocked. Select the key and copy it manually.');
    }
  };

  const downloadKey = () => {
    const blob = new Blob([`Mood Journal recovery key\n\n${recoveryKey}\n\nStore this somewhere private and safe. Mood Journal cannot recover it for you.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mood-journal-recovery-key.txt';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Recovery key downloaded. Move the file to a private, safe place.');
  };

  return (
    <section className="screen app-screen encryption-gate-screen">
      <div className="encryption-gate recovery-key-gate ui-card ui-card-primary">
        <span className="encryption-gate-icon"><ShieldCheck aria-hidden="true" size={28} /></span>
        <p className="eyebrow">One important step</p>
        <h1>Store your recovery key safely</h1>
        <p>This is the only backup for your encrypted journal if you forget your password. Mood Journal and its administrators cannot recreate it.</p>
        <code>{recoveryKey}</code>
        <div className="settings-actions">
          <button className="secondary-button" onClick={copyKey} type="button"><Copy aria-hidden="true" size={16} />Copy key</button>
          <button className="secondary-button" onClick={downloadKey} type="button"><Download aria-hidden="true" size={16} />Download key</button>
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
        <label className="recovery-confirmation"><input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span><Check aria-hidden="true" size={16} />I stored this key somewhere private and safe</span></label>
        <button className="primary-button" disabled={!confirmed} onClick={onStored} type="button">Continue to my journal</button>
      </div>
    </section>
  );
}
