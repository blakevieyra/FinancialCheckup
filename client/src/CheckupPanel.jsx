import { useEffect, useState } from 'react';
import * as api from './api';
import { DEFAULT_SNAPSHOT } from './checkupConstants';
import ScoreExplainer from './ScoreExplainer';
import RecommendationTimeline from './RecommendationTimeline';
import ImprovementRoadmap from './ImprovementRoadmap';

const fieldGrid = (isMobile) => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  gap: 10,
});

function ActionPlanBlock({ actionPlan, cardSoftStyle, compact }) {
  const items = (actionPlan || []).slice(0, compact ? 3 : 6);
  if (!items.length) return null;
  return (
    <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Top priorities right now</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <div key={`${item.title}-${i}`} style={{ borderLeft: `3px solid ${item.priority === 'HIGH' ? '#ef4444' : '#f59e0b'}`, paddingLeft: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              #{i + 1} [{item.priority}] {item.title}
              {item.horizon ? (
                <span style={{ fontWeight: 500, fontSize: 10, marginLeft: 6, opacity: 0.7 }}>
                  {item.horizon === 'wealth' ? 'long-term' : 'security'}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4 }}>{item.detail}</div>
            {item.steps?.[0] ? <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Start: {item.steps[0]}</div> : null}
            {item.timeline ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{item.timeline}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailCards({ result, isTablet, cardSoftStyle }) {
  if (!result) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
      <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Budget gaps</div>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.45 }}>
          {(result.budgetGapAnalysis || []).slice(0, 5).map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>
      <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Debt payoff (avalanche vs snowball)</div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
          Extra ${result.debtPlanner?.extraMonthly?.toLocaleString()}/mo modeled
          <br />
          Avalanche: {result.debtPlanner?.avalanche?.months ?? 0} mo · ${result.debtPlanner?.avalanche?.totalInterest?.toLocaleString()} interest
          <br />
          Snowball: {result.debtPlanner?.snowball?.months ?? 0} mo · ${result.debtPlanner?.snowball?.totalInterest?.toLocaleString()} interest
        </div>
      </div>
      <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Insurance gaps</div>
        {(result.insuranceGaps || []).length ? (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13 }}>
            {result.insuranceGaps.map((g, i) => (
              <li key={i}>{g.label} · ~${g.estMonthlyCost}/mo</li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>No major gaps flagged.</div>
        )}
      </div>
      <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Investments & retirement</div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.45 }}>
          {result.investmentHealth?.summary}
          <br />
          {result.retirementTrajectory?.summary}
        </div>
      </div>
    </div>
  );
}

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
  ledger,
  onResult,
  onGoTab,
  showForm = true,
  showDetails = true,
  showHistory = true,
}) {
  const isGuest = !token;
  const [extended, setExtended] = useState(() => {
    try {
      const saved = localStorage.getItem('fc-checkup-extended');
      return saved ? { ...DEFAULT_SNAPSHOT, ...JSON.parse(saved) } : { ...DEFAULT_SNAPSHOT };
    } catch {
      return { ...DEFAULT_SNAPSHOT };
    }
  });
  const [guestBudget, setGuestBudget] = useState({ income: DEFAULT_SNAPSHOT.income, monthlyExpenses: DEFAULT_SNAPSHOT.monthlyExpenses });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isGuest) return;
    try {
      localStorage.setItem('fc-checkup-extended', JSON.stringify(extractExtendedOnly(extended)));
    } catch {
      /** ignore */
    }
  }, [extended, isGuest]);

  function extractExtendedOnly(s) {
    const {
      debts,
      emergencyFund,
      monthlySavings,
      investmentTotal,
      stockPct,
      bondPct,
      internationalPct,
      cashPct,
      feePct,
      hasLifeInsurance,
      hasDisabilityInsurance,
      hasLiabilityInsurance,
      age,
      targetRetirementAge,
      retirementBalance,
      monthlyRetirementContribution,
    } = s;
    return {
      debts,
      emergencyFund,
      monthlySavings,
      investmentTotal,
      stockPct,
      bondPct,
      internationalPct,
      cashPct,
      feePct,
      hasLifeInsurance,
      hasDisabilityInsurance,
      hasLiabilityInsurance,
      age,
      targetRetirementAge,
      retirementBalance,
      monthlyRetirementContribution,
    };
  }

  useEffect(() => {
    if (!token) return;
    api.getCheckupPrefill(token, month).then((d) => {
      if (d?.extended) setExtended((prev) => ({ ...prev, ...d.extended }));
    }).catch(() => {});
    api.getCheckupHistory(token).then((d) => setHistory(d.history || [])).catch(() => {});
  }, [token, month]);

  function setField(key, value) {
    setExtended((prev) => ({ ...prev, [key]: value }));
  }

  function setDebt(i, key, value) {
    setExtended((prev) => {
      const debts = [...(prev.debts || [])];
      debts[i] = { ...debts[i], [key]: value };
      return { ...prev, debts };
    });
  }

  function addDebt() {
    setExtended((prev) => ({
      ...prev,
      debts: [...(prev.debts || []), { name: 'Debt', balance: 0, minPayment: 0, apr: 18 }],
    }));
  }

  async function runCheckup() {
    setErr('');
    setBusy(true);
    try {
      const payload = isGuest
        ? { ...extractExtendedOnly(extended), ...guestBudget }
        : extractExtendedOnly(extended);
      const data = token
        ? await api.runCheckup(token, { month, snapshot: payload })
        : await api.previewCheckup(payload);
      setResult(data);
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
  const income = isGuest ? guestBudget.income : ledger?.income;
  const expenses = isGuest ? guestBudget.monthlyExpenses : ledger?.totalExpenses;

  return (
    <div id="checkup-panel" style={{ ...(cardStyle || {}), display: 'grid', gap: 14 }}>
      {showForm ? (
        <>
          <div>
            <h2 style={{ margin: '0 0 6px' }}>{isGuest ? 'Quick financial checkup' : 'Complete your profile'}</h2>
            <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.45 }}>
              {isGuest
                ? 'Enter a snapshot below — no bank login.'
                : 'Income & spending come from the Money tab. Add debt, savings, investments, insurance, and retirement here.'}
            </p>
          </div>

          {!isGuest && ledger ? (
            <div style={{ ...cardSoftStyle, padding: '0.75rem', fontSize: 13, opacity: 0.9 }}>
              <strong>Money tab ({month}):</strong> ${Number(income || 0).toLocaleString()} income · ${Number(expenses || 0).toLocaleString()} expenses
            </div>
          ) : null}

          {isGuest ? (
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Income & spending</div>
              <div style={grid}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly income ($)
                  <input type="number" value={guestBudget.income} onChange={(e) => setGuestBudget((p) => ({ ...p, income: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly expenses ($)
                  <input type="number" value={guestBudget.monthlyExpenses} onChange={(e) => setGuestBudget((p) => ({ ...p, monthlyExpenses: e.target.value }))} style={inputStyle} />
                </label>
              </div>
            </div>
          ) : null}

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Savings</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Emergency fund ($)
                <input type="number" value={extended.emergencyFund} onChange={(e) => setField('emergencyFund', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Monthly savings ($)
                <input type="number" value={extended.monthlySavings} onChange={(e) => setField('monthlySavings', e.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span>Debts</span>
              <button type="button" onClick={addDebt} style={{ ...btnNeutral, fontSize: 12, padding: '0.3rem 0.6rem' }}>+ Add</button>
            </div>
            {(extended.debts || []).map((d, i) => (
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
                Portfolio ($)
                <input type="number" value={extended.investmentTotal} onChange={(e) => setField('investmentTotal', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Fees %/yr
                <input type="number" step="0.01" value={extended.feePct} onChange={(e) => setField('feePct', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Stocks %<input type="number" value={extended.stockPct} onChange={(e) => setField('stockPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Bonds %<input type="number" value={extended.bondPct} onChange={(e) => setField('bondPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Intl %<input type="number" value={extended.internationalPct} onChange={(e) => setField('internationalPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Cash %<input type="number" value={extended.cashPct} onChange={(e) => setField('cashPct', e.target.value)} style={inputStyle} /></label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Insurance & retirement</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13, marginBottom: 10 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={extended.hasLifeInsurance} onChange={(e) => setField('hasLifeInsurance', e.target.checked)} />
                Life insurance
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={extended.hasDisabilityInsurance} onChange={(e) => setField('hasDisabilityInsurance', e.target.checked)} />
                Disability insurance
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={extended.hasLiabilityInsurance} onChange={(e) => setField('hasLiabilityInsurance', e.target.checked)} />
                Umbrella liability
              </label>
            </div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Age<input type="number" value={extended.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retire at<input type="number" value={extended.targetRetirementAge} onChange={(e) => setField('targetRetirementAge', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retirement $ saved<input type="number" value={extended.retirementBalance} onChange={(e) => setField('retirementBalance', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Monthly 401k/IRA<input type="number" value={extended.monthlyRetirementContribution} onChange={(e) => setField('monthlyRetirementContribution', e.target.value)} style={inputStyle} /></label>
            </div>
          </div>

          <button type="button" onClick={runCheckup} disabled={busy} style={btnPrimary}>
            {busy ? 'Calculating score…' : isGuest ? 'Get my score' : 'Save profile & update score'}
          </button>
        </>
      ) : null}

      {err ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{err}</div> : null}

      {result ? (
        <>
          {result.improvementRoadmap ? (
            <ImprovementRoadmap
              roadmap={result.improvementRoadmap}
              compact={!showDetails}
              cardSoftStyle={cardSoftStyle}
              onGoTab={onGoTab}
              btnNeutral={btnNeutral}
            />
          ) : null}
          <ActionPlanBlock actionPlan={result.actionPlan} cardSoftStyle={cardSoftStyle} compact={!showDetails} />
          {showDetails && result.scoreExplanation ? (
            <ScoreExplainer
              explanation={result.scoreExplanation}
              isMobile={isMobile}
              cardSoftStyle={cardSoftStyle}
              onGoTab={onGoTab}
              btnNeutral={btnNeutral}
            />
          ) : null}
          {showDetails && result.recommendationTimeline?.length ? (
            <RecommendationTimeline timeline={result.recommendationTimeline} cardSoftStyle={cardSoftStyle} />
          ) : null}
          {showDetails ? <DetailCards result={result} isTablet={isTablet} cardSoftStyle={cardSoftStyle} /> : null}
          {showHistory && history.length > 1 ? (
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Score over time</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {history.slice(0, 12).map((h) => (
                  <span key={`${h.month}-${h.createdAt}`} style={{ fontSize: 12, padding: '0.35rem 0.5rem', borderRadius: 8, background: 'rgba(59,130,246,0.15)' }}>
                    {h.month}: {Math.round(h.overallScore)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export { ActionPlanBlock, DetailCards };
