import assert from 'node:assert/strict';
import {
  formatDateLabel,
  getMonthKey,
  isBirthdayThisMonth,
  isDateInCurrentMonth,
  normalizeCurrencyNumber,
  normalizeDateValue,
} from '../src/lib/dataFormat.ts';

assert.equal(normalizeDateValue('2026-04-04'), '2026-04-04');
assert.equal(normalizeDateValue('2026-04-04T15:30:00.000Z'), '2026-04-04');
assert.equal(normalizeDateValue('04/04/2026'), '2026-04-04');
assert.equal(normalizeDateValue('4-4-2026'), '2026-04-04');
assert.equal(normalizeDateValue(''), '');
assert.equal(normalizeDateValue('data invalida'), '');

assert.equal(formatDateLabel('04/04/2026'), '04 de abr. de 2026');
assert.equal(getMonthKey('04/04/2026'), '2026-04');
assert.equal(
  isDateInCurrentMonth('04/04/2026', new Date('2026-04-15T00:00:00')),
  true,
);
assert.equal(
  isBirthdayThisMonth('04/04/1990', new Date('2026-04-15T00:00:00')),
  true,
);

assert.equal(normalizeCurrencyNumber(10.5), 10.5);
assert.equal(normalizeCurrencyNumber('10,50'), 10.5);
assert.equal(normalizeCurrencyNumber('1.234,56'), 1234.56);
assert.equal(normalizeCurrencyNumber('1234.56'), 1234.56);
assert.equal(normalizeCurrencyNumber('valor invalido'), 0);

console.log('Data format tests passed!');
