export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_BAPTISMDATE_SHAPE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_BAPTISMDATE_SHAPE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let validCount = 0;
  let emptyCount = 0;
  let missingCount = 0;
  let invalidCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount += 1;
    } else if (typeof row !== "object") {
      invalidRowCount += 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let found = false;
      let raw = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "baptismDate") {
          found = true;
          raw = entry[1];
        }
      }
      if (found === false) {
        missingCount += 1;
      } else if (typeof raw !== "string") {
        invalidCount += 1;
      } else if (raw.length === 0) {
        emptyCount += 1;
      } else if (raw.length !== 10) {
        invalidCount += 1;
      } else if (raw.charCodeAt(4) !== 45) {
        invalidCount += 1;
      } else if (raw.charCodeAt(7) !== 45) {
        invalidCount += 1;
      } else if (raw.charCodeAt(0) < 48 || raw.charCodeAt(0) > 57 || raw.charCodeAt(1) < 48 || raw.charCodeAt(1) > 57 || raw.charCodeAt(2) < 48 || raw.charCodeAt(2) > 57 || raw.charCodeAt(3) < 48 || raw.charCodeAt(3) > 57 || raw.charCodeAt(5) < 48 || raw.charCodeAt(5) > 57 || raw.charCodeAt(6) < 48 || raw.charCodeAt(6) > 57 || raw.charCodeAt(8) < 48 || raw.charCodeAt(8) > 57 || raw.charCodeAt(9) < 48 || raw.charCodeAt(9) > 57) {
        invalidCount += 1;
      } else {
        let y0 = raw.charCodeAt(0) - 48;
        let y1 = raw.charCodeAt(1) - 48;
        let y2 = raw.charCodeAt(2) - 48;
        let y3 = raw.charCodeAt(3) - 48;
        let m0 = raw.charCodeAt(5) - 48;
        let m1 = raw.charCodeAt(6) - 48;
        let d0 = raw.charCodeAt(8) - 48;
        let d1 = raw.charCodeAt(9) - 48;
        let year = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
        let month = m0 * 10 + m1;
        let day = d0 * 10 + d1;
        if (year < 100 || year > 9999) {
          invalidCount += 1;
        } else if (month < 1 || month > 12) {
          invalidCount += 1;
        } else if (day < 1) {
          invalidCount += 1;
        } else if (month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12) {
          if (day > 31) {
            invalidCount += 1;
          } else {
            validCount += 1;
          }
        } else if (month === 4 || month === 6 || month === 9 || month === 11) {
          if (day > 30) {
            invalidCount += 1;
          } else {
            validCount += 1;
          }
        } else if (year % 400 === 0) {
          if (day > 29) {
            invalidCount += 1;
          } else {
            validCount += 1;
          }
        } else if (year % 100 === 0) {
          if (day > 28) {
            invalidCount += 1;
          } else {
            validCount += 1;
          }
        } else if (year % 4 === 0) {
          if (day > 29) {
            invalidCount += 1;
          } else {
            validCount += 1;
          }
        } else {
          if (day > 28) {
            invalidCount += 1;
          } else {
            validCount += 1;
          }
        }
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    baptismDateValidCount: validCount,
    baptismDateEmptyCount: emptyCount,
    baptismDateMissingCount: missingCount,
    baptismDateInvalidCount: invalidCount
  };
}
