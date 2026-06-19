import { useState } from 'react';
import * as api from './api';
import { BLANK_SNAPSHOT } from './checkupConstants';
import { saveExtendedProfile } from './userStorage';
import LoadingOverlay from './LoadingOverlay';

const GOALS = [
  { id: 'emergency_fund', label: 'Build emergency fund', desc: 'Focus on savings & cash reserves' },
  { id: 'debt_free', label: 'Pay off debt', desc: 'Avalanche/snowball payoff plan' },
  { id: 'retirement', label: 'Retire on track', desc: '401k/IRA contributions & trajectory' },
  { id: 'invest', label: 'Grow investments', desc: 'Portfolio allocation & diversification' },
  { id: 'insurance', label: 'Fix insurance gaps', desc: 'Life, disability & liability coverage' },
];

const STEPS = ['Your goal', 'Income & spending', 'Savings', 'Investments', 'Insurance & finish'];

export default function OnboardingWizard({
  token,
  userId,
  month,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  isMobile,
  accountEmail,
  onComplete,
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [data, setData] = useState({ ...BLANK_SNAPSHOT });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [emailSummary, setEmailSummary] = useState(true);
  const [summaryFreq, setSummaryFreq] = useState('weekly');

  const grid = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 };

  function setField(key, val) {
    setData((p) => ({ ...p, [key]: val }));
  }

  async function finish() {
    setErr('');
    setBusy(true);
    try {
      await api.setOnboarding(token, { primaryGoal: goal });
      await api.setIncome(token, { amount: Number(data.income) || 0, month });
      await api.updateExpenses(token, {
        month,
        expenses: [{ category: 'General', amount: Number(data.monthlyExpenses) || 0 }],
      });
      saveExtendedProfile(userId, {
        emergencyFund: data.emergencyFund,
        monthlySavings: data.monthlySavings,
        debts: data.debts,
        investmentTotal: data.investmentTotal,
        stockPct: data.stockPct,
        bondPct: data.bondPct,
        internationalPct: data.internationalPct,
        cashPct: data.cashPct,
        feePct: data.feePct,
        hasLifeInsurance: data.hasLifeInsurance,
        hasDisabilityInsurance: data.hasDisabilityInsurance,
        hasLiabilityInsurance: data.hasLiabilityInsurance,
        age: data.age,
        targetRetirementAge: data.targetRetirementAge,
        retirementBalance: data.retirementBalance,
        monthlyRetirementContribution: data.monthlyRetirementContribution,
        excludedFromScore: [],
      });
      const snapshot = {
        ...data,
        income: Number(data.income) || 0,
        monthlyExpenses: Number(data.monthlyExpenses) || 0,
      };
      await api.runCheckup(token, { month, snapshot });
      await api.setOnboarding(token, { complete: true, primaryGoal: goal });
      if (emailSummary && accountEmail) {
        await api.updateDigestPrefs(token, {
          digestEnabled: true,
          digestChannel: 'email',
          digestEmail: accountEmail,
          digestFrequency: summaryFreq,
          digestWeekday: 1,
        });
      }
      onComplete?.();
    } catch (e) {
      setErr(e.message || 'Setup failed.');
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (step === 0 && !goal) {
      setErr('Choose a primary goal to personalize your plan.');
      return;
    }
    setErr('');
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  return (
    <>
      {busy ? <LoadingOverlay message="Setting up your dashboard…" submessage="Saving profile & calculating score" /> : null}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'rgb(8,12,22)',
          overflowY: 'auto',
          padding: isMobile ? '1rem' : '2rem',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Welcome — step {step + 1} of {STEPS.length}
            </div>
            <h2 style={{ margin: '8px 0 4px', fontSize: isMobile ? '1.35rem' : '1.65rem' }}>{STEPS[step]}</h2>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14, lineHeight: 1.5 }}>
              Enter your numbers once — we&apos;ll build your dashboard and personalized score.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STEPS.map((label, i) => (
              <span
                key={label}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: i <= step ? 'rgba(77,166,255,0.2)' : 'rgba(148,163,184,0.12)',
                  color: i <= step ? '#93c5fd' : 'rgba(226,232,240,0.5)',
                  fontWeight: 600,
                }}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>

          <div style={{ ...cardSoftStyle, padding: '1.25rem', display: 'grid', gap: 14 }}>
            {step === 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    style={{
                      textAlign: 'left',
                      padding: '0.85rem 1rem',
                      cursor: 'pointer',
                      color: '#fff',
                      borderRadius: 10,
                      border: 'none',
                      background: goal === g.id
                        ? 'linear-gradient(135deg, #2563eb, #0ea5e9)'
                        : '#101827',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{g.label}</div>
                    <div style={{ fontSize: 13, opacity: goal === g.id ? 0.95 : 0.8, marginTop: 4 }}>{g.desc}</div>
                  </button>
                ))}
              </div>
            ) : null}

            {step === 1 ? (
              <div style={grid}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly income ($)
                  <input type="number" value={data.income} onChange={(e) => setField('income', e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly expenses ($)
                  <input type="number" value={data.monthlyExpenses} onChange={(e) => setField('monthlyExpenses', e.target.value)} style={inputStyle} />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div style={grid}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Emergency fund balance ($)
                  <input type="number" value={data.emergencyFund} onChange={(e) => setField('emergencyFund', e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly savings ($)
                  <input type="number" value={data.monthlySavings} onChange={(e) => setField('monthlySavings', e.target.value)} style={inputStyle} />
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div style={grid}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Investment portfolio ($)
                  <input type="number" value={data.investmentTotal} onChange={(e) => setField('investmentTotal', e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Retirement saved ($)
                  <input type="number" value={data.retirementBalance} onChange={(e) => setField('retirementBalance', e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly retirement contribution ($)
                  <input type="number" value={data.monthlyRetirementContribution} onChange={(e) => setField('monthlyRetirementContribution', e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Your age
                  <input type="number" value={data.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} />
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={data.hasLifeInsurance} onChange={(e) => setField('hasLifeInsurance', e.target.checked)} />
                  Life insurance in place
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={data.hasDisabilityInsurance} onChange={(e) => setField('hasDisabilityInsurance', e.target.checked)} />
                  Disability insurance in place
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={data.hasLiabilityInsurance} onChange={(e) => setField('hasLiabilityInsurance', e.target.checked)} />
                  Umbrella liability insurance
                </label>
                <p style={{ margin: 0, opacity: 0.8, fontSize: 13 }}>
                  Tap finish to calculate your score and open your dashboard.
                </p>
                <div style={{ marginTop: 12, padding: '0.85rem', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)', display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={emailSummary} onChange={(e) => setEmailSummary(e.target.checked)} />
                    Email me score summaries
                  </label>
                  {emailSummary ? (
                    <>
                      <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                        How often
                        <select value={summaryFreq} onChange={(e) => setSummaryFreq(e.target.value)} style={inputStyle}>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </label>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Sent to <strong>{accountEmail || 'your account email'}</strong> — includes score, categories, and top action.
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {err ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{err}</div> : null}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  style={{ ...btnNeutral, border: 'none', background: 'rgba(15,23,42,0.85)' }}
                  disabled={busy}
                >
                  Back
                </button>
              ) : null}
              <button type="button" onClick={next} disabled={busy} style={btnPrimary}>
                {step === STEPS.length - 1 ? (busy ? 'Finishing…' : 'Finish & view dashboard') : 'Continue'}
              </button>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
            Questions? Email <a href="mailto:info@operone2i.com" style={{ color: '#93c5fd' }}>info@operone2i.com</a>
          </p>
        </div>
      </div>
    </>
  );
}
