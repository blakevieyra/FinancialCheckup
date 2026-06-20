import { useState } from 'react';
import * as api from './api';
import { BLANK_SNAPSHOT } from './checkupConstants';
import { PLAN_PRICING } from './planConstants';
import LoadingOverlay from './LoadingOverlay';
import {
  finishOnboardingWithCheckup,
  persistOnboardingData,
  saveOnboardingPending,
  clearOnboardingPending,
} from './onboardingFinish';

const GOALS = [
  { id: 'emergency_fund', label: 'Build emergency fund', desc: 'Focus on savings & cash reserves' },
  { id: 'debt_free', label: 'Pay off debt', desc: 'Avalanche/snowball payoff plan' },
  { id: 'wealth_building', label: 'Wealth building', desc: 'Grow net worth across savings, investments & retirement' },
  { id: 'retirement', label: 'Retire on track', desc: '401k/IRA contributions & trajectory' },
  { id: 'invest', label: 'Grow investments', desc: 'Portfolio allocation & diversification' },
  { id: 'insurance', label: 'Fix insurance gaps', desc: 'Life, disability & liability coverage' },
];

const STEPS = ['Your goal', 'Income & spending', 'Savings', 'Investments', 'Insurance', 'Choose your plan'];

const PLAN_OPTIONS = [
  {
    id: 'trial',
    title: '7-day Pro trial',
    price: 'Free',
    period: ' · 7 days',
    desc: 'Stripe-managed trial — full Pro, then $9.99/mo unless you cancel',
    accent: '#4da6ff',
  },
  {
    id: 'monthly',
    title: PLAN_PRICING.monthly.name,
    price: PLAN_PRICING.monthly.price,
    period: PLAN_PRICING.monthly.period,
    desc: PLAN_PRICING.monthly.tagline,
    accent: '#4da6ff',
    badge: PLAN_PRICING.monthly.badge,
  },
  {
    id: 'annual',
    title: PLAN_PRICING.annual.name,
    price: PLAN_PRICING.annual.price,
    period: PLAN_PRICING.annual.period,
    desc: PLAN_PRICING.annual.tagline,
    accent: '#22c55e',
    badge: PLAN_PRICING.annual.badge,
  },
  {
    id: 'free',
    title: 'Continue free',
    price: '$0',
    period: '',
    desc: 'Keep your score & basics — upgrade anytime from Account',
    accent: '#94a3b8',
  },
];

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
  billingConfigured,
  onComplete,
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [data, setData] = useState({ ...BLANK_SNAPSHOT });
  const [planChoice, setPlanChoice] = useState('trial');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [emailSummary, setEmailSummary] = useState(true);
  const [summaryFreq, setSummaryFreq] = useState('weekly');

  const grid = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 };
  const payload = { token, userId, month, goal, data, emailSummary, summaryFreq, accountEmail };

  function setField(key, val) {
    setData((p) => ({ ...p, [key]: val }));
  }

  async function completeWithPlan(choice) {
    setErr('');
    setBusy(true);
    try {
      if (choice === 'trial') {
        if (!billingConfigured) {
          setErr('Billing is not configured yet. Choose continue free or try again later.');
          return;
        }
        await persistOnboardingData(payload);
        await api.startStripeTrial(token);
        const snapshot = {
          ...data,
          income: Number(data.income) || 0,
          monthlyExpenses: Number(data.monthlyExpenses) || 0,
        };
        await api.runCheckup(token, { month, snapshot });
        await api.setOnboarding(token, { complete: true, primaryGoal: goal });
        clearOnboardingPending();
        onComplete?.();
        return;
      }
      if (choice === 'free') {
        await finishOnboardingWithCheckup(payload);
        onComplete?.();
        return;
      }
      if (choice === 'monthly' || choice === 'annual') {
        if (!billingConfigured) {
          setErr('Billing is not configured yet. Choose the free trial or continue free.');
          return;
        }
        await persistOnboardingData(payload);
        saveOnboardingPending(payload);
        const { url } = await api.createCheckoutSession(token, choice, { fromOnboarding: true });
        api.openExternalUrl(url);
        return;
      }
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
    else completeWithPlan(planChoice);
  }

  return (
    <>
      {busy ? (
        <LoadingOverlay
          message={planChoice === 'monthly' || planChoice === 'annual' ? 'Opening secure checkout…' : 'Setting up your dashboard…'}
          submessage={planChoice === 'monthly' || planChoice === 'annual' ? 'You will return here after payment' : 'Calculating your score'}
        />
      ) : null}
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
              {step === STEPS.length - 1
                ? 'Pick how you want to use Pro — or continue free. Your score is calculated next.'
                : 'Enter your numbers once — we will build your dashboard and personalized score.'}
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
                <div style={{ marginTop: 8, padding: '0.85rem', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)', display: 'grid', gap: 10 }}>
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
                        Sent to <strong>{accountEmail || 'your account email'}</strong>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {PLAN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPlanChoice(opt.id)}
                    style={{
                      textAlign: 'left',
                      padding: '0.9rem 1rem',
                      cursor: 'pointer',
                      color: '#fff',
                      borderRadius: 10,
                      border: planChoice === opt.id ? `2px solid ${opt.accent}` : '1px solid rgba(148,163,184,0.25)',
                      background: planChoice === opt.id
                        ? 'linear-gradient(135deg, rgba(37,99,235,0.22), rgba(15,23,42,0.85))'
                        : 'rgba(15,23,42,0.55)',
                      position: 'relative',
                    }}
                  >
                    {opt.badge ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 99,
                          background: opt.id === 'annual' ? 'rgba(34,197,94,0.2)' : 'rgba(77,166,255,0.25)',
                          color: opt.id === 'annual' ? '#86efac' : '#bfdbfe',
                        }}
                      >
                        {opt.badge}
                      </span>
                    ) : null}
                    <div style={{ fontWeight: 800, color: opt.accent }}>{opt.title}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 800 }}>{opt.price}</span>
                      {opt.period ? <span style={{ opacity: 0.7, fontSize: 13 }}>{opt.period}</span> : null}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.4, paddingRight: opt.badge ? 72 : 0 }}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
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
                {step === STEPS.length - 1
                  ? busy
                    ? 'Working…'
                    : planChoice === 'monthly' || planChoice === 'annual'
                      ? 'Continue to checkout'
                      : 'Finish & view my score'
                  : 'Continue'}
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

export { finishOnboardingWithCheckup, readOnboardingPending } from './onboardingFinish';
