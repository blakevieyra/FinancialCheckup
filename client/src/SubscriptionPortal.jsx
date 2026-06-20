import {
  PLAN_PRICING,
  PLAN_COMPARISON,
  CHECKUP_DIMENSIONS,
} from './planConstants';
import AccountSettingsPanel from './AccountSettingsPanel';

function statusLabel(status) {
  switch (status) {
    case 'active': return 'Active';
    case 'trialing': return 'Trial';
    case 'past_due': return 'Past due — update payment';
    case 'canceled': return 'Canceled';
    case 'unpaid': return 'Unpaid';
    default: return 'Free';
  }
}

function statusColor(status, tier) {
  if (tier === 'pro' && (status === 'active' || status === 'trialing')) return '#22c55e';
  if (status === 'past_due' || status === 'unpaid') return '#ef4444';
  if (status === 'canceled') return '#94a3b8';
  return '#60a5fa';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
}

function CellValue({ value }) {
  if (value === true) return <span style={{ color: '#86efac', fontWeight: 700 }}>✓</span>;
  if (value === false) return <span style={{ opacity: 0.35 }}>—</span>;
  return <span style={{ fontSize: 12, opacity: 0.85 }}>{value}</span>;
}

function PricingCard({
  tier,
  isCurrent,
  isPopular,
  billingBusy,
  billingConfigured,
  onSelect,
  cardStyle,
  btnPrimary,
  btnNeutral,
  isMobile,
}) {
  const accent = tier.id === 'annual' ? '#22c55e' : tier.id === 'monthly' ? '#4da6ff' : '#94a3b8';
  return (
    <div
      style={{
        ...cardStyle,
        padding: isMobile ? '1rem' : '1.25rem',
        display: 'grid',
        gap: 12,
        alignContent: 'start',
        border: isCurrent
          ? `2px solid ${accent}`
          : isPopular
            ? '1px solid rgba(77,166,255,0.45)'
            : '1px solid rgba(148,163,184,0.22)',
        background: isPopular
          ? 'linear-gradient(160deg, rgba(37,99,235,0.14), rgba(15,23,42,0.72))'
          : 'rgba(15,23,42,0.62)',
        boxShadow: isPopular ? '0 12px 40px rgba(37,99,235,0.15)' : undefined,
        position: 'relative',
      }}
    >
      {tier.badge ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 99,
            background: tier.id === 'annual' ? 'rgba(34,197,94,0.2)' : 'rgba(77,166,255,0.25)',
            color: tier.id === 'annual' ? '#86efac' : '#bfdbfe',
          }}
        >
          {tier.badge}
        </div>
      ) : null}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {tier.name}
        </div>
        <div style={{ fontSize: 14, opacity: 0.88, marginTop: 4, lineHeight: 1.4, paddingRight: tier.badge ? 72 : 0 }}>
          {tier.tagline}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: isMobile ? 34 : 40, fontWeight: 800, letterSpacing: '-0.03em' }}>{tier.price}</span>
        {tier.period ? <span style={{ opacity: 0.65, fontSize: 14 }}>{tier.period}</span> : null}
      </div>
      {isCurrent ? (
        <div style={{ fontSize: 13, fontWeight: 700, color: '#86efac', padding: '0.5rem 0' }}>Your current plan</div>
      ) : tier.cta && onSelect ? (
        <button
          type="button"
          disabled={billingBusy || !billingConfigured}
          onClick={onSelect}
          style={{ ...btnPrimary, width: '100%', marginTop: 4 }}
        >
          {billingBusy ? 'Redirecting…' : tier.cta}
        </button>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.75, paddingTop: 4 }}>Included with every account</div>
      )}
    </div>
  );
}

export default function SubscriptionPortal({
  subscription,
  billingBusy,
  billingErr,
  billingMsg,
  token,
  accountEmail,
  inputStyle,
  onSubscribeMonthly,
  onSubscribeAnnual,
  onManageBilling,
  onSync,
  cardStyle,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
  isMobile,
  isTablet,
}) {
  const tier = subscription?.tier || 'free';
  const isPro = tier === 'pro';
  const status = subscription?.status || 'free';
  const plan = subscription?.plan || 'free';
  const grid3 = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';
  const gridFeatures = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';

  const currentPlanId = isPro ? plan : 'free';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          ...cardStyle,
          padding: isMobile ? '1.1rem' : '1.35rem 1.5rem',
          background: 'linear-gradient(145deg, rgba(37,99,235,0.2), rgba(15,23,42,0.78))',
          border: '1px solid rgba(77,166,255,0.28)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Account & billing
        </div>
        <h2 style={{ margin: '6px 0 8px', fontSize: isMobile ? '1.35rem' : '1.65rem', lineHeight: 1.2 }}>
          Your account, plan & subscription
        </h2>
        <p style={{ margin: 0, opacity: 0.88, fontSize: 15, lineHeight: 1.5, maxWidth: 640 }}>
          Start free — during setup you can pick a 7-day Pro trial (no card), subscribe, or stay on Free.
          Upgrade anytime from Account — same plans as{' '}
          <a href="https://operone2i.com/financialcheckup#pricing" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
            financialcheckup.com
          </a>
          .
        </p>
      </div>

      {billingMsg ? (
        <div style={{ ...cardSoftStyle, padding: '0.85rem 1rem', borderLeft: '4px solid #22c55e', fontSize: 14, lineHeight: 1.45 }}>
          {billingMsg}
        </div>
      ) : null}
      {subscription?.welcomeTrial && subscription?.trialDaysRemaining != null ? (
        <div
          style={{
            ...cardSoftStyle,
            padding: '0.85rem 1rem',
            borderLeft: '4px solid #4da6ff',
            fontSize: 14,
            lineHeight: 1.45,
            background: 'rgba(37,99,235,0.12)',
          }}
        >
          <strong>Pro trial active</strong> — {subscription.trialDaysRemaining} day
          {subscription.trialDaysRemaining === 1 ? '' : 's'} left (through {formatDate(subscription.currentPeriodEnd)}).
          {' '}Subscribe below before it ends to keep unlimited Pro access.
        </div>
      ) : null}
      {billingErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{billingErr}</div> : null}

      {token ? (
        <AccountSettingsPanel
          token={token}
          accountEmail={accountEmail}
          cardSoftStyle={cardSoftStyle}
          inputStyle={inputStyle}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
        />
      ) : null}

      <div style={{ ...cardStyle, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Your subscription</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4, lineHeight: 1.45 }}>
              View status, update payment, download invoices, or cancel anytime in the secure Stripe portal.
            </div>
          </div>
          <span
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: isPro ? 'rgba(34,197,94,0.15)' : 'rgba(96,165,250,0.15)',
              border: `1px solid ${isPro ? 'rgba(34,197,94,0.4)' : 'rgba(96,165,250,0.4)'}`,
              color: isPro ? '#86efac' : '#93c5fd',
            }}
          >
            {subscription?.tierLabel || 'Free'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {[
            { label: 'Status', value: statusLabel(status), color: statusColor(status, tier) },
            { label: 'Billing', value: plan === 'annual' ? 'Annual ($96/yr)' : plan === 'monthly' ? 'Monthly ($9.99/mo)' : 'None' },
            {
              label: subscription?.cancelAtPeriodEnd ? 'Access until' : isPro ? 'Next billing' : 'Renews',
              value: formatDate(subscription?.currentPeriodEnd),
            },
            { label: 'Started', value: formatDate(subscription?.subscriptionStart) },
            { label: 'Current period', value: subscription?.currentPeriodStart ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}` : '—' },
            {
              label: 'Last charge',
              value: subscription?.lastChargeAmount != null
                ? `$${Number(subscription.lastChargeAmount).toFixed(2)} · ${formatDate(subscription.lastChargeDate)}`
                : '—',
            },
            {
              label: 'Next charge',
              value: subscription?.nextChargeAmount != null && isPro
                ? `$${Number(subscription.nextChargeAmount).toFixed(2)}`
                : '—',
            },
            { label: 'Pro tools', value: isPro ? 'Unlocked' : 'Upgrade', color: isPro ? '#86efac' : '#93c5fd' },
          ].map((stat) => (
            <div key={stat.label} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontWeight: 700, marginTop: 5, fontSize: 14, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {subscription?.cancelAtPeriodEnd ? (
          <div style={{ fontSize: 13, padding: '0.75rem', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', lineHeight: 1.45 }}>
            Cancellation scheduled — you keep Pro until <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
            Open the billing portal to reactivate.
          </div>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {isPro || subscription?.hasStripeCustomer ? (
            <button type="button" disabled={billingBusy} onClick={onManageBilling} style={btnPrimary}>
              {billingBusy ? 'Opening portal…' : 'Manage subscription & billing'}
            </button>
          ) : null}
          <button type="button" disabled={billingBusy} onClick={onSync} style={btnNeutral}>
            {billingBusy ? 'Syncing…' : 'Refresh status'}
          </button>
        </div>
      </div>

      {!isPro ? (
        <div style={{ display: 'grid', gridTemplateColumns: grid3, gap: 14 }}>
          <PricingCard
            tier={PLAN_PRICING.free}
            isCurrent={currentPlanId === 'free'}
            billingBusy={billingBusy}
            billingConfigured={subscription?.billingConfigured}
            cardStyle={cardStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            isMobile={isMobile}
          />
          <PricingCard
            tier={PLAN_PRICING.monthly}
            isCurrent={currentPlanId === 'monthly'}
            isPopular
            billingBusy={billingBusy}
            billingConfigured={subscription?.billingConfigured}
            onSelect={onSubscribeMonthly}
            cardStyle={cardStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            isMobile={isMobile}
          />
          <PricingCard
            tier={PLAN_PRICING.annual}
            isCurrent={currentPlanId === 'annual'}
            billingBusy={billingBusy}
            billingConfigured={subscription?.billingConfigured}
            onSelect={onSubscribeAnnual}
            cardStyle={cardStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            isMobile={isMobile}
          />
        </div>
      ) : null}

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>What&apos;s included</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 14 }}>Compare Free vs Pro — every feature from your checkup.</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 420 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(148,163,184,0.25)' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600, opacity: 0.75 }}>Feature</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, opacity: 0.75, width: 72, textAlign: 'center' }}>Free</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, opacity: 0.75, width: 72, textAlign: 'center' }}>Pro</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map((row, i) => (
                <tr key={row.label} style={{ borderBottom: i < PLAN_COMPARISON.length - 1 ? '1px solid rgba(148,163,184,0.12)' : undefined }}>
                  <td style={{ padding: '10px 8px', lineHeight: 1.35 }}>{row.label}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}><CellValue value={row.free} /></td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}><CellValue value={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
          Billed securely through Stripe · Cancel anytime from Manage subscription · Annual plan billed as one payment of $96/year
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>Everything in your checkup</div>
        <div style={{ display: 'grid', gridTemplateColumns: gridFeatures, gap: 12 }}>
          {CHECKUP_DIMENSIONS.map((f) => (
            <div key={f.title} style={{ ...cardSoftStyle, padding: '0.9rem' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>{f.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardSoftStyle, padding: '1rem', fontSize: 13, opacity: 0.88, lineHeight: 1.55 }}>
        <strong>Financial professionals:</strong> white-label reports, bulk checkup credits, API access, and custom branding —
        see the{' '}
        <a href="https://operone2i.com/financialcheckup#pricing" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
          Advisor plan
        </a>{' '}
        on our site.
      </div>
    </div>
  );
}
