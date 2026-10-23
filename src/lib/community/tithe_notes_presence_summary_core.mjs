export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_NOTES_PRESENCE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_NOTES_PRESENCE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let notesMissingCount = 0;
  let notesEmptyCount = 0;
  let notesPresentCount = 0;
  let notesUnknownCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      if (typeof row !== "object") {
        invalidRowCount = invalidRowCount + 1;
      } else {
        if (Array.isArray(row) === true) {
          invalidRowCount = invalidRowCount + 1;
        } else {
          validRowCount = validRowCount + 1;
          let found = false;
          for (const entry of Object.entries(row)) {
            if (entry[0] === "notes") {
              found = true;
              if (typeof entry[1] !== "string") {
                notesUnknownCount = notesUnknownCount + 1;
              } else {
                if (entry[1].length === 0) {
                  notesEmptyCount = notesEmptyCount + 1;
                } else {
                  notesPresentCount = notesPresentCount + 1;
                }
              }
            }
          }
          if (found === false) {
            notesMissingCount = notesMissingCount + 1;
          }
        }
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    notesMissingCount: notesMissingCount,
    notesEmptyCount: notesEmptyCount,
    notesPresentCount: notesPresentCount,
    notesUnknownCount: notesUnknownCount
  };
}
