import assert from 'node:assert/strict';
import { SqliteAuthService } from '../src/services/sqliteAuthService.ts';

async function test() {
  let currentUser: unknown;

  (global as any).window = {
    electronAPI: {
      authLogin: async (email: string, password: string) => {
        assert.equal(email, 'admin@igreja.local');
        assert.equal(password, 'admin123');
        return { id: 'u-1', email, displayName: 'Administrador' };
      },
      authRegister: async (email: string, password: string, displayName: string) => {
        assert.equal(email, 'novo@igreja.local');
        assert.equal(password, '123456');
        assert.equal(displayName, 'Novo Operador');
        return { id: 'u-2', email, displayName };
      },
    },
  };

  const auth = new SqliteAuthService();
  const unsubscribe = auth.onAuthStateChanged((user) => {
    currentUser = user;
  });

  assert.equal(currentUser, null);

  const loggedUser = await auth.login('admin@igreja.local', 'admin123');
  assert.deepEqual(loggedUser, {
    uid: 'u-1',
    email: 'admin@igreja.local',
    displayName: 'Administrador',
  });
  assert.deepEqual(currentUser, loggedUser);

  const registeredUser = await auth.register('novo@igreja.local', '123456', 'Novo Operador');
  assert.deepEqual(registeredUser, {
    uid: 'u-2',
    email: 'novo@igreja.local',
    displayName: 'Novo Operador',
  });
  assert.deepEqual(currentUser, registeredUser);

  await auth.signOut();
  assert.equal(currentUser, null);

  unsubscribe();
  console.log('SQLite auth tests passed!');
}

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
