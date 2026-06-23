import { useState } from 'react';
import * as api from './api';

export default function AccountSettingsPanel({
  token,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
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
    <div style={{ ...cardSoftStyle, padding: '1.15rem 1.2rem', display: 'grid', gap: 14, height: '100%', borderLeft: '3px solid #64748b' }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>Password</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
          Update your sign-in password. Use at least 8 characters with a letter and a number.
        </p>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ ...inputStyle, width: '100%' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ ...inputStyle, width: '100%' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={{ ...inputStyle, width: '100%' }}
          />
        </label>
        {err ? <div style={{ color: '#fca5a5', fontSize: 13 }}>{err}</div> : null}
        {ok ? <div style={{ color: '#86efac', fontSize: 13 }}>{ok}</div> : null}
        <button type="submit" disabled={busy} style={{ ...btnPrimary, justifySelf: 'start' }}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
