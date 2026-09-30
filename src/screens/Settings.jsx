import { useState } from 'react';
import { Accessibility, Bell, BookOpen, Check, Copy, Database, Download, KeyRound, LockKeyhole, Moon, Palette, ShieldCheck, Sun, Sunset, Type, UserRound } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { todayKey } from '../utils/journalUtils';
import { MAX_IMPORT_FILE_BYTES, parseJournalBackup } from '../utils/journalImport';
import { themeChoices } from '../data/themeChoices';

export function Settings({
  nav, user, profile, entries, saveEntries, fontScale, setFontScale, fontStyle, setFontStyle,
  siteTheme, setSiteTheme, theme, setTheme, reduceMotion, setReduceMotion, pin, setPin, onOpen,
  recoverPin, journalLockCode, setJournalLockCode, journalUnlocked, setJournalUnlocked, reminder, setReminder,
  journalEncryption
}) {
  const usesSunriseWorld = siteTheme === 'sunrise';
  const DarkModeIcon = usesSunriseWorld ? Sunset : Moon;
  const [pinDraft, setPinDraft] = useState(pin);
  const [pinRecoveryOpen, setPinRecoveryOpen] = useState(false);
  const [pinRecoveryPassword, setPinRecoveryPassword] = useState('');
  const [pinRecoveryMessage, setPinRecoveryMessage] = useState('');
  const [pinRecoveryBusy, setPinRecoveryBusy] = useState(false);
  const [journalCodeDraft, setJournalCodeDraft] = useState(journalLockCode);
  const [encryptionPassphrase, setEncryptionPassphrase] = useState('');
  const [encryptionConfirmation, setEncryptionConfirmation] = useState('');
  const [newEncryptionPassphrase, setNewEncryptionPassphrase] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [encryptionMessage, setEncryptionMessage] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const reminderTimes = reminder.times?.length ? reminder.times : [reminder.time || '19:00'];
  const updateReminderTime = (index, value) => {
    const nextTimes = reminderTimes.map((time, timeIndex) => timeIndex === index ? value : time);
    setReminder({ ...reminder, time: nextTimes[0], times: nextTimes });
  };
  const addReminderTime = () => {
    const nextTimes = [...reminderTimes, '19:00'];
    setReminder({ ...reminder, time: nextTimes[0], times: nextTimes });
  };
  const removeReminderTime = (index) => {
    const nextTimes = reminderTimes.filter((_, timeIndex) => timeIndex !== index);
    const safeTimes = nextTimes.length ? nextTimes : ['19:00'];
    setReminder({ ...reminder, time: safeTimes[0], times: safeTimes });
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ journalEntriesV2: entries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mood-journal-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDataMessage('');
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setDataMessage('That backup is too large to import. The limit is 5 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const importedEntries = parseJournalBackup(reader.result);
        const saved = await saveEntries(importedEntries);
        setDataMessage(saved ? `${importedEntries.length} journal entr${importedEntries.length === 1 ? 'y' : 'ies'} imported.` : 'The backup could not be saved.');
      } catch (error) {
        setDataMessage(error.message || 'Could not import that file.');
      }
      event.target.value = '';
    };
    reader.onerror = () => {
      setDataMessage('The browser could not read that backup file.');
      event.target.value = '';
    };
    reader.readAsText(file);
  };
  const enableEncryption = async () => {
    setEncryptionMessage('');
    if (encryptionPassphrase !== encryptionConfirmation) {
      setEncryptionMessage('The two passphrases do not match.');
      return;
    }
    try {
      const nextRecoveryKey = await journalEncryption.enable(encryptionPassphrase);
      setRecoveryKey(nextRecoveryKey);
      setEncryptionPassphrase('');
      setEncryptionConfirmation('');
      setEncryptionMessage('Encryption is on. Store the recovery key somewhere private before leaving this page.');
    } catch (error) {
      setEncryptionMessage(error.message);
    }
  };
  const changeEncryptionPassphrase = async () => {
    setEncryptionMessage('');
    try {
      await journalEncryption.changePassphrase(newEncryptionPassphrase);
      setNewEncryptionPassphrase('');
      setEncryptionMessage('Your journal passphrase was changed. Your recovery key is still the same.');
    } catch (error) {
      setEncryptionMessage(error.message);
    }
  };
  const copyRecoveryKey = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setEncryptionMessage('Recovery key copied. Keep it outside this app in a private place.');
    } catch {
      setEncryptionMessage('Copy was blocked by the browser. Select the recovery key and copy it manually.');
    }
  };
  const downloadRecoveryKey = () => {
    const blob = new Blob([`Mood Journal recovery key\n\n${recoveryKey}\n\nKeep this private. Anyone with this key and access to your encrypted journal can read it.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mood-journal-recovery-key.txt';
    link.click();
    URL.revokeObjectURL(url);
  };
  const resetForgottenPin = async () => {
    setPinRecoveryBusy(true);
    setPinRecoveryMessage('');
    const result = await recoverPin(pinRecoveryPassword);
    setPinRecoveryBusy(false);
    if (!result?.ok) {
      setPinRecoveryMessage(result?.error || 'The PIN could not be reset.');
      return;
    }
    setPinDraft('');
    setPinRecoveryPassword('');
    setPinRecoveryOpen(false);
    setPinRecoveryMessage('The device PIN was removed. You can set a new one whenever you are ready.');
  };

  return (
    <section className="screen app-screen settings-screen">
      <PageHeader eyebrow="Your space" title="Settings" subtitle="Shape how your journal looks and feels on this device." />
      {nav}

      <section className="settings-profile ui-card ui-card-secondary">
        <span className="settings-section-icon"><UserRound aria-hidden="true" size={20} /></span>
        <div><strong>{profile?.username || 'Your profile'}</strong><span>{user?.email || 'Local browser profile'}</span></div>
        {profile?.role === 'admin' && <span className="admin-badge">Admin</span>}
      </section>

      <SettingsSection icon={Palette} title="Appearance" description="Choose a world for your journal. The layout stays familiar in every theme.">
        <div className="theme-preview-grid" role="radiogroup" aria-label="Journal theme">
          {themeChoices.map((choice) => (
            <button
              aria-checked={siteTheme === choice.key}
              className={siteTheme === choice.key ? 'theme-preview selected' : 'theme-preview'}
              key={choice.key}
              onClick={() => setSiteTheme(choice.key)}
              role="radio"
              type="button"
            >
              <span className="theme-preview-art" aria-hidden="true">
                {choice.colors.map((color) => <i key={color} style={{ background: color }} />)}
              </span>
              <span>{choice.label}</span>
              <i className="theme-selected-mark" aria-hidden="true"><Check size={13} strokeWidth={3} /></i>
            </button>
          ))}
        </div>
        <div className="settings-row settings-mode-row">
          <div><strong>Color mode</strong><span>Switch between the light and dark version of this theme.</span></div>
          <div className="segmented-control" aria-label="Color mode">
            <button aria-pressed={theme === 'light'} className={theme === 'light' ? 'active' : ''} onClick={() => theme !== 'light' && setTheme()} type="button"><Sun aria-hidden="true" size={16} />{usesSunriseWorld ? 'Sunrise' : 'Light'}</button>
            <button aria-pressed={theme === 'dark'} className={theme === 'dark' ? 'active' : ''} onClick={() => theme !== 'dark' && setTheme()} type="button"><DarkModeIcon aria-hidden="true" size={16} />{usesSunriseWorld ? 'Sunset' : 'Dark'}</button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={Accessibility} title="Experience" description="Keep movement and reading comfortable.">
        <div className="settings-row">
          <div><strong>Reduced motion</strong><span>Limit decorative movement and animated transitions.</span></div>
          <button aria-pressed={reduceMotion} className={reduceMotion ? 'settings-switch active' : 'settings-switch'} onClick={setReduceMotion} type="button"><span />{reduceMotion ? 'On' : 'Off'}</button>
        </div>
        <div className="settings-control-grid">
          <label><span><Type aria-hidden="true" size={17} />Text size</span><input aria-valuetext={`${Math.round(fontScale * 100)} percent`} max="1.3" min="0.9" onChange={(event) => setFontScale(Number(event.target.value))} step="0.05" type="range" value={fontScale} /></label>
          <label><span>Font style</span><select onChange={(event) => setFontStyle(event.target.value)} value={fontStyle}><option value="friendly">Friendly</option><option value="classic">Classic</option><option value="clean">Clean</option></select></label>
        </div>
      </SettingsSection>

      <SettingsSection icon={Bell} title="Journal" description="Set a gentle reminder for the times that work for you.">
        <div className="reminder-time-list">
          {reminderTimes.map((time, index) => (
            <label key={`${time}-${index}`}>Reminder {index + 1}<span className="reminder-time-row"><input onChange={(event) => updateReminderTime(index, event.target.value)} type="time" value={time} />{reminderTimes.length > 1 && <button className="ghost-button" onClick={() => removeReminderTime(index)} type="button">Remove</button>}</span></label>
          ))}
        </div>
        <div className="settings-actions">
          <button className="secondary-button" onClick={addReminderTime} type="button">Add reminder</button>
          <button className="primary-button" onClick={async () => { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); setReminder({ ...reminder, enabled: !reminder.enabled }); }} type="button">{reminder.enabled ? 'Turn reminders off' : 'Turn reminders on'}</button>
        </div>
      </SettingsSection>

      <SettingsSection icon={ShieldCheck} title="Privacy" description="Protect what you write in storage and add privacy screens on this device.">
        <div className={journalEncryption.enabled ? 'encryption-status enabled' : 'encryption-status'}>
          <span className="encryption-status-icon"><KeyRound aria-hidden="true" size={20} /></span>
          <div>
            <strong>{journalEncryption.enabled ? 'Stored journal encryption is on' : 'End-to-end encrypt stored entries'}</strong>
            <span>{journalEncryption.enabled
              ? 'Entry contents are readable only after you unlock this journal on your device.'
              : 'Encrypt entries in your browser before they reach local storage or Supabase.'}</span>
          </div>
          {journalEncryption.enabled && <span className="encryption-badge">Protected</span>}
        </div>

        {!journalEncryption.enabled && <div className="encryption-setup">
          <p>Use a unique passphrase of at least 12 characters. A phrase made from several unrelated words is easier to remember and harder to guess.</p>
          <div className="settings-control-grid">
            <label>Journal passphrase<input autoComplete="new-password" onChange={(event) => setEncryptionPassphrase(event.target.value)} placeholder="At least 12 characters" type="password" value={encryptionPassphrase} /></label>
            <label>Confirm passphrase<input autoComplete="new-password" onChange={(event) => setEncryptionConfirmation(event.target.value)} placeholder="Enter it again" type="password" value={encryptionConfirmation} /></label>
          </div>
          <button className="primary-button" disabled={journalEncryption.busy || !encryptionPassphrase || !encryptionConfirmation} onClick={enableEncryption} type="button"><ShieldCheck aria-hidden="true" size={17} />{journalEncryption.busy ? 'Encrypting journal...' : 'Turn on encryption'}</button>
          <p className="encryption-fine-print">Encryption cannot recover a forgotten passphrase. You will receive one recovery key to store privately. The service can still see account, usage, record-count, and padded ciphertext-size metadata, but not entry text, moods, journal dates, tags, or titles. This does not protect an unlocked journal from a compromised device or browser.</p>
        </div>}

        {journalEncryption.enabled && journalEncryption.unlocked && <div className="encryption-unlocked-actions">
          <label>New journal passphrase<input autoComplete="new-password" onChange={(event) => setNewEncryptionPassphrase(event.target.value)} placeholder="At least 12 characters" type="password" value={newEncryptionPassphrase} /></label>
          <div className="settings-actions">
            <button className="secondary-button" disabled={journalEncryption.busy || !newEncryptionPassphrase} onClick={changeEncryptionPassphrase} type="button">Change passphrase</button>
            <button className="ghost-button" onClick={journalEncryption.lock} type="button"><LockKeyhole aria-hidden="true" size={16} />Lock journal now</button>
          </div>
        </div>}

        {recoveryKey && <div className="recovery-key-panel" role="status">
          <strong>Save this recovery key now</strong>
          <p>It is shown only during this setup. Anyone with this key and access to your encrypted data can open the journal.</p>
          <code>{recoveryKey}</code>
          <div className="settings-actions">
            <button className="secondary-button" onClick={copyRecoveryKey} type="button"><Copy aria-hidden="true" size={16} />Copy key</button>
            <button className="secondary-button" onClick={downloadRecoveryKey} type="button"><Download aria-hidden="true" size={16} />Download key</button>
            <button className="ghost-button" onClick={() => setRecoveryKey('')} type="button">I stored it safely</button>
          </div>
        </div>}
        {encryptionMessage && <p className="settings-message" role="status">{encryptionMessage}</p>}
        {journalEncryption.error && <p className="form-error" role="alert">{journalEncryption.error}</p>}

        <h3 className="settings-subheading">Local privacy screens</h3>
        <div className="settings-control-grid">
          <label>App PIN<input inputMode="numeric" onChange={(event) => setPinDraft(event.target.value)} placeholder="4 digits" type="password" value={pinDraft} /></label>
          <div className="settings-field-actions"><button className="secondary-button" onClick={() => setPin(pinDraft)} type="button">{pin ? 'Update PIN' : 'Set PIN'}</button>{pin && <button className="ghost-button" onClick={() => { setPinDraft(''); setPin(''); }} type="button">Remove</button>}{pin && user && <button className="ghost-button" onClick={() => { setPinRecoveryOpen((open) => !open); setPinRecoveryMessage(''); }} type="button">Forgot PIN?</button>}</div>
          {pinRecoveryOpen && <div className="settings-inline-recovery">
            <p>Confirm your account password to remove the forgotten device PIN. This does not change your encrypted-journal passphrase.</p>
            <label>Account password<input autoComplete="current-password" onChange={(event) => setPinRecoveryPassword(event.target.value)} type="password" value={pinRecoveryPassword} /></label>
            <div className="settings-actions"><button className="secondary-button" disabled={pinRecoveryBusy || !pinRecoveryPassword} onClick={resetForgottenPin} type="button">{pinRecoveryBusy ? 'Checking...' : 'Reset PIN'}</button><button className="ghost-button" onClick={() => { setPinRecoveryOpen(false); setPinRecoveryPassword(''); setPinRecoveryMessage(''); }} type="button">Cancel</button></div>
          </div>}
          <label>Journal lock<input onChange={(event) => setJournalCodeDraft(event.target.value)} placeholder="Passphrase or PIN" type="password" value={journalCodeDraft} /></label>
          <div className="settings-field-actions"><button className="secondary-button" onClick={() => setJournalLockCode(journalCodeDraft)} type="button">{journalLockCode ? 'Update lock' : 'Enable lock'}</button>{journalLockCode && <button className="ghost-button" onClick={() => { setJournalCodeDraft(''); setJournalLockCode(''); }} type="button">Remove</button>}{journalLockCode && <button className="ghost-button" onClick={() => setJournalUnlocked(!journalUnlocked)} type="button">{journalUnlocked ? 'Hide now' : 'Keep revealed'}</button>}</div>
        </div>
        {pinRecoveryMessage && <p className="settings-message" role="status">{pinRecoveryMessage}</p>}
        <p className="privacy-note"><LockKeyhole aria-hidden="true" size={16} />These PIN and journal-lock controls only hide the interface on this device. Stored-content encryption above is what prevents readable entries from being saved.</p>
      </SettingsSection>

      <SettingsSection icon={Database} title="Privacy & Data" description="Keep a copy of your journal or restore one you exported earlier.">
        <div className="settings-actions"><button className="secondary-button" onClick={exportData} type="button">Export data</button><label className="file-button secondary-button">Import data<input accept="application/json" onChange={importData} type="file" /></label></div>
        {dataMessage && <p className="settings-message" role="status">{dataMessage}</p>}
        {journalEncryption.enabled && <p className="privacy-note"><Download aria-hidden="true" size={16} />Exports are readable JSON created on this device after unlocking. Store exported files as carefully as the journal itself.</p>}
      </SettingsSection>

      <SettingsSection icon={BookOpen} title="About" description="Mood Journal is a quiet place to notice what is here without judgment.">
        <div className="settings-actions"><button className="ghost-button" onClick={() => onOpen('about')} type="button">About Mood Journal</button><button className="ghost-button" onClick={() => onOpen('newsletter')} type="button">Community updates</button></div>
      </SettingsSection>
    </section>
  );
}

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <section className="settings-section ui-card ui-card-primary">
      <header><span className="settings-section-icon"><Icon aria-hidden="true" size={20} /></span><div><h2>{title}</h2><p>{description}</p></div></header>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}
