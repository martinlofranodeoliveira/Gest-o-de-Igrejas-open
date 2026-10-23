export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_CONTRIBUTION_DATE_SHAPE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_CONTRIBUTION_DATE_SHAPE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let dateMissingCount = 0;
  let dateEmptyCount = 0;
  let dateValidCount = 0;
  let dateInvalidCount = 0;
  let dateUnknownCount = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let found = false;
      let seenUnknown = false;
      let seenEmpty = false;
      let seenValid = false;
      let seenInvalid = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "contributionDate") {
          found = true;
          if (typeof entry[1] !== "string") {
            seenUnknown = true;
          } else if (entry[1].length === 0) {
            seenEmpty = true;
          } else if (entry[1].length === 10 && entry[1][4] === "-" && entry[1][7] === "-" && (entry[1][0] === "0" || entry[1][0] === "1" || entry[1][0] === "2" || entry[1][0] === "3" || entry[1][0] === "4" || entry[1][0] === "5" || entry[1][0] === "6" || entry[1][0] === "7" || entry[1][0] === "8" || entry[1][0] === "9") && (entry[1][1] === "0" || entry[1][1] === "1" || entry[1][1] === "2" || entry[1][1] === "3" || entry[1][1] === "4" || entry[1][1] === "5" || entry[1][1] === "6" || entry[1][1] === "7" || entry[1][1] === "8" || entry[1][1] === "9") && (entry[1][2] === "0" || entry[1][2] === "1" || entry[1][2] === "2" || entry[1][2] === "3" || entry[1][2] === "4" || entry[1][2] === "5" || entry[1][2] === "6" || entry[1][2] === "7" || entry[1][2] === "8" || entry[1][2] === "9") && (entry[1][3] === "0" || entry[1][3] === "1" || entry[1][3] === "2" || entry[1][3] === "3" || entry[1][3] === "4" || entry[1][3] === "5" || entry[1][3] === "6" || entry[1][3] === "7" || entry[1][3] === "8" || entry[1][3] === "9") && (entry[1][5] === "0" || entry[1][5] === "1" || entry[1][5] === "2" || entry[1][5] === "3" || entry[1][5] === "4" || entry[1][5] === "5" || entry[1][5] === "6" || entry[1][5] === "7" || entry[1][5] === "8" || entry[1][5] === "9") && (entry[1][6] === "0" || entry[1][6] === "1" || entry[1][6] === "2" || entry[1][6] === "3" || entry[1][6] === "4" || entry[1][6] === "5" || entry[1][6] === "6" || entry[1][6] === "7" || entry[1][6] === "8" || entry[1][6] === "9") && (entry[1][8] === "0" || entry[1][8] === "1" || entry[1][8] === "2" || entry[1][8] === "3" || entry[1][8] === "4" || entry[1][8] === "5" || entry[1][8] === "6" || entry[1][8] === "7" || entry[1][8] === "8" || entry[1][8] === "9") && (entry[1][9] === "0" || entry[1][9] === "1" || entry[1][9] === "2" || entry[1][9] === "3" || entry[1][9] === "4" || entry[1][9] === "5" || entry[1][9] === "6" || entry[1][9] === "7" || entry[1][9] === "8" || entry[1][9] === "9") && ((entry[1][5] === "0" && (entry[1][6] === "1" || entry[1][6] === "2" || entry[1][6] === "3" || entry[1][6] === "4" || entry[1][6] === "5" || entry[1][6] === "6" || entry[1][6] === "7" || entry[1][6] === "8" || entry[1][6] === "9")) || (entry[1][5] === "1" && (entry[1][6] === "0" || entry[1][6] === "1" || entry[1][6] === "2"))) && ((entry[1][8] === "0" && (entry[1][9] === "1" || entry[1][9] === "2" || entry[1][9] === "3" || entry[1][9] === "4" || entry[1][9] === "5" || entry[1][9] === "6" || entry[1][9] === "7" || entry[1][9] === "8" || entry[1][9] === "9")) || (entry[1][8] === "1" && (entry[1][9] === "0" || entry[1][9] === "1" || entry[1][9] === "2" || entry[1][9] === "3" || entry[1][9] === "4" || entry[1][9] === "5" || entry[1][9] === "6" || entry[1][9] === "7" || entry[1][9] === "8" || entry[1][9] === "9")) || (entry[1][8] === "2" && (entry[1][9] === "0" || entry[1][9] === "1" || entry[1][9] === "2" || entry[1][9] === "3" || entry[1][9] === "4" || entry[1][9] === "5" || entry[1][9] === "6" || entry[1][9] === "7" || entry[1][9] === "8" || entry[1][9] === "9")) || (entry[1][8] === "3" && (entry[1][9] === "0" || entry[1][9] === "1"))) && ((entry[1][0] === "0" && entry[1][1] === "0") === false)) {
            seenValid = true;
          } else {
            seenInvalid = true;
          }
        }
      }
      if (found === false) {
        dateMissingCount += 1;
      } else if (seenUnknown === true) {
        dateUnknownCount += 1;
      } else if (seenEmpty === true) {
        dateEmptyCount += 1;
      } else if (seenValid === true) {
        dateValidCount += 1;
      } else {
        dateInvalidCount += 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    dateMissingCount: dateMissingCount,
    dateEmptyCount: dateEmptyCount,
    dateValidCount: dateValidCount,
    dateInvalidCount: dateInvalidCount,
    dateUnknownCount: dateUnknownCount
  };
}
