const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUsername(username) {
  const u = String(username || '').trim();
  if (!u) return 'Username is required.';
  if (u.length < 3) return 'Username must be at least 3 characters.';
  if (u.length > 32) return 'Username must be 32 characters or fewer.';
  if (!USERNAME_RE.test(u)) return 'Username may only use letters, numbers, and underscores.';
  return null;
}

function validateEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return 'Email is required.';
  if (e.length > 254) return 'Email is too long.';
  if (!EMAIL_RE.test(e)) return 'Enter a valid email address.';
  return null;
}

function validatePassword(password) {
  const p = String(password || '');
  if (!p) return 'Password is required.';
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (p.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[a-zA-Z]/.test(p)) return 'Password must include at least one letter.';
  if (!/[0-9]/.test(p)) return 'Password must include at least one number.';
  return null;
}

function validateRegistration({ username, password, email }) {
  const errors = {};
  const u = validateUsername(username);
  const e = validateEmail(email);
  const p = validatePassword(password);
  if (u) errors.username = u;
  if (e) errors.email = e;
  if (p) errors.password = p;
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateLogin({ username, password }) {
  if (!String(username || '').trim()) return 'Username is required.';
  if (!String(password || '')) return 'Password is required.';
  return null;
}

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
  USERNAME_RE,
  EMAIL_RE,
};
