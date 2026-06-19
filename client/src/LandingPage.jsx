const EXPECT = [
  { title: '6-dimension score', detail: 'Budget, debt, savings, investments, insurance, and retirement — updated as you enter data.' },
  { title: 'Personalized guide', detail: 'See what to fix next and jump straight to the right tool in the app.' },
  { title: 'Your data stays yours', detail: 'No bank login. Export or delete everything anytime.' },
];

export default function LandingPage({
  shellStyle,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  isMobile,
  authMode,
  setAuthMode,
  username,
  setUsername,
  password,
  setPassword,
  authError,
  authFieldErrors,
  registerEmail,
  setRegisterEmail,
  registerPhase,
  verifyCode,
  setVerifyCode,
  authNotice,
  busy,
  submitAuth,
  onResendCode,
  resendBusy,
}) {
  const pageStyle = {
    ...shellStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile
      ? 'max(1rem, env(safe-area-inset-top)) 1rem max(1.5rem, env(safe-area-inset-bottom))'
      : '2rem 1.5rem',
  };

  const innerStyle = {
    width: '100%',
    maxWidth: 920,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? 20 : 28,
    alignItems: 'start',
  };

  return (
    <div style={pageStyle} className="fc-landing-shell">
      <div style={innerStyle}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Financial Checkup</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>Sign in to track your score</div>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: isMobile ? '1.1rem' : '1.35rem', background: 'linear-gradient(145deg, rgba(37,99,235,0.18), rgba(15,23,42,0.72))' }}>
            <h1 style={{ margin: '0 0 10px', fontSize: isMobile ? '1.45rem' : '1.75rem', lineHeight: 1.2 }}>
              Your financial health score — in minutes.
            </h1>
            <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.55 }}>
              Log in to enter income, debt, savings, and insurance details. Your score and next steps update automatically.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.65 }}>
              What to expect
            </div>
            {EXPECT.map((item) => (
              <div key={item.title} style={{ ...cardSoftStyle, padding: '0.85rem 1rem' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4, lineHeight: 1.45 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: isMobile ? '1.15rem' : '1.35rem', minWidth: 0 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: isMobile ? '1.2rem' : '1.35rem' }}>
            {authMode === 'login' ? 'Sign in' : registerPhase === 'code' ? 'Verify your email' : 'Create account'}
          </h2>
          <p style={{ margin: '0 0 14px', opacity: 0.82, fontSize: 14, lineHeight: 1.45 }}>
            {authMode === 'login'
              ? 'Welcome back — your dashboard picks up where you left off.'
              : registerPhase === 'code'
                ? `Enter the 6-digit code we sent to ${registerEmail}.`
                : 'Free to start. We email a one-time code to confirm your address.'}
          </p>

          {authNotice ? <div style={{ marginBottom: 12, color: '#86efac', fontSize: 14 }}>{authNotice}</div> : null}

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              style={{ ...(authMode === 'login' ? btnPrimary : { ...btnNeutral, border: 'none', background: 'rgba(15,23,42,0.85)' }), flex: 1, padding: '0.5rem 0.75rem' }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              style={{ ...(authMode === 'register' ? btnPrimary : { ...btnNeutral, border: 'none', background: 'rgba(15,23,42,0.85)' }), flex: 1, padding: '0.5rem 0.75rem' }}
            >
              Register
            </button>
          </div>

          <form onSubmit={submitAuth} style={{ display: 'grid', gap: 10 }}>
            {authMode === 'register' && registerPhase === 'code' ? (
              <>
                <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
                  Verification code
                  <input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    style={{ ...inputStyle, width: '100%', letterSpacing: '0.25em', fontSize: 18, textAlign: 'center' }}
                  />
                </label>
                <button type="submit" disabled={busy || verifyCode.length < 6} style={btnPrimary}>
                  {busy ? 'Verifying…' : 'Verify & create account'}
                </button>
                <button type="button" onClick={onResendCode} disabled={resendBusy || busy} style={{ ...btnNeutral, border: 'none', background: 'rgba(15,23,42,0.85)' }}>
                  {resendBusy ? 'Sending…' : 'Resend code'}
                </button>
                {authError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{authError}</div> : null}
              </>
            ) : (
              <>
                <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
                  Username
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                  {authFieldErrors?.username ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{authFieldErrors.username}</div> : null}
                </label>
                {authMode === 'register' ? (
                  <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
                    Email
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      style={{ ...inputStyle, width: '100%' }}
                    />
                    {authFieldErrors?.email ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{authFieldErrors.email}</div> : null}
                  </label>
                ) : null}
                <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                  {authFieldErrors?.password ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{authFieldErrors.password}</div> : null}
                  {authMode === 'register' ? (
                    <div style={{ fontSize: 11, opacity: 0.65 }}>Min 8 characters with a letter and a number.</div>
                  ) : null}
                </label>
                {authError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{authError}</div> : null}
                <button type="submit" disabled={busy} style={{ ...btnPrimary, marginTop: 4 }}>
                  {busy
                    ? 'Working…'
                    : authMode === 'register'
                      ? 'Send verification code'
                      : 'Sign in'}
                </button>
              </>
            )}
          </form>
        </div>

        <footer
          style={{
            gridColumn: isMobile ? undefined : '1 / -1',
            textAlign: 'center',
            opacity: 0.6,
            fontSize: 12,
            lineHeight: 1.6,
            marginTop: isMobile ? 4 : 0,
          }}
        >
          <div>© 2026 Financial Checkup · OPERON E2I LLC · Fresno, CA</div>
          <div>Contact: info@operone2i.com</div>
        </footer>
      </div>
    </div>
  );
}
