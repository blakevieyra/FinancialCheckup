import { useCallback, useEffect, useState } from 'react';
import * as api from './api';
import ExpandablePanel from './ExpandablePanel';
import { strategyForArea, goalLabel } from './goalResources';
import { printReport, mailtoReport } from './reportActions';

const GOAL_AREAS = new Set(['savings', 'investments', 'retirement']);

const AREA_META = {
  budget: { title: 'Budget gaps', hint: 'Spending concentration & cuts — tap for AI report' },
  debt: { title: 'Debt payoff plan', hint: 'Avalanche vs snowball — tap for AI report' },
  retirement: { title: 'Retirement trajectory', hint: 'Contributions & benchmarks — tap for AI report' },
  insurance: { title: 'Insurance gap analysis', hint: 'Life, disability & liability — tap for AI report' },
  investments: { title: 'Investment portfolio', hint: 'Allocation, fees & diversification — tap for AI report' },
  savings: { title: 'Savings & emergency fund', hint: 'Fund target & savings rate — tap for AI report' },
};

function formatReportDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ReportBody({ aiData, meta, month, dimensionScore, dimensionGrade, emailNote, emailBusy, btnNeutral, onPrint, onEmail }) {
  return (
    <div style={{ display: 'grid', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(148,163,184,0.15)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={onPrint} style={{ ...btnNeutral, padding: '0.4rem 0.75rem', fontSize: 13 }}>
          Print report
        </button>
        <button type="button" onClick={onEmail} disabled={emailBusy} style={{ ...btnNeutral, padding: '0.4rem 0.75rem', fontSize: 13 }}>
          {emailBusy ? 'Sending…' : 'Email to me'}
        </button>
        {emailNote ? <span style={{ fontSize: 12, opacity: 0.75 }}>{emailNote}</span> : null}
      </div>
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
      {dimensionScore != null ? (
        <div style={{ fontSize: 11, opacity: 0.55 }}>
          Score at generation: {Math.round(dimensionScore)}/100{dimensionGrade ? ` (${dimensionGrade})` : ''} · {month}
        </div>
      ) : null}
    </div>
  );
}

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
  accountEmail,
}) {
  const [aiData, setAiData] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNote, setEmailNote] = useState('');
  const [err, setErr] = useState('');
  const meta = AREA_META[area] || { title: area, hint: 'Tap for details' };

  const loadHistory = useCallback(async () => {
    if (!token || !isPro) return;
    setHistoryBusy(true);
    try {
      const res = await api.listSpecialistReports(token, { area, limit: 25 });
      setHistory(res.reports || []);
    } catch {
      /* keep prior list */
    } finally {
      setHistoryBusy(false);
    }
  }, [token, isPro, area]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function buildReportPayload(data) {
    return {
      title: meta.title,
      area,
      month,
      score: dimensionScore,
      grade: dimensionGrade,
      summary: data.summary,
      report: data.report,
      advice: data.advice,
      nextSteps: data.nextSteps,
      sources: data.sources,
      disclaimer: data.disclaimer,
    };
  }

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
      setActiveReportId(res.reportId ?? null);
      if (res.emailSent) {
        setEmailNote('A copy was emailed to your account address.');
      } else {
        setEmailNote('');
      }
      loadHistory();
    } catch (e) {
      setErr(e.message || 'AI report failed.');
    } finally {
      setBusy(false);
    }
  }

  async function viewReport(entry) {
    setErr('');
    try {
      const full = await api.getSpecialistReport(token, entry.id);
      setAiData(full.report || full);
      setActiveReportId(entry.id);
      setEmailNote('');
    } catch (e) {
      setErr(e.message || 'Could not load saved report.');
    }
  }

  async function removeReport(id) {
    if (!window.confirm('Delete this saved report? This cannot be undone.')) return;
    setErr('');
    try {
      await api.deleteSpecialistReport(token, id);
      if (activeReportId === id) {
        setAiData(null);
        setActiveReportId(null);
        setEmailNote('');
      }
      loadHistory();
    } catch (e) {
      setErr(e.message || 'Could not delete report.');
    }
  }

  function handlePrint() {
    if (!aiData) return;
    printReport({
      title: meta.title,
      month,
      score: dimensionScore,
      grade: dimensionGrade,
      aiData,
    });
  }

  async function handleEmail() {
    if (!aiData) return;
    setEmailNote('');
    setEmailBusy(true);
    try {
      const res = await api.emailSpecialistReport(token, buildReportPayload(aiData));
      if (res.emailSent) {
        setEmailNote('Report emailed to your account address.');
      } else {
        mailtoReport({
          email: accountEmail,
          title: meta.title,
          month,
          score: dimensionScore,
          grade: dimensionGrade,
          aiData,
        });
        setEmailNote(accountEmail ? 'Opened your email app — send when ready.' : 'Opened email app — add your address and send.');
      }
    } catch {
      mailtoReport({
        email: accountEmail,
        title: meta.title,
        month,
        score: dimensionScore,
        grade: dimensionGrade,
        aiData,
      });
      setEmailNote('Server email unavailable — opened your email app instead.');
    } finally {
      setEmailBusy(false);
    }
  }

  const preview = summary || gaps?.[0]?.label || 'Review your profile data for personalized guidance.';
  const goalStrategy = GOAL_AREAS.has(area) ? strategyForArea(area, primaryGoal) : null;

  return (
    <div id={`specialist-${area}`}>
    <ExpandablePanel title={meta.title} hint={meta.hint} cardSoftStyle={cardSoftStyle}>
      <div style={{ display: 'grid', gap: 12 }}>
        {primaryGoal && goalStrategy ? (
          <div style={{ padding: '0.75rem 0.85rem', borderRadius: 10, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(77,166,255,0.25)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Strategy for your goal: {goalLabel(primaryGoal)}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>{goalStrategy.focus}</div>
            {goalStrategy.steps?.length ? (
              <ol style={{ margin: '10px 0 0', paddingLeft: '1.15rem', fontSize: 13, lineHeight: 1.45 }}>
                {goalStrategy.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            ) : null}
            {goalStrategy.resources?.length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Resources</div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 12, lineHeight: 1.5 }}>
                  {goalStrategy.resources.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{r.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
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
        {isPro && history.length > 0 ? (
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.12)', paddingTop: 8 }}>
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              style={{ ...btnNeutral, padding: '0.35rem 0.65rem', fontSize: 12, width: '100%', textAlign: 'left' }}
            >
              {historyOpen ? '▾' : '▸'} Saved reports ({history.length}){historyBusy ? ' …' : ''}
            </button>
            {historyOpen ? (
              <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      display: 'grid',
                      gap: 4,
                      padding: '0.5rem 0.6rem',
                      borderRadius: 8,
                      background: activeReportId === entry.id ? 'rgba(37,99,235,0.15)' : 'rgba(15,23,42,0.35)',
                      border: `1px solid ${activeReportId === entry.id ? 'rgba(77,166,255,0.35)' : 'rgba(148,163,184,0.15)'}`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {entry.month}
                      {entry.dimensionScore != null ? ` · ${Math.round(entry.dimensionScore)}/100` : ''}
                      <span style={{ fontWeight: 400, opacity: 0.7 }}> · {formatReportDate(entry.createdAt)}</span>
                    </div>
                    {entry.summary ? (
                      <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                        {entry.summary.length > 120 ? `${entry.summary.slice(0, 120)}…` : entry.summary}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => viewReport(entry)} style={{ ...btnNeutral, padding: '0.25rem 0.5rem', fontSize: 11 }}>
                        View
                      </button>
                      <button type="button" onClick={() => removeReport(entry.id)} style={{ ...btnNeutral, padding: '0.25rem 0.5rem', fontSize: 11, color: '#fca5a5' }}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {err ? <div style={{ color: '#ffb3b3', fontSize: 13 }}>{err}</div> : null}
        {aiData ? (
          <ReportBody
            aiData={aiData}
            meta={meta}
            month={month}
            dimensionScore={dimensionScore}
            dimensionGrade={dimensionGrade}
            emailNote={emailNote}
            emailBusy={emailBusy}
            btnNeutral={btnNeutral}
            onPrint={handlePrint}
            onEmail={handleEmail}
          />
        ) : null}
      </div>
    </ExpandablePanel>
    </div>
  );
}
