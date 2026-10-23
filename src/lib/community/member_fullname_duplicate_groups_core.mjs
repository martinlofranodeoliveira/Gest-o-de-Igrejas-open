export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_FULLNAME_DUPLICATE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_FULLNAME_DUPLICATE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let duplicateRowCount = 0;
  let index = 0;
  let seen = new Map();
  let groups = [];
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
      continue;
    }
    if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
      continue;
    }
    if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
      continue;
    }
    validRowCount = validRowCount + 1;
    let fullNameValue = undefined;
    for (const entry of Object.entries(row)) {
      if (entry[0] === "fullName") {
        fullNameValue = entry[1];
      }
    }
    if (typeof fullNameValue !== "string") {
      index = index + 1;
      continue;
    }
    if (fullNameValue.length === 0) {
      index = index + 1;
      continue;
    }
    let current = seen.get(fullNameValue);
    if (current === undefined) {
      let fresh = [];
      fresh.push(index);
      seen.set(fullNameValue, fresh);
    } else {
      current.push(index);
    }
    index = index + 1;
  }
  for (const entry of seen) {
    if (entry[1].length >= 2) {
      let copy = [];
      for (const value of entry[1]) {
        copy.push(value);
      }
      groups.push(copy);
      duplicateRowCount = duplicateRowCount + entry[1].length;
    }
  }
  let groupCount = groups.length;
  let rowCount = validRowCount + invalidRowCount;
  return { rowCount: rowCount, invalidRowCount: invalidRowCount, validRowCount: validRowCount, groupCount: groupCount, duplicateRowCount: duplicateRowCount, groups: groups };
}
