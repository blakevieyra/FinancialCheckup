import { useCallback, useEffect, useState } from 'react';
import * as api from './api';
import ExpandablePanel from './ExpandablePanel';
import { FieldSummary } from './panelPrimitives';
import { useGenerationTimer } from './useGenerationTimer';

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

export default function AdviceToolPanel({
  area,
  title,
  hint,
  expectation,
  preview,
  token,
  isPro,
  onGoPlan,
  busy,
  busyLabel,
  generateLabel,
  etaSeconds = 45,
  error,
  onGenerate,
  reportData,
  reportId,
  renderReport,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
}) {
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [activeReportId, setActiveReportId] = useState(null);
  const [historyView, setHistoryView] = useState(null);
  const { label: timerLabel } = useGenerationTimer(busy, etaSeconds);

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

  useEffect(() => {
    if (reportId) {
      setActiveReportId(reportId);
      setHistoryView(null);
      loadHistory();
    }
  }, [reportId, loadHistory]);

  async function handleGenerate() {
    if (!isPro) {
      onGoPlan?.();
      return;
    }
    setHistoryView(null);
    setActiveReportId(null);
    await onGenerate?.();
  }

  async function viewReport(entry) {
    try {
      const full = await api.getSpecialistReport(token, entry.id);
      const body = full.report || full;
      setHistoryView(body);
      setActiveReportId(entry.id);
    } catch {
      /* ignore */
    }
  }

  async function removeReport(id) {
    if (!window.confirm('Delete this saved report? This cannot be undone.')) return;
    try {
      await api.deleteSpecialistReport(token, id);
      if (activeReportId === id) {
        setHistoryView(null);
        setActiveReportId(null);
      }
      loadHistory();
    } catch {
      /* ignore */
    }
  }

  const displayData = historyView ?? reportData;

  return (
    <div id={`advice-tool-${area}`}>
      <ExpandablePanel title={title} hint={hint} cardSoftStyle={cardSoftStyle}>
        <div style={{ display: 'grid', gap: 12 }}>
          {expectation ? (
            <FieldSummary hasValue>{expectation}</FieldSummary>
          ) : null}
          {preview ? (
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Based on your checkup: </span>
              {preview}
            </div>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              style={isPro ? btnPrimary : btnNeutral}
            >
              {busy && busyLabel ? busyLabel : isPro ? (generateLabel || `Generate ${title.toLowerCase()}`) : 'Upgrade for AI reports'}
            </button>
            {busy && isPro ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd' }} aria-live="polite">
                {timerLabel}
              </span>
            ) : null}
          </div>
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
          {error ? <div style={{ color: '#ffb3b3', fontSize: 13 }}>{error}</div> : null}
          {displayData && renderReport ? renderReport(displayData) : null}
        </div>
      </ExpandablePanel>
    </div>
  );
}
