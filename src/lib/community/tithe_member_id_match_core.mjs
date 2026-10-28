export function runFeature(payload) {
  if (payload === null) {
    throw new TypeError("INVALID_TITHE_MEMBER_MATCH_ROOT");
  }
  if (typeof payload !== "object") {
    throw new TypeError("INVALID_TITHE_MEMBER_MATCH_ROOT");
  }
  if (Array.isArray(payload) === true) {
    throw new TypeError("INVALID_TITHE_MEMBER_MATCH_ROOT");
  }
  if (Array.isArray(payload.members) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_MATCH_ROOT");
  }
  if (Array.isArray(payload.tithes) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_MATCH_ROOT");
  }
  if (payload.members.length > 1000) {
    throw new RangeError("TITHE_MEMBER_MATCH_LIMIT");
  }
  if (payload.tithes.length > 1000) {
    throw new RangeError("TITHE_MEMBER_MATCH_LIMIT");
  }
  let memberInvalidRowCount = 0;
  let memberValidRowCount = 0;
  let knownIdCount = 0;
  const known = new Map();
  for (const row of payload.members) {
    if (row === null) {
      memberInvalidRowCount += 1;
    } else if (typeof row !== "object") {
      memberInvalidRowCount += 1;
    } else if (Array.isArray(row) === true) {
      memberInvalidRowCount += 1;
    } else {
      memberValidRowCount += 1;
      let hasId = false;
      let idValue = undefined;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "id") {
          hasId = true;
          idValue = entry[1];
        }
      }
      if (hasId === true) {
        if (typeof idValue === "string") {
          if (idValue.length === 0) {
          } else if (known.get(idValue) === undefined) {
            known.set(idValue, true);
            knownIdCount += 1;
          }
        }
      }
    }
  }
  let titheInvalidRowCount = 0;
  let titheValidRowCount = 0;
  let matchedCount = 0;
  let missingCount = 0;
  let unknownCount = 0;
  const unmatchedIndexes = [];
  let titheIndex = 0;
  for (const row of payload.tithes) {
    if (row === null) {
      titheInvalidRowCount += 1;
    } else if (typeof row !== "object") {
      titheInvalidRowCount += 1;
    } else if (Array.isArray(row) === true) {
      titheInvalidRowCount += 1;
    } else {
      titheValidRowCount += 1;
      let hasMid = false;
      let midValue = undefined;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "memberId") {
          hasMid = true;
          midValue = entry[1];
        }
      }
      if (hasMid === false) {
        missingCount += 1;
        unmatchedIndexes.push(titheIndex);
      } else if (typeof midValue !== "string") {
        missingCount += 1;
        unmatchedIndexes.push(titheIndex);
      } else if (midValue.length === 0) {
        missingCount += 1;
        unmatchedIndexes.push(titheIndex);
      } else if (known.get(midValue) === undefined) {
        unknownCount += 1;
        unmatchedIndexes.push(titheIndex);
      } else {
        matchedCount += 1;
      }
    }
    titheIndex += 1;
  }
  const memberRowCount = memberValidRowCount + memberInvalidRowCount;
  const titheRowCount = titheValidRowCount + titheInvalidRowCount;
  return {
    memberRowCount: memberRowCount,
    memberInvalidRowCount: memberInvalidRowCount,
    memberValidRowCount: memberValidRowCount,
    knownIdCount: knownIdCount,
    titheRowCount: titheRowCount,
    titheInvalidRowCount: titheInvalidRowCount,
    titheValidRowCount: titheValidRowCount,
    matchedCount: matchedCount,
    missingCount: missingCount,
    unknownCount: unknownCount,
    unmatchedIndexes: unmatchedIndexes
  };
}
