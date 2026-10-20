import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Synthetic offline regression tests for strict ISO calendar validation.
// No real member data, no network, no storage.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.join(__dirname, '..', 'src', 'lib', 'dataFormat.ts');

function loadFormatUtils() {
  let source = fs.readFileSync(sourcePath, 'utf8');
  source = source.replace(/export\s+function/g, 'function');
  source = source.replace(/:\s*Date\s*\|\s*null/g, '');
  source = source.replace(/:\s*unknown/g, '');
  source = source.replace(/:\s*number/g, '');
  source = source.replace(/:\s*string/g, '');
  const factory = new Function(
    `${source}; return { normalizeDateValue, toDate, formatDateLabel, getMonthKey, isBirthdayThisMonth, isDateInCurrentMonth, normalizeCurrencyNumber };`
  );
  return factory();
}

const {
  normalizeDateValue,
  toDate,
  formatDateLabel,
  getMonthKey,
  isBirthdayThisMonth,
  isDateInCurrentMonth,
  normalizeCurrencyNumber,
} = loadFormatUtils();

describe('strict ISO calendar dates without month roll-over', () => {
  it('rejects impossible YYYY-MM-DD dates', () => {
    assert.equal(normalizeDateValue('2023-02-30'), '');
    assert.equal(normalizeDateValue('2023-02-29'), '');
    assert.equal(normalizeDateValue('2023-04-31'), '');
    assert.equal(normalizeDateValue('2023-06-31'), '');
    assert.equal(normalizeDateValue('2023-13-01'), '');
    assert.equal(normalizeDateValue('2023-00-10'), '');
    assert.equal(normalizeDateValue('2023-01-32'), '');
  });

  it('rejects impossible ISO datetime prefixes', () => {
    assert.equal(normalizeDateValue('2023-02-30T10:00:00'), '');
    assert.equal(normalizeDateValue('2023-04-31T23:59:59'), '');
    assert.equal(normalizeDateValue('2023-02-30 10:00:00'), '');
    assert.equal(normalizeDateValue('2023-02-29T00:00:00.000Z'), '');
  });

  it('accepts valid leap-year and ordinary ISO dates', () => {
    assert.equal(normalizeDateValue('2024-02-29'), '2024-02-29');
    assert.equal(normalizeDateValue('2024-02-29T15:30:00'), '2024-02-29');
    assert.equal(normalizeDateValue('2023-02-28'), '2023-02-28');
    assert.equal(normalizeDateValue('2023-12-31'), '2023-12-31');
    assert.equal(normalizeDateValue('2023-04-30'), '2023-04-30');
  });

  it('keeps existing Brazilian DD/MM/YYYY and DD-MM-YYYY validation', () => {
    assert.equal(normalizeDateValue('29/02/2024'), '2024-02-29');
    assert.equal(normalizeDateValue('28/02/2023'), '2023-02-28');
    assert.equal(normalizeDateValue('30/02/2023'), '');
    assert.equal(normalizeDateValue('31/04/2023'), '');
    assert.equal(normalizeDateValue('15-08-2023'), '2023-08-15');
    assert.equal(normalizeDateValue('31-04-2023'), '');
  });

  it('maps invalid dates to null, empty month, -- and false without roll-over', () => {
    assert.equal(toDate('2023-02-30'), null);
    assert.equal(toDate('2023-02-30T10:00:00'), null);
    assert.equal(getMonthKey('2023-02-30'), '');
    assert.equal(getMonthKey('2023-04-31T08:00:00'), '');
    assert.equal(formatDateLabel('2023-02-30'), '--');
    assert.equal(formatDateLabel('not-a-date'), '--');
    // Feb 30 rolled over would land in March; it must stay false in March.
    assert.equal(isBirthdayThisMonth('2023-02-30', new Date(2023, 2, 10)), false);
    assert.equal(isBirthdayThisMonth('2023-02-30', new Date(2023, 1, 10)), false);
    assert.equal(isDateInCurrentMonth('2023-02-30', new Date(2023, 2, 10)), false);
  });

  it('keeps valid date helpers working', () => {
    const leap = toDate('2024-02-29');
    assert.ok(leap instanceof Date);
    assert.equal(getMonthKey('2024-02-29'), '2024-02');
    assert.notEqual(formatDateLabel('2024-02-29'), '--');
    assert.equal(isBirthdayThisMonth('2024-02-29', new Date(2024, 1, 10)), true);
    assert.equal(isBirthdayThisMonth('2024-02-29', new Date(2024, 2, 10)), false);
    assert.equal(getMonthKey('15/08/2023'), '2023-08');
    // Currency helper untouched.
    assert.equal(normalizeCurrencyNumber('1.234,56'), 1234.56);
  });
});
