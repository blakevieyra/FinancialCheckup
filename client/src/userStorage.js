import { BLANK_SNAPSHOT } from './checkupConstants';

const LEGACY_EXTENDED_KEY = 'fc-checkup-extended';

export function extendedStorageKey(userId) {
  return userId ? `fc-checkup-extended:${userId}` : LEGACY_EXTENDED_KEY;
}

export function loadExtendedProfile(userId, isGuest) {
  if (isGuest) {
    try {
      const saved = localStorage.getItem(LEGACY_EXTENDED_KEY);
      return saved ? { ...BLANK_SNAPSHOT, ...JSON.parse(saved) } : { ...BLANK_SNAPSHOT };
    } catch {
      return { ...BLANK_SNAPSHOT };
    }
  }
  if (!userId) return { ...BLANK_SNAPSHOT };
  try {
    const saved = localStorage.getItem(extendedStorageKey(userId));
    return saved ? { ...BLANK_SNAPSHOT, ...JSON.parse(saved) } : { ...BLANK_SNAPSHOT };
  } catch {
    return { ...BLANK_SNAPSHOT };
  }
}

export function saveExtendedProfile(userId, data) {
  if (!userId) return;
  try {
    localStorage.setItem(extendedStorageKey(userId), JSON.stringify(data));
  } catch {
    /** ignore */
  }
}

/** Clear guest/demo state when signing in or out. */
export function clearCrossUserSessionState() {
  try {
    localStorage.removeItem(LEGACY_EXTENDED_KEY);
    localStorage.removeItem('fc-tips-email');
  } catch {
    /** ignore */
  }
}

export function persistAuthSession({ token, username, userId }) {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  if (userId != null) localStorage.setItem('fc-user-id', String(userId));
}

export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('fc-user-id');
}

export function getStoredUserId() {
  const v = localStorage.getItem('fc-user-id');
  return v ? Number(v) : null;
}
