function twilioConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

/**
 * Sends an SMS via Twilio REST API (HTTPS), no npm dependency).
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env
 */
async function sendSmsViaTwilio({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) throw new Error('Twilio SMS is not configured.');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const encoded = new URLSearchParams({ From: from, To: to, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encoded.toString(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Twilio error (${res.status})`);
}

module.exports = { sendSmsViaTwilio, twilioConfigured };
