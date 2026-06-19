const router = require('express').Router();
const Stripe = require('stripe');
const { verifyToken } = require('./auth');
const { dbGet, dbRun } = require('./db');
const { STRIPE_PRICES, resolveTier, featuresForTier, tierLabel } = require('./subscriptionTiers');
const { sendSubscribedEmail, sendDeactivatedEmail } = require('./transactionalEmail');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function upsertSubscription(userId, fields) {
  const existing = await dbGet('SELECT user_id FROM subscriptions WHERE user_id = ?', [userId]);
  if (existing) {
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
    sets.push('updated_at = to_char((now() AT TIME ZONE \'UTC\'), \'YYYY-MM-DD"T"HH24:MI:SS"Z"\')');
    vals.push(userId);
    await dbRun(`UPDATE subscriptions SET ${sets.join(', ')} WHERE user_id = ?`, vals);
  } else {
    await dbRun(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end, cancel_at_period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        fields.stripe_customer_id || null,
        fields.stripe_subscription_id || null,
        fields.status || 'free',
        fields.plan || 'free',
        fields.current_period_end || null,
        fields.cancel_at_period_end ? 1 : 0,
      ],
    );
  }
}

function planFromPriceId(priceId) {
  if (priceId === STRIPE_PRICES.annual) return 'annual';
  if (priceId === STRIPE_PRICES.monthly) return 'monthly';
  return 'monthly';
}

function fieldsFromStripeSub(sub) {
  const active = sub.status === 'active' || sub.status === 'trialing';
  const priceId = sub.items?.data?.[0]?.price?.id;
  return {
    stripe_subscription_id: sub.id,
    status: active ? sub.status : 'canceled',
    plan: active ? planFromPriceId(priceId) : 'free',
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
  };
}

async function buildStatusJson(userId) {
  const row = await dbGet(
    'SELECT status, plan, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, updated_at FROM subscriptions WHERE user_id = ?',
    [userId],
  );
  const tier = resolveTier(row);
  const base = {
    tier,
    tierLabel: tierLabel(tier),
    status: row?.status || 'free',
    plan: row?.plan || 'free',
    currentPeriodEnd: row?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    hasStripeCustomer: Boolean(row?.stripe_customer_id),
    features: featuresForTier(tier),
    prices: {
      monthly: STRIPE_PRICES.monthly,
      annual: STRIPE_PRICES.annual,
    },
    billingConfigured: Boolean(stripe),
    subscriptionStart: null,
    currentPeriodStart: null,
    lastChargeAmount: null,
    lastChargeCurrency: 'usd',
    lastChargeDate: null,
    nextChargeAmount: null,
  };

  if (stripe && row?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      base.subscriptionStart = sub.start_date ? new Date(sub.start_date * 1000).toISOString() : null;
      base.currentPeriodStart = sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null;
      base.currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : base.currentPeriodEnd;
      const price = sub.items?.data?.[0]?.price;
      if (price?.unit_amount) {
        base.nextChargeAmount = price.unit_amount / 100;
        base.lastChargeCurrency = price.currency || 'usd';
      }
      const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 3 });
      const paid = invoices.data.find((inv) => inv.status === 'paid' && inv.amount_paid > 0);
      if (paid) {
        base.lastChargeAmount = paid.amount_paid / 100;
        base.lastChargeCurrency = paid.currency || 'usd';
        base.lastChargeDate = paid.status_transitions?.paid_at
          ? new Date(paid.status_transitions.paid_at * 1000).toISOString()
          : paid.created
            ? new Date(paid.created * 1000).toISOString()
            : null;
      }
    } catch (e) {
      console.error('[billing] status enrich failed:', e.message);
    }
  }

  return base;
}

function billingReturnBase(clientUrl) {
  return `${clientUrl}/?section=plan`;
}

async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = Number(session.metadata?.userId || session.client_reference_id);
      if (!userId) break;
      const subId = session.subscription;
      let status = 'active';
      let plan = session.metadata?.plan || 'monthly';
      let periodEnd = null;
      if (subId && stripe) {
        const sub = await stripe.subscriptions.retrieve(subId);
        plan = sub.items?.data?.[0]?.price?.id === STRIPE_PRICES.annual ? 'annual' : 'monthly';
        await upsertSubscription(userId, {
          stripe_customer_id: session.customer,
          ...fieldsFromStripeSub(sub),
        });
      } else {
        await upsertSubscription(userId, {
          stripe_customer_id: session.customer,
          stripe_subscription_id: subId,
          status,
          plan,
          current_period_end: periodEnd,
          cancel_at_period_end: 0,
        });
      }
      sendSubscribedEmail(userId, plan).catch(() => {});
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const row = await dbGet(
        'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?',
        [sub.id],
      );
      if (!row) break;
      const fields = fieldsFromStripeSub(sub);
      await upsertSubscription(row.user_id, fields);
      if (event.type === 'customer.subscription.deleted' || fields.status === 'canceled') {
        sendDeactivatedEmail(row.user_id, 'subscription_canceled').catch(() => {});
      }
      break;
    }
    default:
      break;
  }
}

async function stripeWebhook(req, res) {
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: 'Billing not configured.' });
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
}

router.use(verifyToken);

router.get('/status', async (req, res) => {
  try {
    res.json(await buildStatusJson(req.user.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/sync', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured on server.' });
  try {
    const row = await dbGet(
      'SELECT stripe_customer_id, stripe_subscription_id FROM subscriptions WHERE user_id = ?',
      [req.user.id],
    );
    if (!row?.stripe_customer_id) {
      return res.json(await buildStatusJson(req.user.id));
    }

    let sub = null;
    if (row.stripe_subscription_id) {
      try {
        sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      } catch {
        sub = null;
      }
    }
    if (!sub || sub.status === 'canceled') {
      const list = await stripe.subscriptions.list({
        customer: row.stripe_customer_id,
        status: 'all',
        limit: 5,
      });
      sub = list.data.find((s) => s.status === 'active' || s.status === 'trialing') || list.data[0] || null;
    }

    if (sub && (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')) {
      await upsertSubscription(req.user.id, {
        stripe_customer_id: row.stripe_customer_id,
        ...fieldsFromStripeSub(sub),
      });
    } else if (sub) {
      await upsertSubscription(req.user.id, {
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: sub.id,
        status: sub.status === 'canceled' ? 'canceled' : sub.status,
        plan: 'free',
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
      });
    } else {
      await upsertSubscription(req.user.id, {
        status: 'free',
        plan: 'free',
        cancel_at_period_end: 0,
      });
    }

    res.json(await buildStatusJson(req.user.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Sync failed.' });
  }
});

router.post('/checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured on server.' });
  try {
    const plan = req.body?.plan === 'annual' ? 'annual' : 'monthly';
    const priceId = STRIPE_PRICES[plan];
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

    let row = await dbGet('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?', [req.user.id]);
    let customerId = row?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: String(req.user.id), username: req.user.username || '' },
      });
      customerId = customer.id;
      await upsertSubscription(req.user.id, { stripe_customer_id: customerId, status: 'free', plan: 'free' });
    }

    const returnBase = billingReturnBase(clientUrl);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: String(req.user.id),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnBase}&billing=success`,
      cancel_url: `${returnBase}&billing=canceled`,
      metadata: { userId: String(req.user.id), plan },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Checkout failed.' });
  }
});

router.post('/portal', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured on server.' });
  try {
    const row = await dbGet('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?', [req.user.id]);
    if (!row?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account yet. Subscribe first.' });
    }
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${billingReturnBase(clientUrl)}&billing=portal-return`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Portal failed.' });
  }
});

module.exports = { router, stripeWebhook };
