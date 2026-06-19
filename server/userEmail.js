const { dbGet } = require('./db');

async function getUserContact(userId) {
  const row = await dbGet(
    `SELECT u.id, u.username, u.email, u.email_verified, u.account_status,
            p.digest_email
     FROM users u
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId],
  );
  if (!row) return null;
  const email = (row.email || row.digest_email || '').trim().toLowerCase() || null;
  return {
    userId: row.id,
    username: row.username,
    email,
    emailVerified: Boolean(row.email_verified),
    accountStatus: row.account_status || 'active',
  };
}

module.exports = { getUserContact };
