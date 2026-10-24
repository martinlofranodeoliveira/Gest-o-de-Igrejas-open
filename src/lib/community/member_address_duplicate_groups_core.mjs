export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_ADDRESS_DUPLICATE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_ADDRESS_DUPLICATE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let duplicateRowCount = 0;
  let index = 0;
  const byAddress = new Map();
  const groups = [];
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
      continue;
    }
    validRowCount = validRowCount + 1;
    let found = undefined;
    let hasAddress = false;
    for (const entry of Object.entries(row)) {
      if (entry[0] === "address") {
        hasAddress = true;
        if (typeof entry[1] === "string") {
          if (entry[1].length === 0) {
          } else {
            found = entry[1];
          }
        }
      }
    }
    if (hasAddress === true) {
      if (found !== undefined) {
        const existing = byAddress.get(found);
        if (existing === undefined) {
          const fresh = [];
          fresh.push(index);
          byAddress.set(found, fresh);
        } else {
          existing.push(index);
        }
      }
    }
    index = index + 1;
  }
  for (const list of byAddress.values()) {
    if (list.length >= 2) {
      const out = [];
      for (const v of list) {
        out.push(v);
      }
      groups.push(out);
      duplicateRowCount = duplicateRowCount + list.length;
    }
  }
  const groupCount = groups.length;
  const rowCount = validRowCount + invalidRowCount;
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    groupCount: groupCount,
    duplicateRowCount: duplicateRowCount,
    groups: groups
  };
}
