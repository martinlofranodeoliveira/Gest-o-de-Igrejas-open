export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_ADDRESS_NOTES_PRESENCE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_ADDRESS_NOTES_PRESENCE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let addressMissingCount = 0;
  let addressEmptyCount = 0;
  let addressPresentCount = 0;
  let addressUnknownCount = 0;
  let notesMissingCount = 0;
  let notesEmptyCount = 0;
  let notesPresentCount = 0;
  let notesUnknownCount = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let addressFound = false;
      let notesFound = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "address") {
          addressFound = true;
          if (typeof entry[1] !== "string") {
            addressUnknownCount = addressUnknownCount + 1;
          } else if (entry[1].length === 0) {
            addressEmptyCount = addressEmptyCount + 1;
          } else {
            addressPresentCount = addressPresentCount + 1;
          }
        }
        if (entry[0] === "notes") {
          notesFound = true;
          if (typeof entry[1] !== "string") {
            notesUnknownCount = notesUnknownCount + 1;
          } else if (entry[1].length === 0) {
            notesEmptyCount = notesEmptyCount + 1;
          } else {
            notesPresentCount = notesPresentCount + 1;
          }
        }
      }
      if (addressFound === false) {
        addressMissingCount = addressMissingCount + 1;
      }
      if (notesFound === false) {
        notesMissingCount = notesMissingCount + 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    addressMissingCount: addressMissingCount,
    addressEmptyCount: addressEmptyCount,
    addressPresentCount: addressPresentCount,
    addressUnknownCount: addressUnknownCount,
    notesMissingCount: notesMissingCount,
    notesEmptyCount: notesEmptyCount,
    notesPresentCount: notesPresentCount,
    notesUnknownCount: notesUnknownCount
  };
}
