import { APP_SECTIONS } from './appSections';

export default function AppNav({ active, onChange, isMobile, btnPrimary, btnNeutral }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))',
        gap: 8,
        padding: isMobile ? 4 : 6,
        borderRadius: 14,
        background: 'rgba(15,23,42,0.55)',
        border: '1px solid rgba(148,163,184,0.18)',
      }}
      role="tablist"
      aria-label="App sections"
    >
      {APP_SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(s.id)}
            style={{
              ...(isActive ? btnPrimary : btnNeutral),
              padding: isMobile ? '0.55rem 0.45rem' : '0.6rem 0.5rem',
              fontSize: isMobile ? 12 : 13,
              textAlign: 'center',
              lineHeight: 1.25,
              border: isActive ? '1px solid rgba(147,197,253,0.45)' : '1px solid rgba(148,163,184,0.2)',
              boxShadow: isActive ? '0 4px 18px rgba(37,99,235,0.28)' : 'none',
            }}
          >
            <div style={{ fontWeight: 700 }}>{s.label}</div>
            {!isMobile ? (
              <div style={{ fontSize: 10, opacity: isActive ? 0.92 : 0.72, fontWeight: 400, marginTop: 3 }}>
                {s.hint}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
