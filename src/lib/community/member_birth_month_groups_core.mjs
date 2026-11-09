export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_BIRTH_MONTH_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_BIRTH_MONTH_LIMIT");
  }
  let rowCount = 0;
  let invalidRowCount = 0;
  let validRowCount = 0;
  let missingCount = 0;
  let invalidDateCount = 0;
  let withBirthdayCount = 0;
  let groupCount = 0;
  const byMonth = new Map();
  const groups = [];
  let index = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
      rowCount = rowCount + 1;
      index = index + 1;
    } else {
      validRowCount = validRowCount + 1;
      rowCount = rowCount + 1;
      let hasBirth = false;
      let birthValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "birthDate") {
          hasBirth = true;
          birthValue = entry[1];
        }
      }
      if (hasBirth === false) {
        missingCount = missingCount + 1;
      } else if (typeof birthValue === "string" && birthValue === "") {
        missingCount = missingCount + 1;
      } else if (typeof birthValue !== "string") {
        invalidDateCount = invalidDateCount + 1;
      } else if (birthValue.length !== 10) {
        invalidDateCount = invalidDateCount + 1;
      } else if (birthValue[4] !== "-" || birthValue[7] !== "-") {
        invalidDateCount = invalidDateCount + 1;
      } else if (birthValue[0] < "0" || birthValue[0] > "9" || birthValue[1] < "0" || birthValue[1] > "9" || birthValue[2] < "0" || birthValue[2] > "9" || birthValue[3] < "0" || birthValue[3] > "9" || birthValue[5] < "0" || birthValue[5] > "9" || birthValue[6] < "0" || birthValue[6] > "9" || birthValue[8] < "0" || birthValue[8] > "9" || birthValue[9] < "0" || birthValue[9] > "9") {
        invalidDateCount = invalidDateCount + 1;
      } else if (birthValue[0] === "0" && birthValue[1] === "0" && birthValue[2] === "0" && birthValue[3] === "0") {
        invalidDateCount = invalidDateCount + 1;
      } else if ((birthValue[5] === "0" && birthValue[6] >= "1" && birthValue[6] <= "9") || (birthValue[5] === "1" && birthValue[6] >= "0" && birthValue[6] <= "2")) {
        if ((birthValue[8] === "0" && birthValue[9] >= "1" && birthValue[9] <= "9") || (birthValue[8] === "1" && birthValue[9] >= "0" && birthValue[9] <= "9") || (birthValue[8] === "2" && birthValue[9] >= "0" && birthValue[9] <= "9") || (birthValue[8] === "3" && birthValue[9] >= "0" && birthValue[9] <= "1")) {
          withBirthdayCount = withBirthdayCount + 1;
          const monthKey = birthValue[5] + birthValue[6];
          const found = byMonth.get(monthKey);
          if (found === undefined) {
            const fresh = [];
            fresh.push(index);
            byMonth.set(monthKey, fresh);
          } else {
            found.push(index);
          }
        } else {
          invalidDateCount = invalidDateCount + 1;
        }
      } else {
        invalidDateCount = invalidDateCount + 1;
      }
      index = index + 1;
    }
  }
  for (const ordered of ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]) {
    const stored = byMonth.get(ordered);
    if (stored !== undefined) {
      const total = stored.length;
      groups.push({ month: ordered, count: total, indexes: stored });
    }
  }
  groupCount = groups.length;
  return { rowCount: rowCount, invalidRowCount: invalidRowCount, validRowCount: validRowCount, missingCount: missingCount, invalidDateCount: invalidDateCount, withBirthdayCount: withBirthdayCount, groupCount: groupCount, groups: groups };
}
