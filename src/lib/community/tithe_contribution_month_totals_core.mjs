export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_CONTRIBUTION_MONTH_TOTALS_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_CONTRIBUTION_MONTH_TOTALS_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let groupableCount = 0;
  let ungroupableCount = 0;
  let monthTotal = 0;
  let monthCount = 0;
  let index = 0;
  const totals = new Map();
  const order = [];
  const months = [];
  for (const row of payload) {
    index = index + 1;
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
          let hasDate = false;
          let dateValue = "";
          let value = "";
          let hasAmount = false;
          let amountValue = 0;
          for (const entry of Object.entries(row)) {
            if (entry[0] === "contributionDate") {
              hasDate = true;
              dateValue = entry[1];
              value = entry[1];
            }
            if (entry[0] === "amount") {
              hasAmount = true;
              amountValue = entry[1];
            }
          }
          let monthValid = false;
          let amountValid = false;
          if (hasDate === true) {
            if (typeof dateValue === "string") {
              if (typeof value === "string") {
                if (dateValue.length === 10) {
                  if (value.length === 10) {
                    if (value[4] === "-") {
                      if (value[7] === "-") {
                        if (value[0] >= "0" && value[0] <= "9" && value[1] >= "0" && value[1] <= "9" && value[2] >= "0" && value[2] <= "9" && value[3] >= "0" && value[3] <= "9" && value[5] >= "0" && value[5] <= "9" && value[6] >= "0" && value[6] <= "9" && value[8] >= "0" && value[8] <= "9" && value[9] >= "0" && value[9] <= "9") {
                          if (value[0] === "0" && value[1] === "0" && value[2] === "0" && value[3] === "0") {
                          } else {
                            let monthPartOk = false;
                            if (value[5] === "0") {
                              if (value[6] >= "1" && value[6] <= "9") {
                                monthPartOk = true;
                              }
                            } else {
                              if (value[5] === "1") {
                                if (value[6] >= "0" && value[6] <= "2") {
                                  monthPartOk = true;
                                }
                              }
                            }
                            if (monthPartOk === true) {
                              if (value[8] === "0") {
                                if (value[9] >= "1" && value[9] <= "9") {
                                  monthValid = true;
                                }
                              } else {
                                if (value[8] === "1") {
                                  if (value[9] >= "0" && value[9] <= "9") {
                                    monthValid = true;
                                  }
                                } else {
                                  if (value[8] === "2") {
                                    if (value[9] >= "0" && value[9] <= "9") {
                                      monthValid = true;
                                    }
                                  } else {
                                    if (value[8] === "3") {
                                      if (value[9] === "0" || value[9] === "1") {
                                        monthValid = true;
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
          }
          if (hasAmount === true) {
            if (typeof amountValue === "number") {
              if (Number.isFinite(amountValue) === true) {
                if (amountValue > 0) {
                  if (amountValue <= 9007199254740991) {
                    amountValid = true;
                  }
                }
              }
            }
          }
          if (monthValid === true) {
            if (amountValid === true) {
              groupableCount = groupableCount + 1;
              const monthKey = value[0] + value[1] + value[2] + value[3] + "-" + value[5] + value[6];
              const acc = totals.get(monthKey);
              if (acc === undefined) {
                totals.set(monthKey, [1, amountValue]);
                order.push(monthKey);
              } else {
                const newCount = acc[0] + 1;
                const newTotal = acc[1] + amountValue;
                totals.set(monthKey, [newCount, newTotal]);
              }
            } else {
              ungroupableCount = ungroupableCount + 1;
            }
          } else {
            ungroupableCount = ungroupableCount + 1;
          }
        }
      }
    }
  }
  for (const ordered of order) {
    const acc = totals.get(ordered);
    const gotCount = acc[0];
    const gotTotal = acc[1];
    months.push({ month: ordered, count: gotCount, total: gotTotal });
    monthTotal = monthTotal + gotTotal;
  }
  monthCount = months.length;
  const rowCount = validRowCount + invalidRowCount;
  return { rowCount: rowCount, invalidRowCount: invalidRowCount, validRowCount: validRowCount, groupableCount: groupableCount, ungroupableCount: ungroupableCount, monthCount: monthCount, monthTotal: monthTotal, months: months };
}
