export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_PHONE_SHAPE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_PHONE_SHAPE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let phoneValidCount = 0;
  let phoneEmptyCount = 0;
  let phoneMissingCount = 0;
  let phoneTooLongCount = 0;
  let phoneInvalidCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasPhone = false;
      let phoneValue = "";
      let phoneNonString = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "phone") {
          hasPhone = true;
          if (typeof entry[1] === "string") {
            phoneValue = entry[1];
          } else {
            phoneNonString = true;
          }
        }
      }
      if (hasPhone === false) {
        phoneMissingCount = phoneMissingCount + 1;
      } else if (phoneNonString === true) {
        phoneInvalidCount = phoneInvalidCount + 1;
      } else if (phoneValue.length === 0) {
        phoneEmptyCount = phoneEmptyCount + 1;
      } else if (phoneValue.length > 40) {
        phoneTooLongCount = phoneTooLongCount + 1;
      } else {
        phoneValidCount = phoneValidCount + 1;
      }
    }
  }
  let rowCount = validRowCount + invalidRowCount;
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    phoneValidCount: phoneValidCount,
    phoneEmptyCount: phoneEmptyCount,
    phoneMissingCount: phoneMissingCount,
    phoneTooLongCount: phoneTooLongCount,
    phoneInvalidCount: phoneInvalidCount
  };
}
