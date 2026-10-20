const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { createLocalAuth } = require('../electron/auth.cjs');

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, displayName TEXT, role TEXT)');
  t.after(() => db.close());
  return { db, auth: createLocalAuth(db) };
}

const password = 'synthetic first-owner passphrase';

test('new database remains empty until the owner registers', t => {
  const { db, auth } = fixture(t);
  assert.equal(auth.hasUsers(), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
  assert.equal(auth.login('missing@example.com', password), null);
});

test('creates exactly one owner, stores a salted derivative and returns public fields', t => {
  const { db, auth } = fixture(t);
  const owner = auth.register(' Owner@Example.com ', password, ' Synthetic Owner ');
  assert.deepEqual(Object.keys(owner).sort(), ['displayName', 'email', 'id']);
  assert.equal(owner.email, 'owner@example.com');
  assert.equal(owner.displayName, 'Synthetic Owner');
  assert.equal(auth.hasUsers(), true);
  const stored = db.prepare('SELECT * FROM users').get();
  assert.equal(stored.role, 'admin');
  assert.match(stored.password, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.equal(stored.password.includes(password), false);
  assert.deepEqual(auth.login(' OWNER@example.com ', password), owner);
  assert.equal(auth.login(owner.email, 'wrong synthetic password'), null);
  assert.equal(auth.register('other@example.com', password, 'Another Owner'), null);
  assert.equal(auth.register(owner.email, password, 'Replacement'), null);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
});

test('rejects malformed setup without adding users', t => {
  const { auth } = fixture(t);
  for (const args of [
    ['invalid', password, 'Name'], [null, password, 'Name'],
    ['owner@example.com', null, 'Name'], ['owner@example.com', 'short', 'Name'],
    ['owner@example.com', 'x'.repeat(129), 'Name'], ['owner@example.com', password, ' '],
    ['owner@example.com', password, 'x'.repeat(81)],
  ]) assert.equal(auth.register(...args), null);
  assert.equal(auth.hasUsers(), false);
});

test('uses independent salts and does not accept plaintext or malformed stored credentials', t => {
  const first = fixture(t);
  const second = fixture(t);
  first.auth.register('owner@example.com', password, 'Owner');
  second.auth.register('owner@example.com', password, 'Owner');
  const stored = db => db.prepare('SELECT password FROM users').get().password;
  assert.notEqual(stored(first.db), stored(second.db));
  for (const value of [password, '', 'scrypt$invalid']) {
    first.db.prepare('UPDATE users SET password = ?').run(value);
    assert.equal(first.auth.login('owner@example.com', password), null);
  }
});
