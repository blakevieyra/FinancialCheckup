const router = require('express').Router();
const Stripe = require('stripe');
const { verifyToken } = require('./auth');
const { dbGet, dbRun } = require('./db');
const { STRIPE_PRICES, resolveTier, featuresForTier, tierLabel } = require('./subscriptionTiers');
const { getUserTier } = require('./requireFeature');

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
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        fields.stripe_customer_id || null,
        fields.stripe_subscription_id || null,
        fields.status || 'free',
        fields.plan || 'free',
        fields.current_period_end || null,
      ],
    );
  }
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
        status = sub.status;
        periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const priceId = sub.items?.data?.[0]?.price?.id;
        if (priceId === STRIPE_PRICES.annual) plan = 'annual';
        else if (priceId === STRIPE_PRICES.monthly) plan = 'monthly';
      }
      await upsertSubscription(userId, {
        stripe_customer_id: session.customer,
        stripe_subscription_id: subId,
        status,
        plan,
        current_period_end: periodEnd,
      });
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
      const active = sub.status === 'active' || sub.status === 'trialing';
      const priceId = sub.items?.data?.[0]?.price?.id;
      let plan = 'free';
      if (active) {
        plan = priceId === STRIPE_PRICES.annual ? 'annual' : 'monthly';
      }
      await upsertSubscription(row.user_id, {
        status: active ? sub.status : 'canceled',
        plan: active ? plan : 'free',
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
      });
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
    const row = await dbGet(
      'SELECT status, plan, current_period_end FROM subscriptions WHERE user_id = ?',
      [req.user.id],
    );
    const tier = await getUserTier(req.user.id);
    res.json({
      tier,
      tierLabel: tierLabel(tier),
      status: row?.status || 'free',
      plan: row?.plan || 'free',
      currentPeriodEnd: row?.current_period_end || null,
      features: featuresForTier(tier),
      prices: {
        monthly: STRIPE_PRICES.monthly,
        annual: STRIPE_PRICES.annual,
      },
      billingConfigured: Boolean(stripe),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
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

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: String(req.user.id),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${clientUrl}/?billing=success`,
      cancel_url: `${clientUrl}/?billing=canceled`,
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
      return_url: clientUrl,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Portal failed.' });
  }
});

module.exports = { router, stripeWebhook };
