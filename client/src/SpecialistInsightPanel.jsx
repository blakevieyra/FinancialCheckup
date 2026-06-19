import { useState } from 'react';
import * as api from './api';
import ExpandablePanel from './ExpandablePanel';

const AREA_META = {
  insurance: { title: 'Insurance gap analysis', hint: 'Life, disability & liability — tap for AI report' },
  investments: { title: 'Investment portfolio', hint: 'Allocation, fees & diversification — tap for AI report' },
  savings: { title: 'Savings & emergency fund', hint: 'Fund target & savings rate — tap for AI report' },
};

export default function SpecialistInsightPanel({
  area,
  summary,
  gaps,
  dimensionScore,
  dimensionGrade,
  snapshot,
  token,
  month,
  profile,
  primaryGoal,
  isPro,
  onGoPlan,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
  income,
  totalExpenses,
}) {
  const [aiData, setAiData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const meta = AREA_META[area] || { title: area, hint: 'Tap for details' };

  async function runAi() {
    if (!isPro) {
      onGoPlan?.();
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const res = await api.getSpecialistAdvice(token, {
        area,
        month,
        profile,
        primaryGoal,
        income,
        totalExpenses,
        dimensionScore,
        dimensionGrade,
        snapshot,
        gaps,
        summary,
      });
      setAiData(res);
    } catch (e) {
      setErr(e.message || 'AI report failed.');
    } finally {
      setBusy(false);
    }
  }

  const preview = summary || gaps?.[0]?.label || 'Review your profile data for personalized guidance.';

  return (
    <ExpandablePanel title={meta.title} hint={meta.hint} cardSoftStyle={cardSoftStyle}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>{preview}</div>
        {gaps?.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.5 }}>
            {gaps.slice(0, 4).map((g, i) => (
              <li key={i}>
                {typeof g === 'string' ? g : `${g.label}${g.estMonthlyCost ? ` · ~$${g.estMonthlyCost}/mo` : ''}`}
              </li>
            ))}
          </ul>
        ) : null}
        {dimensionScore != null ? (
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Score: <strong>{Math.round(dimensionScore)}</strong>/100{dimensionGrade ? ` (${dimensionGrade})` : ''}
          </div>
        ) : null}
        <button type="button" onClick={runAi} disabled={busy} style={isPro ? btnPrimary : btnNeutral}>
          {busy ? 'Generating AI report…' : isPro ? 'Get AI report & next steps' : 'Upgrade for AI reports'}
        </button>
        {err ? <div style={{ color: '#ffb3b3', fontSize: 13 }}>{err}</div> : null}
        {aiData ? (
          <div style={{ display: 'grid', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(148,163,184,0.15)' }}>
            {aiData.summary ? <div style={{ fontWeight: 700 }}>{aiData.summary}</div> : null}
            {aiData.report ? <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>{aiData.report}</div> : null}
            {aiData.advice?.length ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Advice</div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.45 }}>
                  {aiData.advice.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            ) : null}
            {aiData.nextSteps?.length ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Next steps</div>
                <ol style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.45 }}>
                  {aiData.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            ) : null}
            {aiData.sources?.length ? (
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 12, lineHeight: 1.5 }}>
                {aiData.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{s.title}</a>
                    {s.why ? <span style={{ opacity: 0.8 }}> — {s.why}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {aiData.disclaimer ? <div style={{ fontSize: 11, opacity: 0.6 }}>{aiData.disclaimer}</div> : null}
          </div>
        ) : null}
      </div>
    </ExpandablePanel>
  );
}
