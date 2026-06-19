export default function BillingPanel({
  subscription,
  billingBusy,
  billingErr,
  onSubscribeMonthly,
  onSubscribeAnnual,
  onManageBilling,
  onRefresh,
  cardStyle,
  btnPrimary,
  btnNeutral,
  isMobile,
}) {
  const tier = subscription?.tier || 'free';
  const isPro = tier === 'pro';
  const features = subscription?.features || {};

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 16 : 18 }}>Your plan</div>
          <div style={{ fontSize: 14, opacity: 0.88, marginTop: 4 }}>
            {isPro ? (
              <>
                <strong>Pro</strong>
                {subscription?.plan === 'annual' ? ' (annual)' : subscription?.plan === 'monthly' ? ' (monthly)' : ''}
                {subscription?.currentPeriodEnd ? (
                  <> · renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                ) : null}
              </>
            ) : (
              <>Free — track money & run a basic checkup. Upgrade for full history, AI, exports & more.</>
            )}
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={billingBusy} style={{ ...btnNeutral, fontSize: 12 }}>
          Refresh
        </button>
      </div>

      {billingErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{billingErr}</div> : null}

      {!isPro ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          <div style={{ border: '1px solid rgba(59,130,246,0.35)', borderRadius: 10, padding: '0.85rem' }}>
            <div style={{ fontWeight: 700 }}>Pro Monthly</div>
            <div style={{ fontSize: 13, opacity: 0.85, margin: '6px 0 10px' }}>Full checkup, history, AI insights, exports, goals & digest.</div>
            <button type="button" disabled={billingBusy || !subscription?.billingConfigured} onClick={onSubscribeMonthly} style={btnPrimary}>
              Subscribe monthly
            </button>
          </div>
          <div style={{ border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, padding: '0.85rem' }}>
            <div style={{ fontWeight: 700 }}>Pro Annual</div>
            <div style={{ fontSize: 13, opacity: 0.85, margin: '6px 0 10px' }}>Same Pro features — best value when billed yearly.</div>
            <button type="button" disabled={billingBusy || !subscription?.billingConfigured} onClick={onSubscribeAnnual} style={btnPrimary}>
              Subscribe annual
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={billingBusy} onClick={onManageBilling} style={btnNeutral}>
          Manage subscription
        </button>
      )}

      {!subscription?.billingConfigured ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>Billing is not configured on this server yet (STRIPE_SECRET_KEY).</div>
      ) : null}

      <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
        <strong>Free:</strong> Money, Profile, basic checkup & overview.
        <br />
        <strong>Pro:</strong> Score history, roadmap, AI, expert briefing, exports, goals, digest, forecasts & community compare.
        {!features.checkupHistory && isPro === false ? (
          <>
            <br />
            <span style={{ opacity: 0.9 }}>Locked for your plan: {Object.entries(features).filter(([, v]) => !v).map(([k]) => k).slice(0, 6).join(', ')}…</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
