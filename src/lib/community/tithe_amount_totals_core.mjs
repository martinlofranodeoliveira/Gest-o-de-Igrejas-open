export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_AMOUNT_TOTALS_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_AMOUNT_TOTALS_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let amountValidCount = 0;
  let amountMissingCount = 0;
  let amountInvalidCount = 0;
  let amountTotal = 0;
  let confirmadoCount = 0;
  let pendenteCount = 0;
  let statusEmptyCount = 0;
  let statusUnknownCount = 0;
  let confirmadoTotal = 0;
  let pendenteTotal = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount += 1;
    } else {
      validRowCount += 1;
      let hasAmount = false;
      let amountBad = false;
      let amountOk = false;
      let amountNumber = 0;
      let hasStatus = false;
      let isConfirmado = false;
      let isPendente = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "amount") {
          hasAmount = true;
          if (typeof entry[1] !== "number" || entry[1] !== entry[1] || entry[1] < 0 || entry[1] > 1000000000) {
            amountBad = true;
          } else {
            amountOk = true;
            amountNumber += entry[1];
          }
        }
        if (entry[0] === "status") {
          hasStatus = true;
          if (entry[1] === "Confirmado") {
            isConfirmado = true;
          } else if (entry[1] === "Pendente") {
            isPendente = true;
          }
        }
      }
      if (hasAmount === false) {
        amountMissingCount += 1;
      } else if (amountBad === true) {
        amountInvalidCount += 1;
      } else if (amountOk === true) {
        amountValidCount += 1;
        amountTotal += amountNumber;
      } else {
        amountInvalidCount += 1;
      }
      if (hasStatus === false) {
        statusEmptyCount += 1;
      } else if (isConfirmado === true) {
        confirmadoCount += 1;
        if (amountOk === true) {
          confirmadoTotal += amountNumber;
        }
      } else if (isPendente === true) {
        pendenteCount += 1;
        if (amountOk === true) {
          pendenteTotal += amountNumber;
        }
      } else {
        statusUnknownCount += 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    amountValidCount: amountValidCount,
    amountMissingCount: amountMissingCount,
    amountInvalidCount: amountInvalidCount,
    amountTotal: amountTotal,
    confirmadoCount: confirmadoCount,
    pendenteCount: pendenteCount,
    statusEmptyCount: statusEmptyCount,
    statusUnknownCount: statusUnknownCount,
    confirmadoTotal: confirmadoTotal,
    pendenteTotal: pendenteTotal
  };
}
