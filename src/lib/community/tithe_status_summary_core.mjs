export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_STATUS_SUMMARY_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_STATUS_SUMMARY_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let confirmadoCount = 0;
  let pendenteCount = 0;
  let statusMissingCount = 0;
  let statusUnknownCount = 0;
  let statusInvalidCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasStatus = false;
      let statusValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "status") {
          hasStatus = true;
          statusValue = entry[1];
        }
      }
      if (hasStatus === false) {
        statusMissingCount = statusMissingCount + 1;
      } else if (typeof statusValue !== "string") {
        statusInvalidCount = statusInvalidCount + 1;
      } else if (statusValue === "Confirmado") {
        confirmadoCount = confirmadoCount + 1;
      } else if (statusValue === "Pendente") {
        pendenteCount = pendenteCount + 1;
      } else {
        statusUnknownCount = statusUnknownCount + 1;
      }
    }
  }
  let rowCount = validRowCount + invalidRowCount;
  return { rowCount: rowCount, invalidRowCount: invalidRowCount, validRowCount: validRowCount, confirmadoCount: confirmadoCount, pendenteCount: pendenteCount, statusMissingCount: statusMissingCount, statusUnknownCount: statusUnknownCount, statusInvalidCount: statusInvalidCount };
}
