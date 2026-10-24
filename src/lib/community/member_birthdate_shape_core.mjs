export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_BIRTHDATE_SHAPE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_BIRTHDATE_SHAPE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let birthDateValidCount = 0;
  let birthDateEmptyCount = 0;
  let birthDateMissingCount = 0;
  let birthDateInvalidCount = 0;
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
          let isString = false;
          let text = "";
          for (const entry of Object.entries(row)) {
            if (entry[0] === "birthDate") {
              found = true;
              if (typeof entry[1] === "string") {
                isString = true;
                text = entry[1];
              }
            }
          }
          if (found === false) {
            birthDateMissingCount = birthDateMissingCount + 1;
          } else {
            if (isString === false) {
              birthDateInvalidCount = birthDateInvalidCount + 1;
            } else {
              if (text.length === 0) {
                birthDateEmptyCount = birthDateEmptyCount + 1;
              } else {
                if (text.length !== 10) {
                  birthDateInvalidCount = birthDateInvalidCount + 1;
                } else {
                  if (text.charCodeAt(4) !== 45) {
                    birthDateInvalidCount = birthDateInvalidCount + 1;
                  } else {
                    if (text.charCodeAt(7) !== 45) {
                      birthDateInvalidCount = birthDateInvalidCount + 1;
                    } else {
                      let c0 = text.charCodeAt(0);
                      let c1 = text.charCodeAt(1);
                      let c2 = text.charCodeAt(2);
                      let c3 = text.charCodeAt(3);
                      let c5 = text.charCodeAt(5);
                      let c6 = text.charCodeAt(6);
                      let c8 = text.charCodeAt(8);
                      let c9 = text.charCodeAt(9);
                      if (c0 < 48 || c0 > 57 || c1 < 48 || c1 > 57 || c2 < 48 || c2 > 57 || c3 < 48 || c3 > 57 || c5 < 48 || c5 > 57 || c6 < 48 || c6 > 57 || c8 < 48 || c8 > 57 || c9 < 48 || c9 > 57) {
                        birthDateInvalidCount = birthDateInvalidCount + 1;
                      } else {
                        let year = (c0 - 48) * 1000 + (c1 - 48) * 100 + (c2 - 48) * 10 + (c3 - 48);
                        let month = (c5 - 48) * 10 + (c6 - 48);
                        let day = (c8 - 48) * 10 + (c9 - 48);
                        if (year < 100 || year > 9999) {
                          birthDateInvalidCount = birthDateInvalidCount + 1;
                        } else {
                          if (month < 1 || month > 12) {
                            birthDateInvalidCount = birthDateInvalidCount + 1;
                          } else {
                            let monthLength = 31;
                            if (month === 2) {
                              let leap = false;
                              if (year % 400 === 0) {
                                leap = true;
                              } else {
                                if (year % 4 === 0) {
                                  if (year % 100 !== 0) {
                                    leap = true;
                                  }
                                }
                              }
                              if (leap === true) {
                                monthLength = 29;
                              } else {
                                monthLength = 28;
                              }
                            } else {
                              if (month === 4 || month === 6 || month === 9 || month === 11) {
                                monthLength = 30;
                              }
                            }
                            if (day < 1 || day > monthLength) {
                              birthDateInvalidCount = birthDateInvalidCount + 1;
                            } else {
                              birthDateValidCount = birthDateValidCount + 1;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  let rowCount = validRowCount + invalidRowCount;
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    birthDateValidCount: birthDateValidCount,
    birthDateEmptyCount: birthDateEmptyCount,
    birthDateMissingCount: birthDateMissingCount,
    birthDateInvalidCount: birthDateInvalidCount
  };
}
