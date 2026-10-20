const assert = require('node:assert/strict');
const {
  normalizeSqlitePayload,
  normalizeSqliteValue,
} = require('../electron/sqlite-payload.cjs');

assert.equal(normalizeSqliteValue(true), 1);
assert.equal(normalizeSqliteValue(false), 0);
assert.equal(normalizeSqliteValue(undefined), null);
assert.equal(normalizeSqliteValue('Ativo'), 'Ativo');
assert.equal(normalizeSqliteValue(25), 25);

assert.deepEqual(
  normalizeSqlitePayload({
    fullName: 'Maria Souza',
    isTither: false,
    active: true,
    notes: undefined,
    createdAt: '2026-04-04',
  }),
  {
    fullName: 'Maria Souza',
    isTither: 0,
    active: 1,
    notes: null,
    createdAt: '2026-04-04',
  },
);

console.log('SQLite payload normalization tests passed!');
