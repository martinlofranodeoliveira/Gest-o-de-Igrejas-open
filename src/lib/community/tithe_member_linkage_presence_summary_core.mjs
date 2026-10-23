export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_LINKAGE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_MEMBER_LINKAGE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let memberIdMissingCount = 0;
  let memberIdEmptyCount = 0;
  let memberIdPresentCount = 0;
  let memberIdUnknownCount = 0;
  let memberNameMissingCount = 0;
  let memberNameEmptyCount = 0;
  let memberNamePresentCount = 0;
  let memberNameUnknownCount = 0;
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
          let memberIdFound = false;
          let memberNameFound = false;
          for (const entry of Object.entries(row)) {
            if (entry[0] === "memberId") {
              memberIdFound = true;
              if (typeof entry[1] !== "string") {
                memberIdUnknownCount += 1;
              } else {
                if (entry[1].length === 0) {
                  memberIdEmptyCount += 1;
                } else {
                  memberIdPresentCount += 1;
                }
              }
            }
            if (entry[0] === "memberName") {
              memberNameFound = true;
              if (typeof entry[1] !== "string") {
                memberNameUnknownCount += 1;
              } else {
                if (entry[1].length === 0) {
                  memberNameEmptyCount += 1;
                } else {
                  memberNamePresentCount += 1;
                }
              }
            }
          }
          if (memberIdFound === false) {
            memberIdMissingCount += 1;
          }
          if (memberNameFound === false) {
            memberNameMissingCount += 1;
          }
        }
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    memberIdMissingCount: memberIdMissingCount,
    memberIdEmptyCount: memberIdEmptyCount,
    memberIdPresentCount: memberIdPresentCount,
    memberIdUnknownCount: memberIdUnknownCount,
    memberNameMissingCount: memberNameMissingCount,
    memberNameEmptyCount: memberNameEmptyCount,
    memberNamePresentCount: memberNamePresentCount,
    memberNameUnknownCount: memberNameUnknownCount
  };
}
