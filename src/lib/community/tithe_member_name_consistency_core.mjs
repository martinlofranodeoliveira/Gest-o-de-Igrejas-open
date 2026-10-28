export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_MEMBER_NAME_CONSISTENCY_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_MEMBER_NAME_CONSISTENCY_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let linkedRowCount = 0;
  let at = 0;
  let indexesById = new Map();
  let namesById = new Map();
  for (const row of payload) {
    if (row === null) {
      invalidRowCount += 1;
    } else {
      if (typeof row !== "object") {
        invalidRowCount += 1;
      } else {
        if (Array.isArray(row) === true) {
          invalidRowCount += 1;
        } else {
          validRowCount += 1;
          let seenId = false;
          let seenName = false;
          let idText = "";
          let nameText = "";
          let idIsString = false;
          let nameIsString = false;
          for (const entry of Object.entries(row)) {
            if (entry[0] === "memberId") {
              seenId = true;
              if (typeof entry[1] === "string") {
                idIsString = true;
                idText = entry[1];
              }
            }
            if (entry[0] === "memberName") {
              seenName = true;
              if (typeof entry[1] === "string") {
                nameIsString = true;
                nameText = entry[1];
              }
            }
          }
          let linked = false;
          if (seenId === true) {
            if (idIsString === true) {
              if (idText.length !== 0) {
                if (seenName === true) {
                  if (nameIsString === true) {
                    if (nameText.length !== 0) {
                      linked = true;
                    }
                  }
                }
              }
            }
          }
          if (linked === true) {
            linkedRowCount += 1;
            let found = indexesById.get(idText);
            if (found === undefined) {
              let freshIndexes = [];
              freshIndexes.push(at);
              let freshNames = [];
              freshNames.push(nameText);
              indexesById.set(idText, freshIndexes);
              namesById.set(idText, freshNames);
            } else {
              found.push(at);
              let stored = namesById.get(idText);
              let already = false;
              for (const keptName of stored) {
                if (keptName === nameText) {
                  already = true;
                }
              }
              if (already === false) {
                stored.push(nameText);
              }
            }
          }
        }
      }
    }
    at += 1;
  }
  let groups = [];
  let inconsistentRowCount = 0;
  for (const entry of indexesById) {
    let kept = namesById.get(entry[0]);
    if (kept.length >= 2) {
      let outNames = [];
      for (const keptName of kept) {
        outNames.push(keptName);
      }
      let outIndexes = [];
      for (const keptAt of entry[1]) {
        outIndexes.push(keptAt);
      }
      inconsistentRowCount += outIndexes.length;
      groups.push({ memberId: entry[0], names: outNames, indexes: outIndexes });
    }
  }
  return { rowCount: validRowCount + invalidRowCount, invalidRowCount: invalidRowCount, validRowCount: validRowCount, linkedRowCount: linkedRowCount, idCount: indexesById.size, inconsistentIdCount: groups.length, inconsistentRowCount: inconsistentRowCount, groups: groups };
}
