export function runFeature(payload) {
  if (payload === null) {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  if (typeof payload !== "object") {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  if (Array.isArray(payload)) {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  let membersValue = null;
  let tithesValue = null;
  let membersSeen = false;
  let tithesSeen = false;
  for (const entry of Object.entries(payload)) {
    if (entry[0] === "members") {
      membersValue = entry[1];
      membersSeen = true;
    }
    if (entry[0] === "tithes") {
      tithesValue = entry[1];
      tithesSeen = true;
    }
  }
  if (membersSeen === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  if (tithesSeen === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  if (Array.isArray(membersValue) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  if (Array.isArray(tithesValue) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_ORPHAN_ROOT");
  }
  if (membersValue.length > 1000) {
    throw new RangeError("TITHE_MEMBER_ORPHAN_LIMIT");
  }
  if (tithesValue.length > 1000) {
    throw new RangeError("TITHE_MEMBER_ORPHAN_LIMIT");
  }
  let memberInvalidRowCount = 0;
  let memberValidRowCount = 0;
  let distinctMemberIdCount = 0;
  const idSet = new Map();
  for (const member of membersValue) {
    if (member === null) {
      memberInvalidRowCount = memberInvalidRowCount + 1;
    } else {
      if (typeof member !== "object") {
        memberInvalidRowCount = memberInvalidRowCount + 1;
      } else {
        if (Array.isArray(member)) {
          memberInvalidRowCount = memberInvalidRowCount + 1;
        } else {
          memberValidRowCount = memberValidRowCount + 1;
          let foundId = false;
          let foundIdValue = null;
          for (const entry of Object.entries(member)) {
            if (entry[0] === "id") {
              foundId = true;
              foundIdValue = entry[1];
            }
          }
          if (foundId === true) {
            if (typeof foundIdValue === "string") {
              if (foundIdValue.length !== 0) {
                if (idSet.get(foundIdValue) === undefined) {
                  idSet.set(foundIdValue, true);
                  distinctMemberIdCount = distinctMemberIdCount + 1;
                }
              }
            }
          }
        }
      }
    }
  }
  let titheInvalidRowCount = 0;
  let titheValidRowCount = 0;
  let linkedCount = 0;
  let orphanCount = 0;
  let missingCount = 0;
  const orphanIndexes = [];
  let titheIndex = 0;
  for (const tithe of tithesValue) {
    if (tithe === null) {
      titheInvalidRowCount = titheInvalidRowCount + 1;
      titheIndex = titheIndex + 1;
    } else {
      if (typeof tithe !== "object") {
        titheInvalidRowCount = titheInvalidRowCount + 1;
        titheIndex = titheIndex + 1;
      } else {
        if (Array.isArray(tithe)) {
          titheInvalidRowCount = titheInvalidRowCount + 1;
          titheIndex = titheIndex + 1;
        } else {
          titheValidRowCount = titheValidRowCount + 1;
          let foundMemberId = false;
          let foundMemberIdValue = null;
          for (const entry of Object.entries(tithe)) {
            if (entry[0] === "memberId") {
              foundMemberId = true;
              foundMemberIdValue = entry[1];
            }
          }
          if (foundMemberId === false) {
            missingCount = missingCount + 1;
          } else {
            if (typeof foundMemberIdValue !== "string") {
              missingCount = missingCount + 1;
            } else {
              if (foundMemberIdValue.length === 0) {
                missingCount = missingCount + 1;
              } else {
                if (idSet.get(foundMemberIdValue) === undefined) {
                  orphanCount = orphanCount + 1;
                  orphanIndexes.push(titheIndex);
                } else {
                  linkedCount = linkedCount + 1;
                }
              }
            }
          }
          titheIndex = titheIndex + 1;
        }
      }
    }
  }
  const memberRowCount = memberValidRowCount + memberInvalidRowCount;
  const titheRowCount = titheValidRowCount + titheInvalidRowCount;
  return {
    memberRowCount: memberRowCount,
    memberInvalidRowCount: memberInvalidRowCount,
    memberValidRowCount: memberValidRowCount,
    distinctMemberIdCount: distinctMemberIdCount,
    titheRowCount: titheRowCount,
    titheInvalidRowCount: titheInvalidRowCount,
    titheValidRowCount: titheValidRowCount,
    linkedCount: linkedCount,
    orphanCount: orphanCount,
    missingCount: missingCount,
    orphanIndexes: orphanIndexes
  };
}
