import { useState } from 'react';
import * as api from './api';

export default function SupportPanel({
  token,
  accountEmail,
  cardStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  onClose,
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setOk('');
    setBusy(true);
    try {
      const res = await api.sendSupportMessage(token, { subject, message });
      setOk(res.message || 'Message sent.');
      setSubject('');
      setMessage('');
    } catch (ex) {
      setErr(ex.message || 'Could not send message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(2,6,23,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{ ...cardStyle, width: '100%', maxWidth: 480, padding: '1.25rem', display: 'grid', gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Contact support</div>
            <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4, lineHeight: 1.45 }}>
              Send a message to our team. Replies go to <strong>{accountEmail || 'your account email'}</strong>.
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ ...btnNeutral, padding: '0.35rem 0.65rem' }} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              maxLength={120}
              required
              style={{ ...inputStyle, width: '100%' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you need help with…"
              rows={5}
              maxLength={4000}
              required
              style={{ ...inputStyle, width: '100%', resize: 'vertical', minHeight: 100 }}
            />
          </label>
          {err ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{err}</div> : null}
          {ok ? <div style={{ color: '#86efac', fontSize: 14 }}>{ok}</div> : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={busy} style={btnPrimary}>
              {busy ? 'Sending…' : 'Send message'}
            </button>
            <button type="button" onClick={onClose} style={btnNeutral}>
              Cancel
            </button>
          </div>
        </form>
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          We never ask for your password by email. Account data stays encrypted in transit.
        </div>
      </div>
    </div>
  );
}
