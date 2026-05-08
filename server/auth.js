const jwt = require('jsonwebtoken');
const { dbGet } = require('./db');

const SECRET = process.env.JWT_SECRET || 'fc-dev-jwt-secret-change-in-prod';

const signOpts = { expiresIn: '7d', algorithm: 'HS512' };
const verifyOpts = { algorithms: ['HS512'] };

const signToken = (payload) => jwt.sign(payload, SECRET, signOpts);

/**
 * Verify the JWT, then confirm the user still exists in the database.
 * After a database migration / wipe a still-valid JWT must NOT authenticate
 * a non-existent user_id — that's the bug that caused empty-payload "ghost
 * sessions" against the live API.
 */
async function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = jwt.verify(auth.slice(7), SECRET, verifyOpts);
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }

  try {
    const exists = await dbGet('SELECT id FROM users WHERE id = ?', [payload.id]);
    if (!exists) {
      return res.status(401).json({ error: 'Account no longer exists. Please sign in again.' });
    }
  } catch (err) {
    console.error('verifyToken DB lookup failed:', err.message);
    return res.status(500).json({ error: 'Auth check failed.' });
  }

  req.user = payload;
  next();
}

module.exports = { signToken, verifyToken };
