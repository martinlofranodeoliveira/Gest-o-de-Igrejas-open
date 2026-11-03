export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_CONTRIBUTION_DATE_RANGE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_CONTRIBUTION_DATE_RANGE_LIMIT");
  }
  let index = 0;
  let rowCount = 0;
  let invalidRowCount = 0;
  let validRowCount = 0;
  let dateValidCount = 0;
  let dateMissingCount = 0;
  let dateInvalidCount = 0;
  let earliest = "";
  let latest = "";
  for (const row of payload) {
    index += 1;
    rowCount += 1;
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let hasDate = false;
      let dateValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "contributionDate") {
          hasDate = true;
          dateValue = entry[1];
        }
      }
      if (hasDate === false) {
        dateMissingCount += 1;
      } else if (typeof dateValue !== "string") {
        dateInvalidCount += 1;
      } else {
        let value = dateValue;
        let digitOk = false;
        if (value[0] >= "0" && value[0] <= "9" && value[1] >= "0" && value[1] <= "9" && value[2] >= "0" && value[2] <= "9" && value[3] >= "0" && value[3] <= "9" && value[5] >= "0" && value[5] <= "9" && value[6] >= "0" && value[6] <= "9" && value[8] >= "0" && value[8] <= "9" && value[9] >= "0" && value[9] <= "9") {
          digitOk = true;
        }
        let yearOk = false;
        if (value[0] !== "0" || value[1] !== "0" || value[2] !== "0" || value[3] !== "0") {
          yearOk = true;
        }
        let monthOk = false;
        if (value[5] === "0") {
          if (value[6] >= "1" && value[6] <= "9") {
            monthOk = true;
          }
        } else if (value[5] === "1") {
          if (value[6] >= "0" && value[6] <= "2") {
            monthOk = true;
          }
        }
        let dayOk = false;
        if (value[8] === "0") {
          if (value[9] >= "1" && value[9] <= "9") {
            dayOk = true;
          }
        } else if (value[8] === "1" || value[8] === "2") {
          if (value[9] >= "0" && value[9] <= "9") {
            dayOk = true;
          }
        } else if (value[8] === "3") {
          if (value[9] >= "0" && value[9] <= "1") {
            dayOk = true;
          }
        }
        let shapeOk = false;
        if (value.length === 10 && value[4] === "-" && value[7] === "-" && digitOk === true && yearOk === true && monthOk === true && dayOk === true) {
          shapeOk = true;
        }
        if (shapeOk === true) {
          dateValidCount += 1;
          if (earliest === "") {
            earliest = dateValue;
            latest = dateValue;
          } else {
            if (dateValue < earliest) {
              earliest = dateValue;
            }
            if (dateValue > latest) {
              latest = dateValue;
            }
          }
        } else {
          dateInvalidCount += 1;
        }
      }
    }
  }
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    dateValidCount: dateValidCount,
    dateMissingCount: dateMissingCount,
    dateInvalidCount: dateInvalidCount,
    earliest: earliest,
    latest: latest
  };
}
