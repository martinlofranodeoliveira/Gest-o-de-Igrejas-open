function normalizeSqliteValue(value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value === undefined) {
    return null;
  }

  return value;
}

function normalizeSqlitePayload(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, normalizeSqliteValue(value)]),
  );
}

module.exports = {
  normalizeSqlitePayload,
  normalizeSqliteValue,
};
