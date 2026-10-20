import assert from 'node:assert/strict';
import { LocalStorageAuthService } from '../src/services/localStorageAuthService.ts';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
} });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  locks: { request: async (_name: string, save: () => unknown) => save() },
} });

async function main() {
  // Data from the private edition is never imported as an account or session.
  data.set('mockUsers', JSON.stringify([{ uid: 'legacy-demo', password: 'synthetic legacy fixture' }]));
  data.set('mockUser', JSON.stringify({ uid: 'legacy-demo' }));
  const auth = new LocalStorageAuthService();
  let current: unknown = 'unset';
  auth.onAuthStateChanged(user => { current = user; });
  assert.equal(current, null);
  assert.equal(await auth.hasUsers(), false);
  const password = 'synthetic browser owner passphrase';
  assert.equal(await auth.register('invalid', password, 'Owner'), null);
  assert.equal(await auth.register('owner@example.com', 'short', 'Owner'), null);
  assert.equal(await auth.register('owner@example.com', password, ' '), null);
  assert.equal(await auth.hasUsers(), false);
  const owners = await Promise.all([
    auth.register('Owner@Example.com ', password, ' Synthetic Owner '),
    auth.register('second@example.com', password, 'Other Owner'),
  ]);
  assert.equal(owners.filter(Boolean).length, 1);
  const owner = owners.find(Boolean)!;
  assert.deepEqual(Object.keys(owner).sort(), ['displayName', 'email', 'uid']);
  const raw = data.get('gestao-igrejas-open.users.v1')!;
  assert.equal(raw.includes(password), false);
  const saved = JSON.parse(raw);
  assert.equal(saved.length, 1);
  assert.match(saved[0].passwordHash, /^pbkdf2-sha256\$210000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  assert.equal(await auth.register('third@example.com', password, 'Third Owner'), null);
  await auth.signOut();
  assert.equal(current, null);
  assert.equal(await auth.login(owner.email!, 'wrong synthetic password'), null);
  assert.deepEqual(await auth.login(owner.email!.toUpperCase(), password), owner);
  assert.deepEqual(current, owner);
  const reloaded = new LocalStorageAuthService();
  assert.equal(await reloaded.hasUsers(), true);
  data.set('gestao-igrejas-open.users.v1', '{invalid');
  await assert.rejects(reloaded.hasUsers());
  await assert.rejects(reloaded.register('reset@example.com', password, 'No Reset'));
  data.set('gestao-igrejas-open.users.v1', '');
  await assert.rejects(reloaded.hasUsers());
  await assert.rejects(reloaded.register('reset@example.com', password, 'No Reset'));
  assert.equal(data.get('gestao-igrejas-open.users.v1'), '');
  console.log('Browser first-account tests passed (synthetic storage only).');
}
main().catch(error => { console.error(error); process.exit(1); });
