import assert from 'node:assert/strict';
import { SqliteRepository } from '../src/services/sqliteRepository.ts';

type MemberRecord = {
  id: string;
  fullName: string;
  createdAt: string;
};

async function test() {
  const interactions: Array<{ method: string; tableName: string; payload?: unknown }> = [];
  const repo = new SqliteRepository<MemberRecord>('members');

  (global as any).window = {
    electronAPI: {
      sqliteGetAll: async (tableName: string) => {
        interactions.push({ method: 'getAll', tableName });
        return [{ id: 'm-1', fullName: 'Ana Souza', createdAt: '2026-04-04' }];
      },
      sqliteAdd: async (tableName: string, item: MemberRecord) => {
        interactions.push({ method: 'add', tableName, payload: item });
        return item.id;
      },
      sqliteUpdate: async (tableName: string, id: string, item: Partial<MemberRecord>) => {
        interactions.push({ method: 'update', tableName, payload: { id, item } });
        return true;
      },
      sqliteDelete: async (tableName: string, id: string) => {
        interactions.push({ method: 'delete', tableName, payload: id });
        return true;
      },
      sqliteClear: async (tableName: string) => {
        interactions.push({ method: 'clear', tableName });
        return true;
      },
    },
  };

  const items = await repo.getAll();
  assert.deepEqual(items, [{ id: 'm-1', fullName: 'Ana Souza', createdAt: '2026-04-04' }]);

  const id = await repo.add({ fullName: 'Carlos Lima', createdAt: '2026-04-04' });
  assert.ok(id);

  await repo.update(id, { fullName: 'Carlos Eduardo Lima' });
  await repo.delete(id);
  await repo.clear();

  const addCall = interactions.find((entry) => entry.method === 'add');
  assert.equal(addCall?.tableName, 'members');
  assert.equal((addCall?.payload as MemberRecord).fullName, 'Carlos Lima');
  assert.equal((addCall?.payload as MemberRecord).id, id);

  assert.deepEqual(
    interactions.map((entry) => entry.method),
    ['getAll', 'add', 'update', 'delete', 'clear'],
  );

  console.log('SQLite repository tests passed!');
}

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
