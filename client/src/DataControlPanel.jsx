import { useState } from 'react';
import * as api from './api';

export default function DataControlPanel({
  token,
  userEmail,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  onAccountDeleted,
}) {
  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [exportOk, setExportOk] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  async function handleExport() {
    setExportErr('');
    setExportOk('');
    setExportBusy(true);
    try {
      const data = await api.exportMyData(token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const stamp = new Date().toISOString().slice(0, 10);
      api.saveBlobAsFile(blob, `financialcheckup-data-${stamp}.json`);
      setExportOk('Download started. This file contains all data you entered in Financial Checkup.');
    } catch (e) {
      setExportErr(e.message || 'Export failed.');
    } finally {
      setExportBusy(false);
    }
  }

  async function handleDelete() {
    if (!deletePassword) {
      setDeleteErr('Enter your password to confirm deletion.');
      return;
    }
    setDeleteErr('');
    setDeleteBusy(true);
    try {
      await api.deleteMyAccount(token, deletePassword);
      onAccountDeleted?.();
    } catch (e) {
      setDeleteErr(e.message || 'Could not delete account.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 14 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Your data</div>
        <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.88, lineHeight: 1.5, maxWidth: 640 }}>
          You own your financial data. Financial Checkup does not sell your information or link to your bank.
          Export everything anytime, or permanently delete your account and all stored records.
        </p>
      </div>

      <div style={{ ...cardSoftStyle, padding: '0.85rem', fontSize: 14, lineHeight: 1.5 }}>
        <div><strong>Account email:</strong> {userEmail || 'Not set'}</div>
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          Includes: income & expenses, checkup profiles & history, goals, preferences, and subscription status.
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" onClick={handleExport} disabled={exportBusy} style={btnPrimary}>
          {exportBusy ? 'Preparing export…' : 'Download all my data (JSON)'}
        </button>
      </div>
      {exportErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{exportErr}</div> : null}
      {exportOk ? <div style={{ color: '#86efac', fontSize: 14 }}>{exportOk}</div> : null}

      <div style={{ borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#fca5a5' }}>Delete account</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
          Permanently removes your account, income, expenses, checkup history, goals, and preferences. This cannot be undone.
        </p>
        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            style={{ ...btnNeutral, marginTop: 10, borderColor: 'rgba(248,113,113,0.4)', color: '#fca5a5' }}
          >
            Delete my account…
          </button>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 8, maxWidth: 320 }}>
            <input
              type="password"
              placeholder="Confirm password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleDelete} disabled={deleteBusy} style={{ ...btnNeutral, borderColor: 'rgba(248,113,113,0.5)', color: '#fca5a5' }}>
                {deleteBusy ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button type="button" onClick={() => { setDeleteOpen(false); setDeletePassword(''); setDeleteErr(''); }} style={btnNeutral}>
                Cancel
              </button>
            </div>
            {deleteErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{deleteErr}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
