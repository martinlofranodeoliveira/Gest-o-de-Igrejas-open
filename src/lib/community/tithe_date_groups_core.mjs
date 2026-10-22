export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_DATE_GROUPS_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_DATE_GROUPS_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let groupedRowCount = 0;
  const byKey = new Map();
  const groups = [];
  let index = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "contributionDate") {
          if (typeof entry[1] === "string") {
            if (entry[1].length === 0) {
            } else {
              const found = byKey.get(entry[1]);
              if (found === undefined) {
                const fresh = [];
                fresh.push(index);
                byKey.set(entry[1], fresh);
              } else {
                found.push(index);
              }
            }
          }
        }
      }
    }
    index = index + 1;
  }
  for (const entry of byKey) {
    if (entry[1].length > 1) {
      const copy = [];
      for (const kept of entry[1]) {
        copy.push(kept);
      }
      groups.push(copy);
      groupedRowCount = groupedRowCount + copy.length;
    }
  }
  const groupCount = groups.length;
  const rowCount = validRowCount + invalidRowCount;
  return { rowCount: rowCount, invalidRowCount: invalidRowCount, validRowCount: validRowCount, groupCount: groupCount, groupedRowCount: groupedRowCount, groups: groups };
}
