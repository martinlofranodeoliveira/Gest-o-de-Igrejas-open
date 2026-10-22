export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_PAYMENT_METHOD_SUMMARY_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_PAYMENT_METHOD_SUMMARY_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let pixCount = 0;
  let especieCount = 0;
  let cartaoCount = 0;
  let transferenciaCount = 0;
  let paymentMissingCount = 0;
  let paymentUnknownCount = 0;
  for (const row of payload) {
    if (row === null || typeof row !== "object" || Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasPaymentMethod = false;
      for (const entry of Object.entries(row)) {
        if (entry[0] === "paymentMethod") {
          if (hasPaymentMethod === false) {
            if (entry[1] === "PIX") {
              pixCount = pixCount + 1;
            } else if (entry[1] === "Espécie") {
              especieCount = especieCount + 1;
            } else if (entry[1] === "Cartão") {
              cartaoCount = cartaoCount + 1;
            } else if (entry[1] === "Transferência") {
              transferenciaCount = transferenciaCount + 1;
            } else {
              paymentUnknownCount = paymentUnknownCount + 1;
            }
          }
          hasPaymentMethod = true;
        }
      }
      if (hasPaymentMethod === false) {
        paymentMissingCount = paymentMissingCount + 1;
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    pixCount: pixCount,
    especieCount: especieCount,
    cartaoCount: cartaoCount,
    transferenciaCount: transferenciaCount,
    paymentMissingCount: paymentMissingCount,
    paymentUnknownCount: paymentUnknownCount
  };
}
