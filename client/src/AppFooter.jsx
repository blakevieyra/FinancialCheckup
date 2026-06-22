export default function AppFooter() {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid rgba(148,163,184,0.15)',
        textAlign: 'center',
        opacity: 0.7,
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      <div style={{ marginBottom: 8, textTransform: 'none', letterSpacing: 'normal', fontSize: 12 }}>
        <a href="/privacy.html" style={{ color: '#93c5fd', textDecoration: 'none' }}>
          Privacy Policy
        </a>
      </div>
      OPERON E2I LLC
    </div>
  );
}
