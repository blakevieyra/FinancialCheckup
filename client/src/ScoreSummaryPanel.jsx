const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export default function ScoreSummaryPanel({
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  accountEmail,
  digestEnabled,
  onDigestEnabledChange,
  digestFrequency,
  onDigestFrequencyChange,
  digestEmail,
  onDigestEmailChange,
  digestWeekday,
  onDigestWeekdayChange,
  digestMsg,
  digestErr,
  digestPreview,
  smtpReady,
  saveBusy,
  testBusy,
  onSave,
  onTest,
  bare = false,
}) {
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const content = (
    <>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>Email & score summaries</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5, maxWidth: 520 }}>
          Your score, category breakdown, and top priority — delivered on a schedule you choose.
        </p>
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={digestEnabled}
          onChange={(e) => onDigestEnabledChange(e.target.checked)}
        />
        Send automated score summaries to my email
      </label>

      {digestEnabled ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            How often
            <select
              value={digestFrequency}
              onChange={(e) => onDigestFrequencyChange(e.target.value)}
              style={{ ...inputStyle, width: '100%', maxWidth: 280 }}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </label>

          {digestFrequency === 'weekly' ? (
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Send on
              <select
                value={digestWeekday}
                onChange={(e) => onDigestWeekdayChange(Number(e.target.value))}
                style={{ ...inputStyle, width: '100%', maxWidth: 280 }}
              >
                {weekdayLabels.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Email address
            <input
              type="email"
              value={digestEmail}
              onChange={(e) => onDigestEmailChange(e.target.value)}
              placeholder={accountEmail || 'you@example.com'}
              style={{ ...inputStyle, width: '100%', maxWidth: 360 }}
            />
          </label>

          <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>
            Includes: overall score & headline, all 6 category scores, income/expenses/surplus, top spending lines, and your #1 priority action.
            {digestFrequency === 'monthly' ? ' Monthly summaries send on the 1st.' : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={onSave} disabled={saveBusy} style={btnPrimary}>
          {saveBusy ? 'Saving…' : 'Save email preferences'}
        </button>
        {digestEnabled && smtpReady ? (
          <button type="button" onClick={onTest} disabled={testBusy || saveBusy} style={btnNeutral}>
            {testBusy ? 'Sending…' : 'Send test email'}
          </button>
        ) : null}
      </div>

      {!smtpReady ? (
        <div style={{ fontSize: 12, opacity: 0.65 }}>Email delivery requires server mail configuration.</div>
      ) : null}
      {digestMsg ? <div style={{ color: '#86efac', fontSize: 13 }}>{digestMsg}</div> : null}
      {digestErr ? <div style={{ color: '#ffb3b3', fontSize: 13 }}>{digestErr}</div> : null}

      {digestPreview && digestEnabled ? (
        <div style={{ fontSize: 12, opacity: 0.75, padding: '0.65rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)' }}>
          Preview ({digestPreview.month}): score data uses your latest saved checkup · income ${Number(digestPreview.income || 0).toLocaleString()} · expenses ${Number(digestPreview.totalExpenses || 0).toLocaleString()}
        </div>
      ) : null}
    </>
  );

  if (bare) {
    return <div style={{ display: 'grid', gap: 12 }}>{content}</div>;
  }

  return (
    <div style={{ ...cardSoftStyle, padding: '1.15rem 1.2rem', display: 'grid', gap: 14, height: '100%', borderLeft: '3px solid #3b82f6' }}>
      {content}
    </div>
  );
}
