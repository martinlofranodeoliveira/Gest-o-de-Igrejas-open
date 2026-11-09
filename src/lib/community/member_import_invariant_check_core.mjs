export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) === true) {
    throw new TypeError("INVALID_MEMBER_IMPORT_INVARIANT_ROOT");
  }
  let hasRowCount = false;
  let rowCountValue = 0;
  let hasValid = false;
  let validValue = 0;
  let hasInvalid = false;
  let invalidValue = 0;
  let hasCanImport = false;
  let canImportValue = false;
  let hasRows = false;
  let rowsValue = null;
  for (const entry of Object.entries(payload)) {
    if (entry[0] === "rowCount") {
      hasRowCount = true;
      rowCountValue = entry[1];
    } else if (entry[0] === "validCount") {
      hasValid = true;
      validValue = entry[1];
    } else if (entry[0] === "invalidCount") {
      hasInvalid = true;
      invalidValue = entry[1];
    } else if (entry[0] === "canImport") {
      hasCanImport = true;
      canImportValue = entry[1];
    } else if (entry[0] === "rows") {
      hasRows = true;
      rowsValue = entry[1];
    }
  }
  if (hasRows === false || Array.isArray(rowsValue) === false) {
    throw new TypeError("INVALID_MEMBER_IMPORT_INVARIANT_ROWS");
  }
  if (rowsValue.length > 250) {
    throw new RangeError("MEMBER_IMPORT_INVARIANT_LIMIT");
  }
  let rowCount = 0;
  let validCount = 0;
  let invalidCount = 0;
  let malformedCount = 0;
  let indexMismatchCount = 0;
  const mismatchedIndexes = [];
  let position = 0;
  for (const row of rowsValue) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      malformedCount = malformedCount + 1;
    } else {
      let hasIndex = false;
      let indexValue = 0;
      let hasStatus = false;
      let statusValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "index") {
          hasIndex = true;
          indexValue = entry[1];
        } else if (entry[0] === "status") {
          hasStatus = true;
          statusValue = entry[1];
        }
      }
      if (hasStatus === false || (statusValue !== "valid" && statusValue !== "invalid")) {
        malformedCount = malformedCount + 1;
      } else if (statusValue === "valid") {
        validCount = validCount + 1;
      } else {
        invalidCount = invalidCount + 1;
      }
      if (hasIndex === false || typeof indexValue !== "number" || indexValue !== position) {
        indexMismatchCount = indexMismatchCount + 1;
        mismatchedIndexes.push(position);
      }
    }
    position = position + 1;
  }
  rowCount = rowsValue.length;
  let canImportExpected = false;
  if (rowCount > 0 && invalidCount === 0 && malformedCount === 0) {
    canImportExpected = true;
  }
  let declaredConsistent = false;
  if (hasRowCount === true && hasValid === true && hasInvalid === true && hasCanImport === true) {
    if (typeof rowCountValue === "number" && typeof validValue === "number" && typeof invalidValue === "number" && typeof canImportValue === "boolean") {
      if (rowCountValue === rowCount && validValue === validCount && invalidValue === invalidCount && canImportValue === canImportExpected) {
        declaredConsistent = true;
      }
    }
  }
  let declaredViolation = 1;
  if (declaredConsistent === true) {
    declaredViolation = 0;
  }
  const violationCount = declaredViolation + indexMismatchCount + malformedCount;
  return {
    rowCount: rowCount,
    validCount: validCount,
    invalidCount: invalidCount,
    malformedCount: malformedCount,
    canImportExpected: canImportExpected,
    declaredConsistent: declaredConsistent,
    indexMismatchCount: indexMismatchCount,
    violationCount: violationCount,
    mismatchedIndexes: mismatchedIndexes
  };
}
