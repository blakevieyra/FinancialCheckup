import { GOAL_OPTIONS, goalDescription, goalLabel } from './goalResources';

const defaultSelectStyle = {
  width: '100%',
  marginTop: 6,
  padding: '0.55rem 0.65rem',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(15,23,42,0.85)',
  color: '#f1f5f9',
  fontSize: 14,
  fontWeight: 600,
};

/** Compact goal selector — updates guide, Progress metrics, AI context, and Overview. */
export default function GoalPicker({ value, onChange, inputStyle, disabled, showHint = true, label = 'Switch goal' }) {
  const selected = GOAL_OPTIONS.find((g) => g.id === value);

  return (
    <div style={{ minWidth: 0 }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
        {label}
        <select
          value={value || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...defaultSelectStyle, ...inputStyle }}
        >
          <option value="">General financial wellness</option>
          {GOAL_OPTIONS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      {showHint ? (
        <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.78, lineHeight: 1.45 }}>
          {value ? (
            <>
              <strong style={{ color: '#e2e8f0' }}>{goalLabel(value)}</strong>
              {' — '}
              {selected?.desc || goalDescription(value)}
            </>
          ) : (
            'Guides Progress metrics, Guide steps, Finances cards, and AI reports.'
          )}
        </p>
      ) : null}
    </div>
  );
}
