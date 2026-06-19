import { useState } from 'react';

/** Collapsed by default — reduces dashboard overload until user opens a section */
export default function ExpandablePanel({ title, hint, children, cardSoftStyle, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ ...cardSoftStyle, padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0.9rem 1rem',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          {hint && !open ? <div style={{ fontSize: 13, opacity: 0.72, marginTop: 4 }}>{hint}</div> : null}
        </div>
        <span style={{ opacity: 0.6, fontSize: 18, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      <div
        style={{
          maxHeight: open ? 4000 : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 420ms ease, opacity 380ms ease',
        }}
      >
        <div style={{ padding: open ? '0 1rem 1rem' : 0, borderTop: open ? '1px solid rgba(148,163,184,0.12)' : 'none' }}>
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
