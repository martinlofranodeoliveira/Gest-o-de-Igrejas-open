export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_STATUS_SUMMARY_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_STATUS_SUMMARY_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let ativoCount = 0;
  let inativoCount = 0;
  let visitanteCount = 0;
  let statusMissingCount = 0;
  let statusUnknownCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount += 1;
    } else if (typeof row !== "object") {
      invalidRowCount += 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let seen = 0;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "status") {
          seen += 1;
          if (entry[1] === "Ativo") {
            ativoCount += 1;
          } else if (entry[1] === "Inativo") {
            inativoCount += 1;
          } else if (entry[1] === "Visitante") {
            visitanteCount += 1;
          } else {
            statusUnknownCount += 1;
          }
        }
      }
      if (seen === 0) {
        statusMissingCount += 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    ativoCount: ativoCount,
    inativoCount: inativoCount,
    visitanteCount: visitanteCount,
    statusMissingCount: statusMissingCount,
    statusUnknownCount: statusUnknownCount
  };
}
