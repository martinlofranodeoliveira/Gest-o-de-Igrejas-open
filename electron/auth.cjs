const crypto = require('node:crypto');

function normalizeAccount(email, password, displayName) {
  if (typeof email !== 'string' || typeof password !== 'string' ||
      typeof displayName !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();
  const name = displayName.trim();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !name || name.length > 80 || password.length < 12 || password.length > 128) return null;
  return { email: normalizedEmail, password, displayName: name };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${key}`;
}

function matchesPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128 ||
      typeof encoded !== 'string' || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded)) return false;
  const [, salt, key] = encoded.split('$');
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(key, 'hex'));
}

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

function createLocalAuth(db) {
  return {
    hasUsers: () => db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0,
    register(email, password, displayName) {
      const account = normalizeAccount(email, password, displayName);
      if (!account) return null;
      const user = { id: crypto.randomUUID(), ...account };
      // One SQL statement makes the first-owner check and insert atomic.
      const result = db.prepare(`INSERT INTO users (id, email, password, displayName, role)
        SELECT ?, ?, ?, ?, 'admin' WHERE NOT EXISTS (SELECT 1 FROM users)`)
        .run(user.id, user.email, hashPassword(user.password), user.displayName);
      return result.changes === 1 ? publicUser(user) : null;
    },
    login(email, password) {
      if (typeof email !== 'string' || email.length > 254) return null;
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
      return user && matchesPassword(password, user.password) ? publicUser(user) : null;
    },
  };
}

module.exports = { createLocalAuth };
