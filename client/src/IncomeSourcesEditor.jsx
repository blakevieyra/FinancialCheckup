import {
  INCOME_SOURCE_PRESETS,
  newIncomeSource,
  sumIncomeSources,
} from './incomeSources';
import {
  FieldSummary,
  formatMoney,
  InnerItemCard,
  SectionHeader,
  TotalBar,
} from './panelPrimitives';

export default function IncomeSourcesEditor({
  sources,
  onChange,
  inputStyle,
  btnNeutral,
  cardSoftStyle,
  isMobile,
  isTablet,
  disabled,
}) {
  const grid = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';
  const rows = sources?.length ? sources : [newIncomeSource()];
  const total = sumIncomeSources(rows);

  function updateRow(id, patch) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id) {
    if (rows.length <= 1) {
      onChange([newIncomeSource('Salary / wages', '')]);
      return;
    }
    onChange(rows.filter((row) => row.id !== id));
  }

  function addRow(preset) {
    const label = preset || 'Salary / wages';
    const exists = rows.some((r) => r.label === label && (Number(r.amount) || 0) === 0);
    if (exists) return;
    onChange([...rows, newIncomeSource(label, '')]);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <SectionHeader
        title="Monthly income sources"
        subtitle="Add each paycheck or income stream — your monthly total updates automatically."
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <select
          defaultValue=""
          onChange={(e) => {
            const val = e.target.value;
            if (val) addRow(val);
            e.target.value = '';
          }}
          disabled={disabled}
          style={{ ...inputStyle, maxWidth: 220, padding: '0.5rem 0.65rem' }}
          aria-label="Add income source"
        >
          <option value="">+ Add income source…</option>
          {INCOME_SOURCE_PRESETS.map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10 }}>
        {rows.map((row) => (
          <InnerItemCard key={row.id} cardSoftStyle={cardSoftStyle}>
            <input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(row.id, { label: e.target.value })}
              placeholder="Source name"
              disabled={disabled}
              style={{ ...inputStyle, width: '100%', padding: 8, fontWeight: 600 }}
              aria-label="Income source name"
            />
            <input
              type="number"
              value={row.amount}
              step="0.01"
              min="0"
              onChange={(e) => updateRow(row.id, { amount: e.target.value })}
              placeholder="0.00"
              disabled={disabled}
              style={{ ...inputStyle, width: '100%', padding: 8 }}
              aria-label={`${row.label || 'Income'} amount`}
            />
            <FieldSummary hasValue={Number(row.amount) > 0}>
              {Number(row.amount) > 0 && total > 0
                ? `${formatMoney(row.amount)} · ${((Number(row.amount) / total) * 100).toFixed(0)}% of income`
                : 'Not entered this month'}
            </FieldSummary>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={disabled}
              style={{ ...btnNeutral, fontSize: 12, padding: '0.35rem 0.5rem', justifySelf: 'start' }}
            >
              Remove
            </button>
          </InnerItemCard>
        ))}
      </div>

      <TotalBar label="Monthly income total" value={formatMoney(total, { decimals: 2 })} variant="income" />
    </div>
  );
}
