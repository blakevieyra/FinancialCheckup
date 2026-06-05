import { APP_SECTIONS } from './appSections';

export default function AppNav({ active, onChange, isMobile, btnPrimary, btnNeutral }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
        gap: 6,
      }}
      role="tablist"
      aria-label="App sections"
    >
      {APP_SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={active === s.id}
          onClick={() => onChange(s.id)}
          style={{
            ...(active === s.id ? btnPrimary : btnNeutral),
            padding: isMobile ? '0.5rem 0.4rem' : '0.55rem 0.65rem',
            fontSize: isMobile ? 12 : 13,
            textAlign: 'center',
            lineHeight: 1.25,
          }}
        >
          <div style={{ fontWeight: 700 }}>{s.label}</div>
          {!isMobile ? <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>{s.hint}</div> : null}
        </button>
      ))}
    </div>
  );
}
