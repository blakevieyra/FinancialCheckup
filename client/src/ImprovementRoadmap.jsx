import { useState } from 'react';
import { scoreBarColor } from './theme';

const TAB_LABELS = {
  finances: 'Finances',
  overview: 'Overview',
  progress: 'Progress',
  tools: 'Tools',
  plan: 'Account',
};

function StepChip({ step, selected, onSelect }) {
  const accent = step.horizon === 'security' ? '#38bdf8' : '#a78bfa';
  return (
    <button
      type="button"
      onClick={() => onSelect(step)}
      className={selected ? 'fc-dim-chip fc-dim-chip--active' : 'fc-dim-chip'}
      style={{
        flex: '0 0 auto',
        minWidth: 160,
        maxWidth: 220,
        padding: '0.85rem 1rem',
        borderRadius: 12,
        border: selected ? `2px solid ${accent}` : '1px solid rgba(148,163,184,0.25)',
        background: selected ? `${accent}14` : 'rgba(36,50,82,0.5)',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'all 280ms ease',
        boxShadow: selected ? `0 8px 20px ${accent}22` : 'none',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>Step {step.step}</div>
      <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{step.title}</div>
      {!step.isRecap && step.potentialLift > 0 ? (
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6 }}>+{step.potentialLift} pts possible</div>
      ) : null}
    </button>
  );
}

function TrackFlow({ label, intro, score, steps, compact, onGoTab, btnNeutral }) {
  const items = (steps || []).filter((s) => !s.isRecap || !compact);
  const [selected, setSelected] = useState(items[0] || null);
  const [fadeKey, setFadeKey] = useState(0);

  if (!items.length) return null;

  function pickStep(step) {
    setSelected(step);
    setFadeKey((k) => k + 1);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{label}</div>
          <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4, lineHeight: 1.45, maxWidth: 560 }}>{intro}</div>
        </div>
        <div
          style={{
            padding: '0.5rem 0.85rem',
            borderRadius: 10,
            border: `1px solid ${scoreBarColor(score)}`,
            textAlign: 'center',
            minWidth: 76,
          }}
        >
          <div style={{ fontSize: 10, opacity: 0.65 }}>Track score</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: scoreBarColor(score) }}>{Math.round(score)}</div>
        </div>
      </div>

      <div className="fc-dim-flow" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {items.slice(0, compact ? 6 : 12).map((step) => (
          <StepChip
            key={`${step.horizon}-${step.step}-${step.dimension}`}
            step={step}
            selected={selected?.step === step.step && selected?.dimension === step.dimension}
            onSelect={pickStep}
          />
        ))}
      </div>

      {selected ? (
        <div
          key={fadeKey}
          className="fc-fade-in"
          style={{
            borderRadius: 14,
            padding: '1rem 1.15rem',
            border: '1px solid rgba(148,163,184,0.22)',
            background: 'rgba(36,50,82,0.45)',
            borderLeft: `4px solid ${selected.horizon === 'security' ? '#38bdf8' : '#a78bfa'}`,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.title}</div>
          <div style={{ fontSize: 14, opacity: 0.88, marginTop: 8, lineHeight: 1.5 }}>{selected.why}</div>
          <ol style={{ margin: '10px 0 0', paddingLeft: '1.2rem', fontSize: 14, lineHeight: 1.55, opacity: 0.92 }}>
            {(selected.actions || []).slice(0, compact ? 3 : 6).map((action, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{action}</li>
            ))}
          </ol>
          {onGoTab && selected.goToTab && selected.goToTab !== 'overview' ? (
            <button
              type="button"
              onClick={() => onGoTab(selected.goToTab)}
              style={{ ...btnNeutral, marginTop: 12, fontSize: 13 }}
            >
              Go to {TAB_LABELS[selected.goToTab] || selected.goToTab} →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ImprovementRoadmap({ roadmap, compact, cardSoftStyle, onGoTab, btnNeutral }) {
  if (!roadmap) return null;

  const { tracks, securityScore, wealthScore, securityLabel, wealthLabel, securityIntro, wealthIntro, totalPotentialLift, projectedScore, alwaysDo, currentOverallScore } = roadmap;

  return (
    <div style={{ ...cardSoftStyle, padding: '1.1rem 1.25rem', display: 'grid', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: compact ? 16 : 18 }}>Your improvement path</div>
        <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.82, lineHeight: 1.5, maxWidth: 720 }}>
          Tap a step to see details. Work security first, then long-term wealth.
          {totalPotentialLift > 0 ? (
            <>
              {' '}Potential lift: <strong>{Math.round(currentOverallScore ?? 0)}</strong> → <strong>~{Math.round(projectedScore)}</strong>.
            </>
          ) : null}
        </p>
      </div>

      <TrackFlow
        label={securityLabel}
        intro={securityIntro}
        score={securityScore}
        steps={tracks?.security}
        compact={compact}
        onGoTab={onGoTab}
        btnNeutral={btnNeutral}
      />

      <div style={{ height: 1, background: 'rgba(148,163,184,0.15)' }} />

      <TrackFlow
        label={wealthLabel}
        intro={wealthIntro}
        score={wealthScore}
        steps={tracks?.wealth}
        compact={compact}
        onGoTab={onGoTab}
        btnNeutral={btnNeutral}
      />

      {alwaysDo ? <p style={{ margin: 0, fontSize: 12, opacity: 0.68, lineHeight: 1.45 }}>{alwaysDo}</p> : null}
    </div>
  );
}
