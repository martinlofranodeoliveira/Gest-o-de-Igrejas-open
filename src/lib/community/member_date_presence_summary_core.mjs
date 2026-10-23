export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_DATE_PRESENCE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_DATE_PRESENCE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let birthMissingCount = 0;
  let birthEmptyCount = 0;
  let birthPresentCount = 0;
  let birthUnknownCount = 0;
  let baptismMissingCount = 0;
  let baptismEmptyCount = 0;
  let baptismPresentCount = 0;
  let baptismUnknownCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount += 1;
    } else if (typeof row !== "object") {
      invalidRowCount += 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let birthFound = false;
      let birthIsUnknown = false;
      let birthIsEmpty = false;
      let birthIsPresent = false;
      let baptismFound = false;
      let baptismIsUnknown = false;
      let baptismIsEmpty = false;
      let baptismIsPresent = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "birthDate") {
          birthFound = true;
          if (typeof entry[1] !== "string") {
            birthIsUnknown = true;
          } else if (entry[1].length === 0) {
            birthIsEmpty = true;
          } else {
            birthIsPresent = true;
          }
        }
        if (entry[0] === "baptismDate") {
          baptismFound = true;
          if (typeof entry[1] !== "string") {
            baptismIsUnknown = true;
          } else if (entry[1].length === 0) {
            baptismIsEmpty = true;
          } else {
            baptismIsPresent = true;
          }
        }
      }
      if (birthFound === false) {
        birthMissingCount += 1;
      } else if (birthIsUnknown === true) {
        birthUnknownCount += 1;
      } else if (birthIsEmpty === true) {
        birthEmptyCount += 1;
      } else if (birthIsPresent === true) {
        birthPresentCount += 1;
      }
      if (baptismFound === false) {
        baptismMissingCount += 1;
      } else if (baptismIsUnknown === true) {
        baptismUnknownCount += 1;
      } else if (baptismIsEmpty === true) {
        baptismEmptyCount += 1;
      } else if (baptismIsPresent === true) {
        baptismPresentCount += 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    birthMissingCount: birthMissingCount,
    birthEmptyCount: birthEmptyCount,
    birthPresentCount: birthPresentCount,
    birthUnknownCount: birthUnknownCount,
    baptismMissingCount: baptismMissingCount,
    baptismEmptyCount: baptismEmptyCount,
    baptismPresentCount: baptismPresentCount,
    baptismUnknownCount: baptismUnknownCount
  };
}
