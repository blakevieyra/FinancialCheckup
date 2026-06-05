import { useEffect, useState } from 'react';
import * as api from './api';
import { DEFAULT_SNAPSHOT, CHECKUP_PROCESS } from './checkupConstants';

function ScoreRing({ score, size = 88 }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 80 ? '#22c55e' : pct >= 65 ? '#60a5fa' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.32,
        color,
        flexShrink: 0,
      }}
    >
      {Math.round(pct)}
    </div>
  );
}

const fieldGrid = (isMobile) => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  gap: 10,
});

export default function CheckupPanel({
  token,
  month,
  isMobile,
  isTablet,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  onResult,
}) {
  const [step, setStep] = useState(1);
  const [snapshot, setSnapshot] = useState(() => {
    try {
      const saved = localStorage.getItem('fc-checkup-draft');
      return saved ? { ...DEFAULT_SNAPSHOT, ...JSON.parse(saved) } : { ...DEFAULT_SNAPSHOT };
    } catch {
      return { ...DEFAULT_SNAPSHOT };
    }
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem('fc-checkup-draft', JSON.stringify(snapshot));
    } catch {
      /** ignore */
    }
  }, [snapshot]);

  useEffect(() => {
    if (!token) return;
    api.getCheckupPrefill(token, month).then((d) => {
      if (d?.template) {
        setSnapshot((prev) => ({ ...prev, ...d.template }));
      }
    }).catch(() => {});
    api.getCheckupHistory(token).then((d) => setHistory(d.history || [])).catch(() => {});
  }, [token, month]);

  function setField(key, value) {
    setSnapshot((prev) => ({ ...prev, [key]: value }));
  }

  function setDebt(i, key, value) {
    setSnapshot((prev) => {
      const debts = [...(prev.debts || [])];
      debts[i] = { ...debts[i], [key]: value };
      return { ...prev, debts };
    });
  }

  function addDebt() {
    setSnapshot((prev) => ({
      ...prev,
      debts: [...(prev.debts || []), { name: 'Debt', balance: 0, minPayment: 0, apr: 18 }],
    }));
  }

  async function runCheckup() {
    setErr('');
    setBusy(true);
    try {
      const data = token
        ? await api.runCheckup(token, { month, snapshot })
        : await api.previewCheckup(snapshot);
      setResult(data);
      setStep(3);
      onResult?.(data);
      if (token) {
        const h = await api.getCheckupHistory(token);
        setHistory(h.history || []);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const grid = fieldGrid(isMobile);

  return (
    <div id="checkup-panel" style={{ ...cardStyle, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 6px' }}>6-dimension financial checkup</h2>
        <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.45 }}>
          Budget · Debt · Savings · Investments · Insurance · Retirement — scored 0–100 with a personalized action plan.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHECKUP_PROCESS.map((p, i) => (
          <button
            key={p.step}
            type="button"
            onClick={() => setStep(i + 1)}
            style={{
              ...(step === i + 1 ? btnPrimary : btnNeutral),
              fontSize: 12,
              padding: '0.4rem 0.65rem',
            }}
          >
            {p.step} {['Input', 'Analyze', 'Score', 'Plan', 'Track'][i]}
          </button>
        ))}
      </div>

      {err ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{err}</div> : null}

      {step === 1 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Income & budget</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Monthly income ($)
                <input type="number" value={snapshot.income} onChange={(e) => setField('income', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Monthly expenses ($)
                <input type="number" value={snapshot.monthlyExpenses} onChange={(e) => setField('monthlyExpenses', e.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Savings</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Emergency fund ($)
                <input type="number" value={snapshot.emergencyFund} onChange={(e) => setField('emergencyFund', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Monthly savings ($)
                <input type="number" value={snapshot.monthlySavings} onChange={(e) => setField('monthlySavings', e.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>Debts</span>
              <button type="button" onClick={addDebt} style={{ ...btnNeutral, fontSize: 12, padding: '0.3rem 0.6rem' }}>+ Add debt</button>
            </div>
            {(snapshot.debts || []).map((d, i) => (
              <div key={`debt-${i}`} style={{ ...grid, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                <input placeholder="Name" value={d.name} onChange={(e) => setDebt(i, 'name', e.target.value)} style={inputStyle} />
                <input type="number" placeholder="Balance" value={d.balance} onChange={(e) => setDebt(i, 'balance', e.target.value)} style={inputStyle} />
                <input type="number" placeholder="Min payment" value={d.minPayment} onChange={(e) => setDebt(i, 'minPayment', e.target.value)} style={inputStyle} />
                <input type="number" placeholder="APR %" value={d.apr} onChange={(e) => setDebt(i, 'apr', e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Investments</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Portfolio value ($)
                <input type="number" value={snapshot.investmentTotal} onChange={(e) => setField('investmentTotal', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Fees (%/yr)
                <input type="number" step="0.01" value={snapshot.feePct} onChange={(e) => setField('feePct', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Stocks %<input type="number" value={snapshot.stockPct} onChange={(e) => setField('stockPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Bonds %<input type="number" value={snapshot.bondPct} onChange={(e) => setField('bondPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>International %<input type="number" value={snapshot.internationalPct} onChange={(e) => setField('internationalPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Cash %<input type="number" value={snapshot.cashPct} onChange={(e) => setField('cashPct', e.target.value)} style={inputStyle} /></label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Insurance & retirement</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13, marginBottom: 10 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={snapshot.hasLifeInsurance} onChange={(e) => setField('hasLifeInsurance', e.target.checked)} />
                Life insurance in place
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={snapshot.hasDisabilityInsurance} onChange={(e) => setField('hasDisabilityInsurance', e.target.checked)} />
                Disability insurance in place
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={snapshot.hasLiabilityInsurance} onChange={(e) => setField('hasLiabilityInsurance', e.target.checked)} />
                Umbrella liability in place
              </label>
            </div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Age<input type="number" value={snapshot.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retire at<input type="number" value={snapshot.targetRetirementAge} onChange={(e) => setField('targetRetirementAge', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retirement balance ($)<input type="number" value={snapshot.retirementBalance} onChange={(e) => setField('retirementBalance', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Monthly 401k/IRA ($)<input type="number" value={snapshot.monthlyRetirementContribution} onChange={(e) => setField('monthlyRetirementContribution', e.target.value)} style={inputStyle} /></label>
            </div>
          </div>

          <button type="button" onClick={() => { setStep(2); runCheckup(); }} disabled={busy} style={btnPrimary}>
            {busy ? 'Analyzing…' : 'Run full diagnostic →'}
          </button>
        </div>
      )}

      {step === 2 && !result && (
        <div style={{ opacity: 0.85, padding: '1rem 0' }}>{busy ? 'Running 6-dimension analysis…' : 'Ready to analyze.'}</div>
      )}

      {(step >= 3 || result) && result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <ScoreRing score={result.overallScore} size={isMobile ? 76 : 96} />
            <div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Overall financial score</div>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 20 : 24 }}>Grade {result.overallGrade} · {result.headline}</div>
              {!token ? (
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Sign in to save this score and track monthly.</div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr 1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {(result.dimensions || []).map((d) => (
              <div key={d.key} style={{ ...cardSoftStyle, padding: '0.55rem', textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{d.label}</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{Math.round(d.score)}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{d.grade}</div>
              </div>
            ))}
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🎯 Personalized action plan</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(result.actionPlan || []).map((item, i) => (
                <div key={`${item.title}-${i}`} style={{ borderLeft: `3px solid ${item.priority === 'HIGH' ? '#ef4444' : '#f59e0b'}`, paddingLeft: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    #{i + 1} [{item.priority}] {item.title}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4 }}>{item.detail}</div>
                  {item.timeline ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{item.timeline}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>🏦 Budget gap analysis</div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.45 }}>
                {(result.budgetGapAnalysis || []).slice(0, 5).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>📉 Debt payoff planner</div>
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                Extra payment modeled: <strong>${result.debtPlanner?.extraMonthly?.toLocaleString()}/mo</strong>
                <br />
                Avalanche: <strong>{result.debtPlanner?.avalanche?.months ?? 0} mo</strong> · interest ${result.debtPlanner?.avalanche?.totalInterest?.toLocaleString()}
                <br />
                Snowball: <strong>{result.debtPlanner?.snowball?.months ?? 0} mo</strong> · interest ${result.debtPlanner?.snowball?.totalInterest?.toLocaleString()}
              </div>
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>🛡️ Insurance gap scanner</div>
              {(result.insuranceGaps || []).length ? (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13 }}>
                  {result.insuranceGaps.map((g, i) => (
                    <li key={i}>{g.label} · est. ${g.estMonthlyCost}/mo</li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.85 }}>No major gaps reported.</div>
              )}
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>📊 Investment health</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{result.investmentHealth?.summary}</div>
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.75rem', gridColumn: isTablet ? undefined : '1 / -1' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>🕐 Retirement trajectory</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{result.retirementTrajectory?.summary}</div>
            </div>
          </div>

          {history.length > 1 && (
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>📱 Monthly re-checkup history</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {history.slice(0, 8).map((h) => (
                  <span key={`${h.month}-${h.createdAt}`} style={{ fontSize: 12, padding: '0.35rem 0.5rem', borderRadius: 8, background: 'rgba(59,130,246,0.15)' }}>
                    {h.month}: {Math.round(h.overallScore)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" onClick={() => setStep(1)} style={btnNeutral}>Edit inputs</button>
            <button type="button" onClick={runCheckup} disabled={busy} style={btnPrimary}>
              {busy ? 'Re-running…' : 'Re-run checkup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
