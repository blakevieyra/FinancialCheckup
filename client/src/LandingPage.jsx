import { useState } from 'react';
import ScoreBreakdownShowcase from './ScoreBreakdownShowcase';
import {
  CHECKUP_PROCESS,
  CHECKUP_FEATURES,
  CHECKUP_STATS,
  CHECKUP_FAQ,
  DEMO_ACTION_PLAN,
  DEMO_LANDING_DIMENSIONS,
} from './checkupConstants';

export default function LandingPage({
  shellStyle,
  containerStyle,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  isMobile,
  isTablet,
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
  authNotice,
  busy,
  submitAuth,
  onStartCheckup,
  guestEmail,
  setGuestEmail,
  tipsMsg,
  tipsErr,
  onTipsSignup,
  tipsBusy,
}) {
  const [openFaq, setOpenFaq] = useState(null);
  const grid2 = isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr';
  const grid3 = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';

  return (
    <div style={shellStyle}>
      <div style={{ ...containerStyle, maxWidth: isMobile ? '100%' : 1200 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
            <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 20, letterSpacing: '-0.02em' }}>Financial Checkup</div>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 14, opacity: 0.85 }}>
            <a href="#how-it-works" style={{ color: '#93c5fd' }}>How it works</a>
            <a href="#features" style={{ color: '#93c5fd' }}>Features</a>
            <a href="#faq" style={{ color: '#93c5fd' }}>FAQ</a>
            <a href="#get-started" style={{ color: '#93c5fd' }}>Get your score →</a>
          </nav>
        </header>

        <section style={{ ...cardStyle, padding: isMobile ? '1.25rem' : '1.75rem', background: 'linear-gradient(145deg, rgba(37,99,235,0.22), rgba(15,23,42,0.75))' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }}>Free financial health score</div>
          <h1 style={{ margin: '0 0 12px', fontSize: isMobile ? '1.65rem' : '2.35rem', lineHeight: 1.15, maxWidth: 640 }}>
            Know exactly where your money stands — in 2 minutes.
          </h1>
          <p style={{ margin: '0 0 1.25rem', opacity: 0.9, lineHeight: 1.5, maxWidth: 580, fontSize: 15 }}>
            AI-powered diagnostic across 6 financial dimensions: budget, debt, savings, investments, insurance, and retirement.
            Free to start — no bank login required.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <button type="button" onClick={onStartCheckup} style={{ ...btnPrimary, fontWeight: 700 }}>
              ⚡ Get My Financial Score →
            </button>
            <a href="#how-it-works" style={{ ...btnNeutral, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              See how it works ↓
            </a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, opacity: 0.88 }}>
            {['Free to start', 'No bank login', '2-minute checkup', 'Personalized action plan'].map((t) => (
              <span key={t}>✓ {t}</span>
            ))}
          </div>
        </section>

        <div style={{ marginTop: '1.25rem' }}>
          <ScoreBreakdownShowcase
            overallScore={74}
            dimensions={DEMO_LANDING_DIMENSIONS}
            badge="Free financial health score"
            large
            isMobile={isMobile}
            renderDetail={(dim) => (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{dim.label} — {dim.score}/100</div>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.88, lineHeight: 1.55, maxWidth: 640 }}>{dim.blurb}</p>
              </div>
            )}
          />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
            Tap a category to explore — your real score updates as you complete the checkup
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: '1rem' }}>
          <div style={{ ...cardStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.55, overflow: 'auto', gridColumn: isMobile ? undefined : '1 / -1' }}>
            <div style={{ opacity: 0.65, marginBottom: 6 }}>financialcheckup — step 04 / plan</div>
            <div style={{ color: '#86efac' }}>&gt; financialcheckup plan --priority high</div>
            <div style={{ opacity: 0.85, marginTop: 8 }}>─── Your Personalized Action Plan ───</div>
            {DEMO_ACTION_PLAN.map((item, i) => (
              <div key={item.title} style={{ marginTop: i === 0 ? 10 : 12 }}>
                <div><strong>#{i + 1} [{item.priority}]</strong> {item.title}</div>
                <div style={{ opacity: 0.8 }}>{item.detail}</div>
                {item.timeline ? <div style={{ opacity: 0.75 }}>{item.timeline}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <section id="how-it-works" style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: 6 }}>The checkup process</h2>
          <p style={{ opacity: 0.85, marginTop: 0, lineHeight: 1.45 }}>Five steps to total financial clarity. No spreadsheets required.</p>
          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 10, marginTop: '1rem' }}>
            {CHECKUP_PROCESS.map((p) => (
              <div key={p.step} style={{ ...cardSoftStyle, padding: '0.85rem' }}>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{p.step} {p.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{p.title}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>{p.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Everything in your checkup</h2>
          <div style={{ display: 'grid', gridTemplateColumns: grid3, gap: 10 }}>
            {CHECKUP_FEATURES.map((f) => (
              <div key={f.title} style={{ ...cardStyle }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 700 }}>{f.title}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>{f.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: '1.5rem' }}>
          {CHECKUP_STATS.map((s) => (
            <div key={s.label} style={{ ...cardSoftStyle, padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 22 }}>{s.value}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <section id="faq" style={{ ...cardStyle, marginTop: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>FAQ</h2>
          {CHECKUP_FAQ.map((item, i) => (
            <details
              key={item.q}
              open={openFaq === i}
              onToggle={(e) => setOpenFaq(e.target.open ? i : null)}
              style={{ borderTop: i ? '1px solid rgba(148,163,184,0.2)' : undefined, paddingTop: i ? 10 : 0, marginTop: i ? 10 : 0 }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{item.q}</summary>
              <p style={{ opacity: 0.88, fontSize: 14, lineHeight: 1.45 }}>{item.a}</p>
            </details>
          ))}
        </section>

        <section style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>📬 FREE MONEY TIPS</div>
          <p style={{ margin: '0 0 12px', opacity: 0.88, fontSize: 14 }}>
            Budgeting hacks, debt payoff strategies, and market insights — without the jargon.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ ...inputStyle, flex: '1 1 200px', minWidth: 0 }}
            />
            <button type="button" onClick={onTipsSignup} disabled={tipsBusy} style={btnPrimary}>
              {tipsBusy ? 'Saving…' : 'Get free tips →'}
            </button>
          </div>
          {tipsMsg ? <div style={{ marginTop: 8, color: '#86efac', fontSize: 14 }}>{tipsMsg}</div> : null}
          {tipsErr ? <div style={{ marginTop: 8, color: '#ffb3b3', fontSize: 14 }}>{tipsErr}</div> : null}
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>Create a free account below to save tips preferences.</div>
        </section>

        <section id="get-started" style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Start your free checkup</h2>
          <p style={{ opacity: 0.88, fontSize: 14, marginTop: 0 }}>
            Register or log in to save scores, run unlimited checkups, and track progress monthly.
          </p>
          {authNotice ? <div style={{ marginBottom: 10, color: '#86efac', fontSize: 14 }}>{authNotice}</div> : null}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setAuthMode('login')} style={authMode === 'login' ? btnPrimary : btnNeutral}>
              Login
            </button>
            <button type="button" onClick={() => setAuthMode('register')} style={authMode === 'register' ? btnPrimary : btnNeutral}>
              Register
            </button>
          </div>
          <form onSubmit={submitAuth} style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
              />
              {authFieldErrors?.username ? <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{authFieldErrors.username}</div> : null}
            </label>
            {authMode === 'register' ? (
              <label>
                Email
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  style={{ ...inputStyle, width: '100%', marginTop: 4 }}
                />
                {authFieldErrors?.email ? <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{authFieldErrors.email}</div> : null}
              </label>
            ) : null}
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
              />
              {authFieldErrors?.password ? <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{authFieldErrors.password}</div> : null}
              {authMode === 'register' ? (
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Min 8 characters with a letter and a number.</div>
              ) : null}
            </label>
            {authError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{authError}</div> : null}
            <button type="submit" disabled={busy} style={{ ...btnPrimary, marginTop: 6 }}>
              {busy ? 'Working…' : authMode === 'register' ? 'Create account & continue' : 'Login & continue'}
            </button>
          </form>
        </section>

        <footer style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.65, fontSize: 12, lineHeight: 1.6 }}>
          <div>© 2026 Financial Checkup · Built by Operon E2I LLC · Fresno, CA · Veteran-Owned</div>
          <div>Contact: info@operone2i.com</div>
        </footer>
      </div>
    </div>
  );
}
