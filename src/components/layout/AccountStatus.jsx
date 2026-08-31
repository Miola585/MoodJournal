export function AccountStatus({ localEntries, onImport, message, error, loading }) {
  const hasLocalEntries = localEntries.length > 0;
  if (!hasLocalEntries && !message && !error && !loading) return null;
  return (
    <section className="account-status">
      <div>
        <strong>{loading ? 'Syncing journal entries...' : 'Account notice'}</strong>
      </div>
      {hasLocalEntries && <button onClick={onImport} type="button">Import local entries</button>}
      {message && <span className="success-message">{message}</span>}
      {error && <span className="form-error">{error}</span>}
    </section>
  );
}
