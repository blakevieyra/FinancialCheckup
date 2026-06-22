/** Print / email actions for AI advice reports (insights, expert, comprehensive). */
export default function AdviceReportToolbar({
  onPrint,
  onEmail,
  emailBusy,
  emailNote,
  btnNeutral,
}) {
  if (!onPrint && !onEmail) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
      {onPrint ? (
        <button type="button" onClick={onPrint} style={{ ...btnNeutral, padding: '0.4rem 0.75rem', fontSize: 13 }}>
          Print report
        </button>
      ) : null}
      {onEmail ? (
        <button type="button" onClick={onEmail} disabled={emailBusy} style={{ ...btnNeutral, padding: '0.4rem 0.75rem', fontSize: 13 }}>
          {emailBusy ? 'Sending…' : 'Email to me'}
        </button>
      ) : null}
      {emailNote ? <span style={{ fontSize: 12, opacity: 0.75 }}>{emailNote}</span> : null}
    </div>
  );
}
