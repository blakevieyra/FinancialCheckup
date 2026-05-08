const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function modelName() {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
}

/**
 * @param {object} opts
 * @param {string} opts.userContent
 * @param {number} [opts.maxTokens]
 * @param {string} [opts.system]
 */
async function createMessage({ userContent, maxTokens = 2048, system }) {
  const key = process.env.ANTHROPIC_API_KEY || '';
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set.');

  const body = {
    model: modelName(),
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userContent }],
  };
  if (system) body.system = system;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Anthropic API error (${res.status})`;
    throw new Error(msg);
  }
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Anthropic.');
  return text;
}

function stripJsonFence(text) {
  return text.replace(/```json|```/g, '').trim();
}

module.exports = { createMessage, stripJsonFence, modelName };
