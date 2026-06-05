function scoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#60a5fa';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

const TAB_LABELS = {
  money: 'Money',
  profile: 'Profile',
  overview: 'Overview',
  progress: 'Progress',
};

function TrackSection({ track, label, intro, score, steps, compact, onGoTab, btnNeutral }) {
  const items = (steps || []).filter((s) => !s.isRecap || !compact);
  if (!items.length) return null;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{label}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.45, maxWidth: 520 }}>{intro}</div>
        </div>
        <div
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: 8,
            background: 'rgba(15,23,42,0.5)',
            border: `1px solid ${scoreColor(score)}`,
            textAlign: 'center',
            minWidth: 72,
          }}
        >
          <div style={{ fontSize: 10, opacity: 0.7 }}>Score</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: scoreColor(score) }}>{Math.round(score)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.slice(0, compact ? 3 : 12).map((step) => (
          <div
            key={`${step.horizon}-${step.step}-${step.dimension}`}
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '0.75rem',
              borderLeft: `4px solid ${step.horizon === 'security' ? '#38bdf8' : '#a78bfa'}`,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 22,
                    height: 22,
                    lineHeight: '22px',
                    textAlign: 'center',
                    borderRadius: 999,
                    background: 'rgba(59,130,246,0.25)',
                    fontSize: 12,
                    marginRight: 8,
                  }}
                >
                  {step.step}
                </span>
                {step.title}
              </div>
              {!step.isRecap && step.potentialLift > 0 ? (
                <span style={{ fontSize: 11, opacity: 0.75 }}>Up to +{step.potentialLift} pts on total score</span>
              ) : null}
            </div>
            <div style={{ fontSize: 13, opacity: 0.88, marginTop: 6, lineHeight: 1.45 }}>{step.why}</div>
            <ol style={{ margin: '8px 0 0', paddingLeft: '1.25rem', fontSize: 13, lineHeight: 1.5, opacity: 0.92 }}>
              {(step.actions || []).slice(0, compact ? 2 : 5).map((action, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{action}</li>
              ))}
            </ol>
            {onGoTab && step.goToTab && step.goToTab !== 'overview' ? (
              <button
                type="button"
                onClick={() => onGoTab(step.goToTab)}
                style={{ ...btnNeutral, marginTop: 10, fontSize: 12, padding: '0.4rem 0.65rem' }}
              >
                Go to {TAB_LABELS[step.goToTab] || step.goToTab} →
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImprovementRoadmap({ roadmap, compact, cardSoftStyle, onGoTab, btnNeutral }) {
  if (!roadmap) return null;

  const { tracks, securityScore, wealthScore, securityLabel, wealthLabel, securityIntro, wealthIntro, totalPotentialLift, projectedScore, alwaysDo } = roadmap;

  return (
    <div style={{ ...cardSoftStyle, padding: '0.85rem', display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: compact ? 15 : 17 }}>Step-by-step: improve your score</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>
          Work security steps first (this month → 90 days), then wealth steps (90 days → years).
          {totalPotentialLift > 0 ? (
            <>
              {' '}Completing these steps could raise your total score from{' '}
              <strong>{Math.round(roadmap.currentOverallScore ?? 0)}</strong> toward{' '}
              <strong>~{Math.round(projectedScore)}</strong> (+{totalPotentialLift} pts possible).
            </>
          ) : null}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.72 }}>{alwaysDo}</p>
      </div>

      <TrackSection
        track="security"
        label={securityLabel}
        intro={securityIntro}
        score={securityScore}
        steps={tracks?.security}
        compact={compact}
        onGoTab={onGoTab}
        btnNeutral={btnNeutral}
      />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

      <TrackSection
        track="wealth"
        label={wealthLabel}
        intro={wealthIntro}
        score={wealthScore}
        steps={tracks?.wealth}
        compact={compact}
        onGoTab={onGoTab}
        btnNeutral={btnNeutral}
      />
    </div>
  );
}
