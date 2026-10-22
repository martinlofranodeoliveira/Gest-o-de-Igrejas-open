export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_TITHER_SUMMARY_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_TITHER_SUMMARY_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let titherTrueCount = 0;
  let titherFalseCount = 0;
  let titherMissingCount = 0;
  let titherUnknownCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasIsTither = false;
      let isTrue = false;
      let isFalse = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "isTither") {
          if (entry[1] === true) {
            hasIsTither = true;
            isTrue = true;
          } else if (entry[1] === false) {
            hasIsTither = true;
            isFalse = true;
          } else {
            hasIsTither = true;
          }
        }
      }
      if (hasIsTither === false) {
        titherMissingCount = titherMissingCount + 1;
      } else if (isTrue === true) {
        titherTrueCount = titherTrueCount + 1;
      } else if (isFalse === true) {
        titherFalseCount = titherFalseCount + 1;
      } else {
        titherUnknownCount = titherUnknownCount + 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    titherTrueCount: titherTrueCount,
    titherFalseCount: titherFalseCount,
    titherMissingCount: titherMissingCount,
    titherUnknownCount: titherUnknownCount
  };
}
