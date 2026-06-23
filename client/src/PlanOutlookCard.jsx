import { useEffect, useState } from 'react';
import PrioritiesPanel from './PrioritiesPanel';
import RecommendationTimeline from './RecommendationTimeline';

const TABS = [
  { id: 'priorities', label: 'Priorities', needsCheckup: true },
  { id: 'timeline', label: 'Timeline', needsCheckup: true },
  { id: 'outlook', label: 'Projections', pro: true },
];

/** Shared projections / long-term health content for Tools and Overview. */
export function ProjectionsPane({
  isPro,
  isMobile,
  forecastBusy,
  forecastErr,
  forecastData,
  businessDocs,
  cardSoftStyle,
  onGoPlan,
}) {
  if (!isPro) {
    return (
      <div style={{ padding: '0.5rem 0', fontSize: 14, color: '#94a3b8', lineHeight: 1.55 }}>
        <p style={{ margin: '0 0 12px' }}>
          Unlock 3 / 6 / 12-month outlooks and long-term health scoring with Pro.
        </p>
        <button type="button" onClick={onGoPlan} style={{ fontSize: 13, color: '#93c5fd', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          Upgrade in Account →
        </button>
      </div>
    );
  }

  if (forecastBusy) {
    return <div style={{ fontSize: 14, color: '#94a3b8', padding: '0.5rem 0' }}>Building financial outlook…</div>;
  }
  if (forecastErr) {
    return <div style={{ color: '#fca5a5', fontSize: 14 }}>{forecastErr}</div>;
  }
  if (!forecastData) {
    return <div style={{ fontSize: 14, color: '#94a3b8', padding: '0.5rem 0' }}>Loading your financial outlook…</div>;
  }

  const healthColor =
    forecastData.longTermHealth?.status === 'strong'
      ? '#86efac'
      : forecastData.longTermHealth?.status === 'watch'
        ? '#fcd34d'
        : '#fca5a5';

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {forecastData.outcomes?.length ? (
        <div id="projections-outcomes" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {forecastData.outcomes.map((o) => (
            <div key={o.months} style={{ ...cardSoftStyle, padding: '0.8rem 0.9rem', fontSize: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{o.months}-month outlook</div>
              <div style={{ color: '#94a3b8', marginTop: 2, fontSize: 12 }}>Through {o.endMonth}</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
                <div>Income <strong>${Number(o.projectedIncome).toLocaleString()}</strong></div>
                <div>Expenses <strong>${Number(o.projectedExpenses).toLocaleString()}</strong></div>
                <div style={{ color: Number(o.projectedNet) >= 0 ? '#86efac' : '#fca5a5' }}>
                  Net <strong>${Number(o.projectedNet).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {forecastData.longTermHealth ? (
        <div id="longterm-health" style={{ ...cardSoftStyle, padding: '0.9rem 1rem', borderLeft: `3px solid ${healthColor}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Long-term health
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, marginTop: 6, textTransform: 'capitalize', color: healthColor }}>
            {forecastData.longTermHealth.status}
          </div>
          <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
            {forecastData.longTermHealth.summary}
          </div>
        </div>
      ) : null}

      {businessDocs ? (
        <div id="biz-docs" style={{ ...cardSoftStyle, padding: '0.85rem', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Business snapshot</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10, color: '#cbd5e1' }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Assets</div>
              <div style={{ fontWeight: 700 }}>${Number(businessDocs.balanceSheet?.assets?.totalAssets || 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Net income</div>
              <div style={{ fontWeight: 700 }}>${Number(businessDocs.incomeStatement?.netIncome || 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Cash flow</div>
              <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{businessDocs.cashFlowSummary?.trend || 'n/a'}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Unified priorities, timeline, and projections — top of Tools page. */
export default function PlanOutlookCard({
  checkupResult,
  isPro,
  isMobile,
  cardStyle,
  cardSoftStyle,
  btnNeutral,
  onGoFinances,
  onGoPlan,
  forecastBusy,
  forecastErr,
  forecastData,
  businessDocs,
  onRefreshProjections,
}) {
  const hasPriorities = Boolean(checkupResult?.actionPlan?.length);
  const hasTimeline = Boolean(checkupResult?.recommendationTimeline?.some((p) => p.items?.length));

  const defaultTab = hasPriorities ? 'priorities' : hasTimeline ? 'timeline' : 'outlook';
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (isPro) onRefreshProjections?.();
  }, [isPro, onRefreshProjections]);

  useEffect(() => {
    function onFocusOutlook(e) {
      setTab('outlook');
      const map = {
        outcomes: 'projections-outcomes',
        longterm: 'longterm-health',
        bizdocs: 'biz-docs',
      };
      const id = map[e.detail];
      if (id) {
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
      }
    }
    window.addEventListener('fc-focus-outlook', onFocusOutlook);
    return () => window.removeEventListener('fc-focus-outlook', onFocusOutlook);
  }, []);

  useEffect(() => {
    if (tab === 'priorities' && !hasPriorities) setTab(hasTimeline ? 'timeline' : 'outlook');
    if (tab === 'timeline' && !hasTimeline) setTab(hasPriorities ? 'priorities' : 'outlook');
  }, [hasPriorities, hasTimeline, tab]);

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'priorities') return hasPriorities;
    if (t.id === 'timeline') return hasTimeline;
    return true;
  });

  if (!visibleTabs.length) return null;

  return (
    <div
      id="plan-outlook-card"
      style={{
        ...cardStyle,
        padding: isMobile ? '1rem' : '1.2rem 1.35rem',
        display: 'grid',
        gap: 16,
        borderLeft: '3px solid #3b82f6',
      }}
    >
      <div>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Your plan & outlook</div>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94a3b8', lineHeight: 1.45 }}>
          Top priorities, action timeline, and long-term projections — all in one place.
        </p>
      </div>

      <div
        role="tablist"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: 4,
          borderRadius: 12,
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
        }}
      >
        {visibleTabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              style={{
                flex: isMobile ? '1 1 auto' : undefined,
                minWidth: isMobile ? '30%' : undefined,
                padding: '0.45rem 0.9rem',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                color: active ? '#f1f5f9' : '#94a3b8',
                background: active ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'transparent',
                boxShadow: active ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                transition: 'background 140ms ease, color 140ms ease',
              }}
            >
              {t.label}
              {t.pro && !isPro ? (
                <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.85 }}>PRO</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="fc-fade-in">
        {tab === 'priorities' && hasPriorities ? (
          <PrioritiesPanel
            actionPlan={checkupResult.actionPlan}
            cardSoftStyle={cardSoftStyle}
            onGoFinances={onGoFinances}
            btnNeutral={btnNeutral}
            bare
          />
        ) : null}

        {tab === 'timeline' && hasTimeline ? (
          <RecommendationTimeline
            timeline={checkupResult.recommendationTimeline}
            cardSoftStyle={cardSoftStyle}
            isMobile={isMobile}
            bare
          />
        ) : null}

        {tab === 'outlook' ? (
          <ProjectionsPane
            isPro={isPro}
            isMobile={isMobile}
            forecastBusy={forecastBusy}
            forecastErr={forecastErr}
            forecastData={forecastData}
            businessDocs={businessDocs}
            cardSoftStyle={cardSoftStyle}
            onGoPlan={onGoPlan}
          />
        ) : null}
      </div>

      {!hasPriorities && !hasTimeline ? (
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
          Complete your checkup on Finances to unlock personalized priorities and timeline.
          {onGoFinances ? (
            <>
              {' '}
              <button type="button" onClick={onGoFinances} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 13 }}>
                Go to Finances →
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
