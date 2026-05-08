const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'fc-dev-jwt-secret-change-in-prod';

const signOpts = { expiresIn: '7d', algorithm: 'HS512' };
const verifyOpts = { algorithms: ['HS512'] };

const signToken = (payload) => jwt.sign(payload, SECRET, signOpts);

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), SECRET, verifyOpts);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
};

module.exports = { signToken, verifyToken };
