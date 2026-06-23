const COOKIE_NAME = 'fc_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  };
}

function setAuthCookie(res, jwt) {
  res.cookie(COOKIE_NAME, jwt, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

function getTokenFromRequest(req) {
  const fromCookie = req.cookies?.[COOKIE_NAME];
  if (fromCookie) return fromCookie;

  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);

  return null;
}

module.exports = {
  COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
};
