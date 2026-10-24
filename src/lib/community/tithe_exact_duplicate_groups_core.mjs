export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_EXACT_DUPLICATE_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_EXACT_DUPLICATE_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let duplicateRowCount = 0;
  let index = 0;
  const outer = new Map();
  const order = [];
  const groups = [];
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
          let hasMemberId = false;
          let memberIdValue = "";
          let hasContributionDate = false;
          let contributionDateValue = "";
          let hasAmount = false;
          let amountValue = 0;
          for (const entry of Object.entries(row)) {
            if (entry[0] === "memberId") {
              hasMemberId = true;
              memberIdValue = entry[1];
            } else {
              if (entry[0] === "contributionDate") {
                hasContributionDate = true;
                contributionDateValue = entry[1];
              } else {
                if (entry[0] === "amount") {
                  hasAmount = true;
                  amountValue = entry[1];
                }
              }
            }
          }
          if (hasMemberId === false) {
          } else {
            if (typeof memberIdValue !== "string") {
            } else {
              if (memberIdValue.length === 0) {
              } else {
                if (hasContributionDate === false) {
                } else {
                  if (typeof contributionDateValue !== "string") {
                  } else {
                    if (contributionDateValue.length === 0) {
                    } else {
                      if (hasAmount === false) {
                      } else {
                        if (typeof amountValue !== "number") {
                        } else {
                          if (Number.isFinite(amountValue) === false) {
                          } else {
                            const outerGot = outer.get(memberIdValue);
                            if (outerGot === undefined) {
                              const middleFresh = new Map();
                              const innerFresh = new Map();
                              const listFresh = [];
                              listFresh.push(index);
                              innerFresh.set(amountValue, listFresh);
                              middleFresh.set(contributionDateValue, innerFresh);
                              outer.set(memberIdValue, middleFresh);
                              order.push(listFresh);
                            } else {
                              const middleGot = outerGot.get(contributionDateValue);
                              if (middleGot === undefined) {
                                const innerFresh = new Map();
                                const listFresh = [];
                                listFresh.push(index);
                                innerFresh.set(amountValue, listFresh);
                                outerGot.set(contributionDateValue, innerFresh);
                                order.push(listFresh);
                              } else {
                                const innerGot = middleGot.get(amountValue);
                                if (innerGot === undefined) {
                                  const listFresh = [];
                                  listFresh.push(index);
                                  middleGot.set(amountValue, listFresh);
                                  order.push(listFresh);
                                } else {
                                  innerGot.push(index);
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
  for (const list of order) {
    if (list.length >= 2) {
      const copy = [];
      for (const idx of list) {
        copy.push(idx);
      }
      groups.push(copy);
      duplicateRowCount = duplicateRowCount + list.length;
    }
  }
  const rowCount = validRowCount + invalidRowCount;
  const groupCount = groups.length;
  return {
    rowCount: rowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    groupCount: groupCount,
    duplicateRowCount: duplicateRowCount,
    groups: groups
  };
}
