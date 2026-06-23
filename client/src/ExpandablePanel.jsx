import { useState } from 'react';
import { PANEL_SUMMARY } from './panelPrimitives';

const ACCENT = {
  default: '#3b82f6',
  priorities: '#f59e0b',
  timeline: '#8b5cf6',
  roadmap: '#10b981',
  score: '#3b82f6',
  projections: '#06b6d4',
  outlook: '#3b82f6',
};

/** Collapsed by default — card-style panels for dashboard insights. */
export default function ExpandablePanel({
  title,
  hint,
  children,
  cardSoftStyle,
  defaultOpen = false,
  accent = 'default',
  gridCard = false,
  open: controlledOpen,
  onOpenChange,
  panelId,
  titleAddon,
  headerActions,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  function setOpen(next) {
    const value = typeof next === 'function' ? next(open) : next;
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  }
  const accentColor = ACCENT[accent] || ACCENT.default;

  return (
    <div
      id={panelId}
      style={{
        ...cardSoftStyle,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: gridCard && !open ? 108 : undefined,
        boxShadow: gridCard ? '0 2px 16px rgba(2, 6, 23, 0.18)' : undefined,
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId ? `${panelId}-content` : undefined}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          flex: gridCard && !open ? 1 : undefined,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          padding: gridCard ? '1rem 1.05rem' : '0.95rem 1.05rem',
          minHeight: 48,
          background: open ? 'rgba(15, 23, 42, 0.35)' : 'transparent',
          border: 'none',
          borderLeft: `3px solid ${accentColor}`,
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
            <div style={{ fontWeight: 700, fontSize: gridCard ? 15 : 15, letterSpacing: '-0.01em' }}>{title}</div>
            {titleAddon}
          </div>
          {hint && !open ? (
            <div style={{ fontSize: 12, color: PANEL_SUMMARY.meta, marginTop: 6, lineHeight: 1.45 }}>{hint}</div>
          ) : null}
        </div>
        {headerActions ? (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            {headerActions}
          </div>
        ) : null}
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            minWidth: 32,
            minHeight: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 600,
            color: accentColor,
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? 4000 : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 420ms ease, opacity 320ms ease',
        }}
      >
        <div
          id={panelId ? `${panelId}-content` : undefined}
          style={{ padding: open ? '0 0.9rem 0.9rem' : 0, borderTop: open ? '1px solid rgba(148,163,184,0.12)' : 'none' }}
        >
          {open ? (
            <div className="fc-fade-in" style={{ paddingTop: 12 }}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
