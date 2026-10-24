export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_FULLNAME_SHAPE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_FULLNAME_SHAPE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let fullNameValidCount = 0;
  let fullNameEmptyCount = 0;
  let fullNameMissingCount = 0;
  let fullNameTooLongCount = 0;
  let fullNameInvalidCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasFullName = false;
      let kindInvalid = false;
      let kindEmpty = false;
      let kindTooLong = false;
      let kindValid = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "fullName") {
          hasFullName = true;
          if (typeof entry[1] !== "string") {
            kindInvalid = true;
          } else if (entry[1].length === 0) {
            kindEmpty = true;
          } else if (entry[1].length > 120) {
            kindTooLong = true;
          } else {
            kindValid = true;
          }
        }
      }
      if (hasFullName === false) {
        fullNameMissingCount = fullNameMissingCount + 1;
      } else if (kindInvalid === true) {
        fullNameInvalidCount = fullNameInvalidCount + 1;
      } else if (kindEmpty === true) {
        fullNameEmptyCount = fullNameEmptyCount + 1;
      } else if (kindTooLong === true) {
        fullNameTooLongCount = fullNameTooLongCount + 1;
      } else if (kindValid === true) {
        fullNameValidCount = fullNameValidCount + 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    fullNameValidCount: fullNameValidCount,
    fullNameEmptyCount: fullNameEmptyCount,
    fullNameMissingCount: fullNameMissingCount,
    fullNameTooLongCount: fullNameTooLongCount,
    fullNameInvalidCount: fullNameInvalidCount
  };
}
