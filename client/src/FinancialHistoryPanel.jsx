import ExpandablePanel from './ExpandablePanel';

function fmtMoney(n) {
  return `$${Math.abs(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function FinancialHistoryPanel({
  incomeHistory,
  expensesHistory,
  checkupHistory,
  currentMonth,
  onSelectMonth,
  isMobile,
  cardStyle,
  cardSoftStyle,
  btnNeutral,
}) {
  const panelStyle = cardSoftStyle || cardStyle;
  const incMap = new Map((incomeHistory || []).map((r) => [r.month, Number(r.amount) || 0]));
  const expMap = new Map((expensesHistory || []).map((r) => [r.month, Number(r.total) || 0]));
  const checkupByMonth = new Map((checkupHistory || []).map((r) => [r.month, r]));

  const months = Array.from(new Set([...incMap.keys(), ...expMap.keys(), ...(checkupHistory || []).map((r) => r.month)]))
    .filter((m) => {
      const income = incMap.get(m) ?? 0;
      const expenses = expMap.get(m) ?? 0;
      const ck = checkupByMonth.get(m);
      return income > 0 || expenses > 0 || ck;
    });
  months.sort((a, b) => b.localeCompare(a));

  const historyHint = months.length
    ? `${months.length} month${months.length === 1 ? '' : 's'} saved — tap to expand`
    : 'Save data on Finances to build your timeline — tap to expand';

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ExpandablePanel title="Income & expense history" hint={historyHint} cardSoftStyle={panelStyle}>
        {months.length ? (
          <>
            <p style={{ margin: '0 0 12px', opacity: 0.85, fontSize: 14, lineHeight: 1.45 }}>
              Months appear here only after you save income or expenses on Finances. Tap a row to view that month.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 12 : 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    <th style={{ padding: '8px 10px' }}>Month</th>
                    <th style={{ padding: '8px 10px' }}>Income</th>
                    <th style={{ padding: '8px 10px' }}>Expenses</th>
                    <th style={{ padding: '8px 10px' }}>Surplus</th>
                    <th style={{ padding: '8px 10px' }}>Checkup</th>
                    <th style={{ padding: '8px 10px' }} />
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => {
                    const income = incMap.get(m) ?? null;
                    const expenses = expMap.get(m) ?? null;
                    const surplus = income != null && expenses != null ? income - expenses : null;
                    const ck = checkupByMonth.get(m);
                    const isCurrent = m === currentMonth;
                    return (
                      <tr
                        key={m}
                        style={{
                          background: isCurrent ? 'rgba(59,130,246,0.12)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <td style={{ padding: '8px 10px', fontWeight: isCurrent ? 700 : 400 }}>
                          {m}
                          {isCurrent ? ' (viewing)' : ''}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{income != null ? fmtMoney(income) : '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{expenses != null ? fmtMoney(expenses) : '—'}</td>
                        <td
                          style={{
                            padding: '8px 10px',
                            color: surplus != null && surplus < 0 ? '#fca5a5' : surplus > 0 ? '#86efac' : undefined,
                          }}
                        >
                          {surplus != null ? fmtMoney(surplus) : '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{ck ? Math.round(ck.overallScore) : '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {!isCurrent && onSelectMonth ? (
                            <button type="button" onClick={() => onSelectMonth(m)} style={{ ...btnNeutral, padding: '0.35rem 0.6rem', fontSize: 12 }}>
                              Open
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14, lineHeight: 1.45 }}>
            No income or expense history yet. Enter data on the Finances tab each month to build your timeline.
          </p>
        )}
      </ExpandablePanel>

      {(checkupHistory || []).some((h) => h.topRecommendations?.length) ? (
        <ExpandablePanel
          title="Past recommendations"
          hint="From saved checkups — tap to expand"
          cardSoftStyle={panelStyle}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            {checkupHistory.slice(0, 6).map((h) =>
              h.topRecommendations?.length ? (
                <div key={`${h.month}-${h.createdAt}`} style={{ fontSize: 13, opacity: 0.88, lineHeight: 1.45 }}>
                  <strong>{h.month}</strong> (score {Math.round(h.overallScore)}): {h.topRecommendations.join(' · ')}
                </div>
              ) : null,
            )}
          </div>
        </ExpandablePanel>
      ) : null}
    </div>
  );
}
