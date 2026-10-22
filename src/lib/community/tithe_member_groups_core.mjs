export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_GROUPS_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_MEMBER_GROUPS_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  const byMember = new Map();
  let index = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let memberValue = undefined;
      let seenMember = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "memberId") {
          memberValue = entry[1];
          seenMember = true;
        }
      }
      if (seenMember === true) {
        if (typeof memberValue === "string") {
          if (memberValue.length !== 0) {
            const current = byMember.get(memberValue);
            if (current === undefined) {
              const fresh = [];
              fresh.push(index);
              byMember.set(memberValue, fresh);
            } else {
              current.push(index);
            }
          }
        }
      }
    }
    index = index + 1;
  }
  const groups = [];
  let groupedRowCount = 0;
  for (const stored of byMember.values()) {
    if (stored.length >= 2) {
      const copy = [];
      for (const one of stored) {
        copy.push(one);
      }
      groups.push(copy);
      groupedRowCount = groupedRowCount + copy.length;
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    groupCount: groups.length,
    groupedRowCount: groupedRowCount,
    groups: groups
  };
}
