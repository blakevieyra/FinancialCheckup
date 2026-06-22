const isProd = process.env.NODE_ENV === 'production';

/** Return a client-safe error string; log full detail server-side only. */
function safeClientError(err, fallback = 'Server error.') {
  if (!isProd && err?.message) return err.message;
  return fallback;
}

module.exports = { safeClientError, isProd };
