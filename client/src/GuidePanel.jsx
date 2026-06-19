import { buildGuideSteps } from './guideEngine';
import { scoreBarColor } from './theme';

export default function GuidePanel({
  checkupResult,
  primaryGoal,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
  onNavigate,
}) {
  const steps = buildGuideSteps(checkupResult, primaryGoal);
  if (!steps.length) return null;

  return (
    <div
      style={{
        ...cardSoftStyle,
        padding: '1rem 1.15rem',
        border: '1px solid rgba(77,166,255,0.28)',
        background: 'linear-gradient(145deg, rgba(37,99,235,0.12), rgba(28,40,68,0.75))',
        display: 'grid',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#93c5fd' }}>
          Your guide
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>What to do next</div>
        <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4, lineHeight: 1.45 }}>
          Based on your latest score — tap a step to jump to the right place.
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onNavigate?.(step)}
            style={{
              ...btnNeutral,
              textAlign: 'left',
              padding: '0.85rem 1rem',
              display: 'grid',
              gap: 6,
              border: i === 0 ? '1px solid rgba(77,166,255,0.35)' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{step.title}</div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: step.priority === 'HIGH' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.15)',
                  color: step.priority === 'HIGH' ? '#fca5a5' : '#fcd34d',
                  flexShrink: 0,
                }}
              >
                {step.priority}
              </span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>{step.detail}</div>
            {step.score != null ? (
              <div style={{ fontSize: 12, color: scoreBarColor(step.score) }}>
                Current: {Math.round(step.score)}/100
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>{step.cta} →</div>
          </button>
        ))}
      </div>
    </div>
  );
}
