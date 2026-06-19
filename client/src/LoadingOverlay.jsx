export default function LoadingOverlay({ message = 'Loading…', submessage }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(10,15,26,0.72)',
        backdropFilter: 'blur(6px)',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          padding: '1.5rem 2rem',
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(28,40,68,0.95)',
          textAlign: 'center',
          minWidth: 240,
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            margin: '0 auto 14px',
            borderRadius: '50%',
            border: '3px solid rgba(77,166,255,0.25)',
            borderTopColor: '#4da6ff',
            animation: 'fcSpin 0.8s linear infinite',
          }}
        />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{message}</div>
        {submessage ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>{submessage}</div> : null}
      </div>
    </div>
  );
}
