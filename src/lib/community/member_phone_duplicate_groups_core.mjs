export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_PHONE_DUPLICATE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_PHONE_DUPLICATE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let duplicateRowCount = 0;
  const phoneMap = new Map();
  const groups = [];
  let index = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let hasPhone = false;
      let phoneValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "phone") {
          hasPhone = true;
          phoneValue = entry[1];
        }
      }
      if (hasPhone === true && typeof phoneValue === "string" && phoneValue.length !== 0) {
        const existing = phoneMap.get(phoneValue);
        if (existing === undefined) {
          const fresh = [];
          fresh.push(index);
          phoneMap.set(phoneValue, fresh);
        } else {
          existing.push(index);
        }
      }
    }
    index += 1;
  }
  for (const list of phoneMap.values()) {
    if (list.length >= 2) {
      const copy = [];
      for (const item of list) {
        copy.push(item);
      }
      groups.push(copy);
      duplicateRowCount += copy.length;
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    groupCount: groups.length,
    duplicateRowCount: duplicateRowCount,
    groups: groups
  };
}
