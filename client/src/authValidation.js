const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(username) {
  const u = String(username || '').trim();
  if (!u) return 'Username is required.';
  if (!USERNAME_RE.test(u)) return '3–32 characters: letters, numbers, underscores only.';
  return '';
}

export function validateEmail(email) {
  const e = String(email || '').trim();
  if (!e) return 'Email is required.';
  if (!EMAIL_RE.test(e)) return 'Enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  const p = String(password || '');
  if (p.length < 8) return 'At least 8 characters.';
  if (!/[a-zA-Z]/.test(p)) return 'Include at least one letter.';
  if (!/[0-9]/.test(p)) return 'Include at least one number.';
  return '';
}

export function validateRegisterForm({ username, email, password }) {
  const usernameErr = validateUsername(username);
  const emailErr = validateEmail(email);
  const passwordErr = validatePassword(password);
  return {
    username: usernameErr,
    email: emailErr,
    password: passwordErr,
    valid: !usernameErr && !emailErr && !passwordErr,
  };
}
