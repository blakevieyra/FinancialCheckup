import { useState } from 'react';
import { buildGuideSteps } from './guideEngine';
import { scoreBarColor } from './theme';
import { goalLabel } from './goalResources';

export default function GuidePanel({
  checkupResult,
  primaryGoal,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
  onNavigate,
}) {
  const steps = buildGuideSteps(checkupResult, primaryGoal);
  const [expandedId, setExpandedId] = useState(steps[0]?.id || null);

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
          {primaryGoal ? (
            <>Personalized for your goal: <strong>{goalLabel(primaryGoal)}</strong> — tap a card title to expand.</>
          ) : (
            <>Tap any card title to reveal details — you control what to read next.</>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {steps.map((step, i) => {
          const open = expandedId === step.id;
          return (
            <div
              key={step.id}
              style={{
                borderRadius: 10,
                border: open ? '1px solid rgba(77,166,255,0.45)' : '1px solid rgba(148,163,184,0.2)',
                background: open ? 'rgba(37,99,235,0.1)' : 'rgba(15,23,42,0.35)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : step.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'flex-start',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'grid', gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{step.title}</div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: step.priority === 'HIGH' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.15)',
                        color: step.priority === 'HIGH' ? '#fca5a5' : '#fcd34d',
                      }}
                    >
                      {step.priority}
                    </span>
                    {i === 0 ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(77,166,255,0.2)', color: '#93c5fd' }}>
                        Start here
                      </span>
                    ) : null}
                  </div>
                  {!open ? (
                    <div style={{ fontSize: 12, opacity: 0.65 }}>Tap to expand</div>
                  ) : null}
                </div>
                <span style={{ opacity: 0.6, fontSize: 18, flexShrink: 0 }}>{open ? '−' : '+'}</span>
              </button>

              {open ? (
                <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                  <div style={{ fontSize: 13, opacity: 0.88, lineHeight: 1.45, marginTop: 10 }}>{step.detail}</div>
                  {step.score != null ? (
                    <div style={{ fontSize: 12, color: scoreBarColor(step.score), marginTop: 8 }}>
                      Current: {Math.round(step.score)}/100
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onNavigate?.(step)}
                    style={{ ...btnPrimary, marginTop: 12, width: '100%' }}
                  >
                    {step.cta} →
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
