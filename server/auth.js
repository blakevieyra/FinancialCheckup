const jwt = require('jsonwebtoken');
const { dbGet } = require('./db');
const { getTokenFromRequest, clearAuthCookie } = require('./authCookies');

const SECRET = process.env.JWT_SECRET || 'fc-dev-jwt-secret-change-in-prod';

const signOpts = { expiresIn: '7d', algorithm: 'HS512' };
const verifyOpts = { algorithms: ['HS512'] };

const signToken = (payload) => jwt.sign(payload, SECRET, signOpts);

/**
 * Verify the JWT (httpOnly cookie or Authorization: Bearer), then confirm the
 * user still exists in the database.
 */
async function verifyToken(req, res, next) {
  const raw = getTokenFromRequest(req);
  if (!raw) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = jwt.verify(raw, SECRET, verifyOpts);
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Token invalid or expired' });
  }

  try {
    const exists = await dbGet('SELECT id FROM users WHERE id = ?', [payload.id]);
    if (!exists) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Account no longer exists. Please sign in again.' });
    }
  } catch (err) {
    console.error('verifyToken DB lookup failed:', err.message);
    return res.status(500).json({ error: 'Auth check failed.' });
  }

  req.user = payload;
  next();
}

/**
 * Resolve session from cookie or Bearer without failing the request.
 * @returns {Promise<{invalid:true}|null|{id,username,email,emailVerified}>}
 */
async function resolveSession(req) {
  const raw = getTokenFromRequest(req);
  if (!raw) return null;

  let payload;
  try {
    payload = jwt.verify(raw, SECRET, verifyOpts);
  } catch {
    return { invalid: true };
  }

  try {
    const user = await dbGet(
      'SELECT id, username, email, email_verified FROM users WHERE id = ?',
      [payload.id],
    );
    if (!user) return { invalid: true };
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: Boolean(user.email_verified),
    };
  } catch (err) {
    console.error('resolveSession DB lookup failed:', err.message);
    return { invalid: true };
  }
}

module.exports = { signToken, verifyToken, resolveSession };
