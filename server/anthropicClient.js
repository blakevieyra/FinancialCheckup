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

/** Remove trailing commas and other common model JSON mistakes. */
function sanitizeJsonText(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\r\n/g, '\n');
}

/** Close truncated JSON when the model hits max_tokens mid-response. */
function repairTruncatedJson(text) {
  let s = sanitizeJsonText(text);
  const stack = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') {
      if (stack.length && stack[stack.length - 1] === c) stack.pop();
    }
  }

  if (inString) s += '"';

  // Drop trailing incomplete array/object element (common truncation site).
  s = s.replace(/,\s*"[^"]*"?\s*:?\s*("[^"]*)?$/, '');
  s = s.replace(/,\s*\{[^}]*$/, '');
  s = s.replace(/,\s*\[[^\]]*$/, '');
  s = s.replace(/,\s*$/, '');

  while (stack.length) s += stack.pop();
  return s;
}

/** Extract and parse JSON even when the model adds prose, truncates, or minor syntax errors. */
function parseJsonFromText(text) {
  const cleaned = sanitizeJsonText(stripJsonFence(text));
  const candidates = [cleaned];

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    candidates.push(cleaned.slice(start, end + 1));
  }
  candidates.push(repairTruncatedJson(cleaned));
  if (start >= 0 && end > start) {
    candidates.push(repairTruncatedJson(cleaned.slice(start, end + 1)));
  }

  let lastErr = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastErr = err;
    }
  }

  const msg = lastErr?.message || 'Could not parse JSON from model response.';
  throw new Error(msg.includes('JSON') ? msg : `Could not parse JSON from model response: ${msg}`);
}

module.exports = { createMessage, stripJsonFence, parseJsonFromText, modelName };
