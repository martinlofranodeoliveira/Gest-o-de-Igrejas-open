export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_AMOUNT_DUPLICATE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_AMOUNT_DUPLICATE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let duplicateRowCount = 0;
  let index = 0;
  const byAmount = new Map();
  const groups = [];
  for (const row of payload) {
    if (row === null) {
      invalidRowCount += 1;
    } else {
      if (typeof row !== "object") {
        invalidRowCount += 1;
      } else {
        if (Array.isArray(row) === true) {
          invalidRowCount += 1;
        } else {
          validRowCount += 1;
          let seen = false;
          let kept = 0;
          for (const entry of Object.entries(row)) {
            if (entry[0] === "amount") {
              if (typeof entry[1] === "number") {
                seen = true;
                kept = entry[1];
              }
            }
          }
          if (seen === true) {
            if (byAmount.get(kept) === undefined) {
              const fresh = [];
              fresh.push(index);
              byAmount.set(kept, fresh);
            } else {
              const found = byAmount.get(kept);
              found.push(index);
            }
          }
        }
      }
    }
    index += 1;
  }
  for (const listed of byAmount.values()) {
    if (listed.length > 1) {
      const fresh = [];
      for (const at of listed) {
        fresh.push(at);
      }
      groups.push(fresh);
      duplicateRowCount += listed.length;
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
