import { useState } from 'react';
import { FC_COLORS } from './theme';

export const PANEL_SUMMARY = {
  active: '#cbd5e1',
  empty: '#64748b',
  meta: '#94a3b8',
};

export const PANEL_GROUP_SHELL = {
  borderRadius: 12,
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(15, 23, 42, 0.35)',
  overflow: 'hidden',
};

export function formatMoney(value, { decimals = 0 } = {}) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>{title}</div>
      {subtitle ? (
        <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.72, lineHeight: 1.45, color: FC_COLORS.textMuted }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function FieldSummary({ children, hasValue = true }) {
  return (
    <span
      style={{
        fontSize: 12,
        lineHeight: 1.45,
        color: hasValue ? PANEL_SUMMARY.active : PANEL_SUMMARY.empty,
        fontWeight: hasValue ? 500 : 400,
      }}
    >
      {children}
    </span>
  );
}

export function InnerItemCard({ cardSoftStyle, children, style }) {
  return (
    <div
      style={{
        ...cardSoftStyle,
        padding: '0.75rem',
        display: 'grid',
        gap: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const TOTAL_VARIANTS = {
  income: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(52, 211, 153, 0.28)',
    value: '#86efac',
  },
  expense: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.28)',
    value: '#fca5a5',
  },
  neutral: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(96, 165, 250, 0.28)',
    value: '#93c5fd',
  },
};

export function TotalBar({ label, value, variant = 'neutral', compact = false }) {
  const tone = TOTAL_VARIANTS[variant] || TOTAL_VARIANTS.neutral;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
        padding: compact ? '0.65rem 0.9rem' : '0.85rem 1rem',
        borderRadius: compact ? 10 : 12,
        background: tone.bg,
        border: tone.border,
      }}
    >
      <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: '#cbd5e1' }}>{label}</span>
      <span
        style={{
          fontSize: compact ? 18 : 22,
          fontWeight: 800,
          color: tone.value,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function NetSummaryBar({ income, expenses }) {
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  if (inc <= 0) return null;
  const net = inc - exp;
  const positive = net >= 0;
  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.5,
        padding: '0.65rem 0.9rem',
        borderRadius: 10,
        background: positive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
        border: `1px solid ${positive ? 'rgba(52, 211, 153, 0.22)' : 'rgba(248, 113, 113, 0.22)'}`,
        color: positive ? '#86efac' : '#fca5a5',
        fontWeight: 600,
      }}
    >
      {positive
        ? `${formatMoney(net)} left after expenses (${((exp / inc) * 100).toFixed(0)}% of income)`
        : `Over budget by ${formatMoney(Math.abs(net))} (${((exp / inc) * 100).toFixed(0)}% of income)`}
    </div>
  );
}

export function CollapsibleGroup({
  label,
  meta,
  defaultOpen = false,
  children,
  bodyPadding = '0 0.9rem 0.9rem',
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={PANEL_GROUP_SHELL}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: '0.75rem 0.9rem',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
          {meta ? (
            <div style={{ fontSize: 12, color: PANEL_SUMMARY.meta, marginTop: 3 }}>{meta}</div>
          ) : null}
        </div>
        <span style={{ fontSize: 18, color: PANEL_SUMMARY.meta, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      {open ? <div style={{ padding: bodyPadding }}>{children}</div> : null}
    </div>
  );
}

export function SnapshotCard({ title, subtitle, cardSoftStyle, children, accent }) {
  return (
    <div
      style={{
        ...cardSoftStyle,
        padding: '1rem 1.1rem',
        display: 'grid',
        gap: 10,
        borderLeft: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
