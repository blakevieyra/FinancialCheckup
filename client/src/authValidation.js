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

export function validateRegisterForm({ username, email, password, acceptedTerms }) {
  const usernameErr = validateUsername(username);
  const emailErr = validateEmail(email);
  const passwordErr = validatePassword(password);
  const termsErr = acceptedTerms ? '' : 'You must agree to the Terms of Use and Privacy Policy.';
  return {
    username: usernameErr,
    email: emailErr,
    password: passwordErr,
    terms: termsErr,
    valid: !usernameErr && !emailErr && !passwordErr && !termsErr,
  };
}

export function validateResetIdentifier(identifier) {
  const v = String(identifier || '').trim();
  if (!v) return 'Enter your email or username.';
  if (v.includes('@')) return validateEmail(v);
  if (v.length < 3) return 'Username must be at least 3 characters.';
  return '';
}

export function validateResetPasswordForm({ code, password, passwordConfirm }) {
  const codeErr = String(code || '').replace(/\D/g, '').length === 6 ? '' : 'Enter the 6-digit code from your email.';
  const passwordErr = validatePassword(password);
  let confirmErr = '';
  if (!passwordConfirm) confirmErr = 'Confirm your new password.';
  else if (password !== passwordConfirm) confirmErr = 'Passwords do not match.';
  return {
    code: codeErr,
    password: passwordErr,
    passwordConfirm: confirmErr,
    valid: !codeErr && !passwordErr && !confirmErr,
  };
}
