export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_CONTRIBUTION_MONTH_GAP_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_CONTRIBUTION_MONTH_GAP_LIMIT");
  }
  let rowCount = 0;
  let invalidRowCount = 0;
  let validRowCount = 0;
  let malformedDateCount = 0;
  let validDateCount = 0;
  let monthCount = 0;
  let minMonth = "";
  let maxMonth = "";
  let coveredMonths = [];
  let missingMonths = [];
  let seen = new Map();
  let index = 0;
  for (let row of payload) {
    rowCount = rowCount + 1;
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
          for (let entry of Object.entries(row)) {
            if (entry[0] === "contributionDate") {
              hasDate = true;
              dateValue = entry[1];
            }
          }
          if (hasDate === false) {
            malformedDateCount = malformedDateCount + 1;
          } else {
            if (typeof dateValue !== "string") {
              malformedDateCount = malformedDateCount + 1;
            } else {
              if (dateValue.length !== 10) {
                malformedDateCount = malformedDateCount + 1;
              } else {
                if (dateValue.slice(4, 5) !== "-" || dateValue.slice(7, 8) !== "-") {
                  malformedDateCount = malformedDateCount + 1;
                } else {
                  let parts = dateValue.split("-");
                  let position = 0;
                  let yearText = "";
                  let monthText = "";
                  let dayText = "";
                  let partCount = 0;
                  for (let part of parts) {
                    partCount = partCount + 1;
                    if (position === 0) {
                      yearText = part;
                    }
                    if (position === 1) {
                      monthText = part;
                    }
                    if (position === 2) {
                      dayText = part;
                    }
                    position = position + 1;
                  }
                  if (partCount !== 3) {
                    malformedDateCount = malformedDateCount + 1;
                  } else {
                    if (yearText.length !== 4 || monthText.length !== 2 || dayText.length !== 2) {
                      malformedDateCount = malformedDateCount + 1;
                    } else {
                      let yearOk = true;
                      for (let ch of yearText) {
                        if (ch === "0" || ch === "1" || ch === "2" || ch === "3" || ch === "4" || ch === "5" || ch === "6" || ch === "7" || ch === "8" || ch === "9") {
                        } else {
                          yearOk = false;
                        }
                      }
                      let monthOk = true;
                      for (let ch of monthText) {
                        if (ch === "0" || ch === "1" || ch === "2" || ch === "3" || ch === "4" || ch === "5" || ch === "6" || ch === "7" || ch === "8" || ch === "9") {
                        } else {
                          monthOk = false;
                        }
                      }
                      let dayOk = true;
                      for (let ch of dayText) {
                        if (ch === "0" || ch === "1" || ch === "2" || ch === "3" || ch === "4" || ch === "5" || ch === "6" || ch === "7" || ch === "8" || ch === "9") {
                        } else {
                          dayOk = false;
                        }
                      }
                      if (yearOk === false || monthOk === false || dayOk === false) {
                        malformedDateCount = malformedDateCount + 1;
                      } else {
                        let yearNumber = Number(yearText);
                        let monthNumber = Number(monthText);
                        let dayNumber = Number(dayText);
                        if (yearNumber < 100 || yearNumber > 9999 || monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
                          malformedDateCount = malformedDateCount + 1;
                        } else {
                          let maxDay = 31;
                          if (monthNumber === 4 || monthNumber === 6 || monthNumber === 9 || monthNumber === 11) {
                            maxDay = 30;
                          } else {
                            if (monthNumber === 2) {
                              let leap = false;
                              if (yearNumber % 400 === 0) {
                                leap = true;
                              } else {
                                if (yearNumber % 4 === 0 && yearNumber % 100 !== 0) {
                                  leap = true;
                                }
                              }
                              if (leap === true) {
                                maxDay = 29;
                              } else {
                                maxDay = 28;
                              }
                            } else {
                              if (monthNumber === 1 || monthNumber === 3 || monthNumber === 5 || monthNumber === 7 || monthNumber === 8 || monthNumber === 10 || monthNumber === 12) {
                                maxDay = 31;
                              }
                            }
                          }
                          if (dayNumber > maxDay) {
                            malformedDateCount = malformedDateCount + 1;
                          } else {
                            validDateCount = validDateCount + 1;
                            let monthKey = yearText + "-" + monthText;
                            if (seen.get(monthKey) === undefined) {
                              seen.set(monthKey, true);
                              monthCount = monthCount + 1;
                              if (validDateCount === 1) {
                                minMonth = monthKey;
                                maxMonth = monthKey;
                              } else {
                                if (monthKey < minMonth) {
                                  minMonth = monthKey;
                                }
                                if (monthKey > maxMonth) {
                                  maxMonth = monthKey;
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
    index = index + 1;
  }
  if (validDateCount === 0) {
    return {
      rowCount: rowCount,
      invalidRowCount: invalidRowCount,
      validRowCount: validRowCount,
      malformedDateCount: malformedDateCount,
      validDateCount: validDateCount,
      monthCount: monthCount,
      minMonth: "",
      maxMonth: "",
      coveredMonths: coveredMonths,
      missingMonths: missingMonths,
      missingCount: 0,
      continuous: true
    };
  }
  let minYear = Number(minMonth.slice(0, 4));
  let minMo = Number(minMonth.slice(5, 7));
  let maxYear = Number(maxMonth.slice(0, 4));
  let maxMo = Number(maxMonth.slice(5, 7));
  let totalSpan = (maxYear - minYear) * 12 + (maxMo - minMo) + 1;
  if (totalSpan > 1200) {
    throw new RangeError("TITHE_CONTRIBUTION_MONTH_GAP_SPAN");
  }
  let cursorYear = minYear;
  let cursorMonth = minMo;
  let guard = 0;
  while (guard < totalSpan) {
    let yearPart = String(cursorYear);
    if (cursorYear < 1000 && cursorYear > 99) {
      yearPart = "0" + String(cursorYear);
    }
    let monthPart = String(cursorMonth);
    if (cursorMonth < 10) {
      monthPart = "0" + String(cursorMonth);
    }
    let cursorKey = yearPart + "-" + monthPart;
    if (seen.get(cursorKey) === undefined) {
      missingMonths.push(cursorKey);
    } else {
      coveredMonths.push(cursorKey);
    }
    if (cursorMonth === 12) {
      cursorMonth = 1;
      cursorYear = cursorYear + 1;
    } else {
      cursorMonth = cursorMonth + 1;
    }
    guard = guard + 1;
  }
  let missingCount = missingMonths.length;
  let continuous = false;
  if (missingCount === 0) {
    continuous = true;
  }
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    malformedDateCount: malformedDateCount,
    validDateCount: validDateCount,
    monthCount: monthCount,
    minMonth: minMonth,
    maxMonth: maxMonth,
    coveredMonths: coveredMonths,
    missingMonths: missingMonths,
    missingCount: missingCount,
    continuous: continuous
  };
}
