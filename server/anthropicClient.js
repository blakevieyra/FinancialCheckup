const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** Retired 2026-06 — use current Sonnet. Override with ANTHROPIC_MODEL on Render. */
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const RETIRED_MODELS = new Set([
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
]);

function modelCandidates() {
  const env = (process.env.ANTHROPIC_MODEL || '').trim();
  const list = [];
  if (env && !RETIRED_MODELS.has(env)) list.push(env);
  if (!list.includes(DEFAULT_MODEL)) list.push(DEFAULT_MODEL);
  list.push('claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001');
  return [...new Set(list)];
}

function modelName() {
  const [first] = modelCandidates();
  return first || DEFAULT_MODEL;
}

function isModelError(message) {
  const m = String(message || '').toLowerCase();
  return m.includes('model') && (m.includes('not found') || m.includes('retired') || m.includes('invalid') || m.includes('does not exist'));
}

/**
 * @param {object} opts
 * @param {string} opts.userContent
 * @param {number} [opts.maxTokens]
 * @param {string} [opts.system]
 */
async function createMessage({ userContent, maxTokens = 2048, system }) {
  const key = process.env.ANTHROPIC_API_KEY || '';
  if (!key) throw new Error('AI is not configured on the server. Add ANTHROPIC_API_KEY in Render.');

  const candidates = modelCandidates();
  let lastError = null;

  for (const model of candidates) {
    const body = {
      model,
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
    if (res.ok) {
      const text = data.content?.[0]?.text;
      if (!text) throw new Error('Empty response from Anthropic.');
      return text;
    }

    const msg = data?.error?.message || data?.message || `Anthropic API error (${res.status})`;
    lastError = new Error(msg);
    if (isModelError(msg) && model !== candidates[candidates.length - 1]) {
      console.warn(`Anthropic model ${model} unavailable, trying fallback…`);
      continue;
    }
    throw lastError;
  }

  throw lastError || new Error('Anthropic request failed.');
}

function stripJsonFence(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/```json|```/g, '')
    .trim();
}

/** Extract and parse JSON even when the model adds prose or truncates fences. */
function parseJsonFromText(text) {
  const cleaned = stripJsonFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Could not parse JSON from model response.');
  }
}

module.exports = { createMessage, stripJsonFence, parseJsonFromText, modelName };
