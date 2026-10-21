export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_EMAIL_DUPLICATE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_EMAIL_DUPLICATE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let index = 0;
  const byEmail = new Map();
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
      index = index + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasEmail = false;
      let emailValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "email") {
          hasEmail = true;
          emailValue = entry[1];
        }
      }
      if (hasEmail === true) {
        if (typeof emailValue === "string") {
          if (emailValue.length !== 0) {
            const existing = byEmail.get(emailValue);
            if (existing === undefined) {
              const fresh = [];
              fresh.push(index);
              byEmail.set(emailValue, fresh);
            } else {
              existing.push(index);
            }
          }
        }
      }
      index = index + 1;
    }
  }
  const groups = [];
  let duplicateRowCount = 0;
  for (const list of byEmail.values()) {
    if (list.length >= 2) {
      const copy = [];
      for (const item of list) {
        copy.push(item);
      }
      groups.push(copy);
      duplicateRowCount = duplicateRowCount + list.length;
    }
  }
  const rowCount = validRowCount + invalidRowCount;
  const groupCount = groups.length;
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    groupCount: groupCount,
    duplicateRowCount: duplicateRowCount,
    groups: groups
  };
}
