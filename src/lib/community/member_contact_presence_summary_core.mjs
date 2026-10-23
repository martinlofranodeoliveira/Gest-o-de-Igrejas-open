export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_CONTACT_PRESENCE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_CONTACT_PRESENCE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let emailMissingCount = 0;
  let emailEmptyCount = 0;
  let emailPresentCount = 0;
  let emailUnknownCount = 0;
  let phoneMissingCount = 0;
  let phoneEmptyCount = 0;
  let phonePresentCount = 0;
  let phoneUnknownCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
      continue;
    }
    if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
      continue;
    }
    if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
      continue;
    }
    validRowCount = validRowCount + 1;
    let emailFound = false;
    let phoneFound = false;
    for (const entry of Object.entries(row)) {
      if (entry[0] === "email") {
        emailFound = true;
        if (typeof entry[1] !== "string") {
          emailUnknownCount = emailUnknownCount + 1;
        } else {
          if (entry[1].length === 0) {
            emailEmptyCount = emailEmptyCount + 1;
          } else {
            emailPresentCount = emailPresentCount + 1;
          }
        }
      }
      if (entry[0] === "phone") {
        phoneFound = true;
        if (typeof entry[1] !== "string") {
          phoneUnknownCount = phoneUnknownCount + 1;
        } else {
          if (entry[1].length === 0) {
            phoneEmptyCount = phoneEmptyCount + 1;
          } else {
            phonePresentCount = phonePresentCount + 1;
          }
        }
      }
    }
    if (emailFound === false) {
      emailMissingCount = emailMissingCount + 1;
    }
    if (phoneFound === false) {
      phoneMissingCount = phoneMissingCount + 1;
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    emailMissingCount: emailMissingCount,
    emailEmptyCount: emailEmptyCount,
    emailPresentCount: emailPresentCount,
    emailUnknownCount: emailUnknownCount,
    phoneMissingCount: phoneMissingCount,
    phoneEmptyCount: phoneEmptyCount,
    phonePresentCount: phonePresentCount,
    phoneUnknownCount: phoneUnknownCount
  };
}
