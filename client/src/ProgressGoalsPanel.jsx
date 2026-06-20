import ExpandablePanel from './ExpandablePanel';
import { assessPrimaryGoalProgress, statusColor } from './goalProgress';
import { scoreBarColor } from './theme';

export default function ProgressGoalsPanel({
  primaryGoal,
  checkupResult,
  profileSummary,
  income,
  totalExpenses,
  savingsRate,
  goals,
  goalsBusy,
  goalsErr,
  goalName,
  onGoalNameChange,
  goalType,
  onGoalTypeChange,
  goalTarget,
  onGoalTargetChange,
  onCreateGoal,
  onDeleteGoal,
  onAddGoalProgress,
  isMobile,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  btnDanger,
}) {
  const assessment = assessPrimaryGoalProgress(primaryGoal, {
    checkupResult,
    profileSummary,
    income,
    totalExpenses,
    savingsRate,
  });

  const progressColor = statusColor(assessment.status);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          ...cardStyle,
          padding: isMobile ? '1.1rem' : '1.35rem 1.5rem',
          background: 'linear-gradient(145deg, rgba(37,99,235,0.14), rgba(15,23,42,0.85))',
          border: '1px solid rgba(77,166,255,0.28)',
          display: 'grid',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#93c5fd' }}>
            Your main goal
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', marginTop: 6 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.35rem' : '1.55rem' }}>{assessment.label}</h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 99,
                background: `${progressColor}22`,
                color: progressColor,
                border: `1px solid ${progressColor}55`,
              }}
            >
              {assessment.statusLabel}
            </span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 14, opacity: 0.88, lineHeight: 1.55, maxWidth: 720 }}>
            {assessment.headline}
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ opacity: 0.75 }}>Progress toward goal</span>
            <span style={{ fontWeight: 800, color: progressColor }}>{Math.round(assessment.progressPercent)}%</span>
          </div>
          <div style={{ height: 12, borderRadius: 99, background: 'rgba(148,163,184,0.2)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, assessment.progressPercent))}%`,
                borderRadius: 99,
                background: `linear-gradient(90deg, ${progressColor}, ${progressColor}aa)`,
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>

        {assessment.metrics.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {assessment.metrics.map((m) => (
              <div key={m.label} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, opacity: 0.65, textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{m.value}</div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>{m.detail}</div>
              </div>
            ))}
          </div>
        ) : null}

        {assessment.focusScores?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Related checkup scores
            </div>
            {assessment.focusScores.map((d) =>
              d.score != null ? (
                <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 40px', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>{d.label}</span>
                  <div style={{ height: 8, borderRadius: 99, background: 'rgba(15,23,42,0.45)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${d.score}%`,
                        height: '100%',
                        background: scoreBarColor(d.score),
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, textAlign: 'right', color: scoreBarColor(d.score) }}>{d.score}</span>
                </div>
              ) : null,
            )}
          </div>
        ) : null}
      </div>

      <ExpandablePanel title="Additional targets" hint="MRR, ARR, retirement & custom goals" cardSoftStyle={cardSoftStyle}>
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.82, lineHeight: 1.45 }}>
            Optional milestones beyond your main onboarding goal — track MRR, savings targets, or custom amounts.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr auto', gap: 8 }}>
            <input value={goalName} onChange={(e) => onGoalNameChange(e.target.value)} placeholder="Goal name (e.g. Retirement 2035)" style={inputStyle} />
            <select value={goalType} onChange={(e) => onGoalTypeChange(e.target.value)} style={inputStyle}>
              <option value="mrr">MRR</option>
              <option value="arr">ARR</option>
              <option value="retirement">Retirement</option>
              <option value="savings">Savings</option>
              <option value="emergency_fund">Emergency fund</option>
              <option value="custom">Custom</option>
            </select>
            <input type="number" value={goalTarget} onChange={(e) => onGoalTargetChange(e.target.value)} placeholder="Target $" style={inputStyle} />
            <button type="button" onClick={onCreateGoal} disabled={goalsBusy} style={btnPrimary}>
              {goalsBusy ? 'Saving…' : 'Add goal'}
            </button>
          </div>
          {goalsErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{goalsErr}</div> : null}
          {goals.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {goals.map((g) => (
                <div key={g.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{g.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.78 }}>
                        {String(g.goalType || 'custom').toUpperCase()} · target ${Number(g.targetAmount).toLocaleString()} · current $
                        {Number(g.currentAmount).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => onAddGoalProgress(g)} disabled={goalsBusy} style={btnNeutral}>
                        Add this month spend
                      </button>
                      <button type="button" onClick={() => onDeleteGoal(g.id)} disabled={goalsBusy} style={btnDanger}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.25)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Number(g.progressPercent) || 0)}%`,
                          background: 'linear-gradient(90deg,#22c55e,#3b82f6)',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{Number(g.progressPercent).toFixed(1)}% complete</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.8, fontSize: 14 }}>No additional targets yet.</div>
          )}
        </div>
      </ExpandablePanel>
    </div>
  );
}
