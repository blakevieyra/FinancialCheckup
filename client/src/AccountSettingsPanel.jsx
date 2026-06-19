import { useState } from 'react';
import * as api from './api';

export default function AccountSettingsPanel({
  token,
  accountEmail,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setOk('');
    if (newPassword !== confirmPassword) {
      setErr('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.changePassword(token, { currentPassword, newPassword });
      setOk(res.message || 'Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (ex) {
      setErr(ex.message || 'Could not update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Account & security</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
          {accountEmail ? (
            <>Signed in · account email <strong>{accountEmail}</strong></>
          ) : (
            <>No email on file — support replies require an email at registration.</>
          )}
        </p>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Current password
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" style={{ ...inputStyle, width: '100%' }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          New password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" style={{ ...inputStyle, width: '100%' }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Confirm new password
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" style={{ ...inputStyle, width: '100%' }} />
        </label>
        <div style={{ fontSize: 11, opacity: 0.65 }}>Min 8 characters with a letter and a number.</div>
        {err ? <div style={{ color: '#ffb3b3', fontSize: 13 }}>{err}</div> : null}
        {ok ? <div style={{ color: '#86efac', fontSize: 13 }}>{ok}</div> : null}
        <button type="submit" disabled={busy} style={{ ...btnPrimary, justifySelf: 'start' }}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
