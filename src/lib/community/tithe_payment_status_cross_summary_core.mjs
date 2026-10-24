export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_TITHE_PAYMENT_STATUS_CROSS_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("TITHE_PAYMENT_STATUS_CROSS_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let pixConfirmadoCount = 0;
  let pixPendenteCount = 0;
  let pixOtherCount = 0;
  let especieConfirmadoCount = 0;
  let especiePendenteCount = 0;
  let especieOtherCount = 0;
  let cartaoConfirmadoCount = 0;
  let cartaoPendenteCount = 0;
  let cartaoOtherCount = 0;
  let transferenciaConfirmadoCount = 0;
  let transferenciaPendenteCount = 0;
  let transferenciaOtherCount = 0;
  let otherConfirmadoCount = 0;
  let otherPendenteCount = 0;
  let otherOtherCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let hasPaymentMethod = false;
      let paymentMethodValue = "";
      let hasStatus = false;
      let statusValue = "";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "paymentMethod") {
          hasPaymentMethod = true;
          paymentMethodValue = entry[1];
        } else if (entry[0] === "status") {
          hasStatus = true;
          statusValue = entry[1];
        }
      }
      if (hasPaymentMethod === false) {
        if (hasStatus === false) {
          otherOtherCount = otherOtherCount + 1;
        } else if (statusValue === "Confirmado") {
          otherConfirmadoCount = otherConfirmadoCount + 1;
        } else if (statusValue === "Pendente") {
          otherPendenteCount = otherPendenteCount + 1;
        } else {
          otherOtherCount = otherOtherCount + 1;
        }
      } else if (paymentMethodValue === "PIX") {
        if (hasStatus === false) {
          pixOtherCount = pixOtherCount + 1;
        } else if (statusValue === "Confirmado") {
          pixConfirmadoCount = pixConfirmadoCount + 1;
        } else if (statusValue === "Pendente") {
          pixPendenteCount = pixPendenteCount + 1;
        } else {
          pixOtherCount = pixOtherCount + 1;
        }
      } else if (paymentMethodValue === "Espécie") {
        if (hasStatus === false) {
          especieOtherCount = especieOtherCount + 1;
        } else if (statusValue === "Confirmado") {
          especieConfirmadoCount = especieConfirmadoCount + 1;
        } else if (statusValue === "Pendente") {
          especiePendenteCount = especiePendenteCount + 1;
        } else {
          especieOtherCount = especieOtherCount + 1;
        }
      } else if (paymentMethodValue === "Cartão") {
        if (hasStatus === false) {
          cartaoOtherCount = cartaoOtherCount + 1;
        } else if (statusValue === "Confirmado") {
          cartaoConfirmadoCount = cartaoConfirmadoCount + 1;
        } else if (statusValue === "Pendente") {
          cartaoPendenteCount = cartaoPendenteCount + 1;
        } else {
          cartaoOtherCount = cartaoOtherCount + 1;
        }
      } else if (paymentMethodValue === "Transferência") {
        if (hasStatus === false) {
          transferenciaOtherCount = transferenciaOtherCount + 1;
        } else if (statusValue === "Confirmado") {
          transferenciaConfirmadoCount = transferenciaConfirmadoCount + 1;
        } else if (statusValue === "Pendente") {
          transferenciaPendenteCount = transferenciaPendenteCount + 1;
        } else {
          transferenciaOtherCount = transferenciaOtherCount + 1;
        }
      } else {
        if (hasStatus === false) {
          otherOtherCount = otherOtherCount + 1;
        } else if (statusValue === "Confirmado") {
          otherConfirmadoCount = otherConfirmadoCount + 1;
        } else if (statusValue === "Pendente") {
          otherPendenteCount = otherPendenteCount + 1;
        } else {
          otherOtherCount = otherOtherCount + 1;
        }
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    pixConfirmadoCount: pixConfirmadoCount,
    pixPendenteCount: pixPendenteCount,
    pixOtherCount: pixOtherCount,
    especieConfirmadoCount: especieConfirmadoCount,
    especiePendenteCount: especiePendenteCount,
    especieOtherCount: especieOtherCount,
    cartaoConfirmadoCount: cartaoConfirmadoCount,
    cartaoPendenteCount: cartaoPendenteCount,
    cartaoOtherCount: cartaoOtherCount,
    transferenciaConfirmadoCount: transferenciaConfirmadoCount,
    transferenciaPendenteCount: transferenciaPendenteCount,
    transferenciaOtherCount: transferenciaOtherCount,
    otherConfirmadoCount: otherConfirmadoCount,
    otherPendenteCount: otherPendenteCount,
    otherOtherCount: otherOtherCount
  };
}
