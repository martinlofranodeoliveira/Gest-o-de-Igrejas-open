export function runFeature(payload) {
  if (Array.isArray(payload) === false) {
    throw new TypeError("INVALID_MEMBER_STATUS_TITHER_CROSS_ROOT");
  }
  if (payload.length > 1000) {
    throw new RangeError("MEMBER_STATUS_TITHER_CROSS_LIMIT");
  }
  let invalidRowCount = 0;
  let validRowCount = 0;
  let ativoTrueCount = 0;
  let ativoFalseCount = 0;
  let ativoOtherCount = 0;
  let inativoTrueCount = 0;
  let inativoFalseCount = 0;
  let inativoOtherCount = 0;
  let visitanteTrueCount = 0;
  let visitanteFalseCount = 0;
  let visitanteOtherCount = 0;
  let emptyTrueCount = 0;
  let emptyFalseCount = 0;
  let emptyOtherCount = 0;
  let unknownTrueCount = 0;
  let unknownFalseCount = 0;
  let unknownOtherCount = 0;
  for (const row of payload) {
    if (row === null) {
      invalidRowCount = invalidRowCount + 1;
    } else if (typeof row !== "object") {
      invalidRowCount = invalidRowCount + 1;
    } else if (Array.isArray(row) === true) {
      invalidRowCount = invalidRowCount + 1;
    } else {
      validRowCount = validRowCount + 1;
      let statusKind = "empty";
      let titherKind = "other";
      for (const entry of Object.entries(row)) {
        if (entry[0] === "status") {
          if (entry[1] === "Ativo") {
            statusKind = "ativo";
          } else if (entry[1] === "Inativo") {
            statusKind = "inativo";
          } else if (entry[1] === "Visitante") {
            statusKind = "visitante";
          } else if (entry[1] === "") {
            statusKind = "empty";
          } else {
            statusKind = "unknown";
          }
        } else if (entry[0] === "isTither") {
          if (entry[1] === true) {
            titherKind = "true";
          } else if (entry[1] === false) {
            titherKind = "false";
          } else {
            titherKind = "other";
          }
        }
      }
      if (statusKind === "ativo") {
        if (titherKind === "true") {
          ativoTrueCount = ativoTrueCount + 1;
        } else if (titherKind === "false") {
          ativoFalseCount = ativoFalseCount + 1;
        } else {
          ativoOtherCount = ativoOtherCount + 1;
        }
      } else if (statusKind === "inativo") {
        if (titherKind === "true") {
          inativoTrueCount = inativoTrueCount + 1;
        } else if (titherKind === "false") {
          inativoFalseCount = inativoFalseCount + 1;
        } else {
          inativoOtherCount = inativoOtherCount + 1;
        }
      } else if (statusKind === "visitante") {
        if (titherKind === "true") {
          visitanteTrueCount = visitanteTrueCount + 1;
        } else if (titherKind === "false") {
          visitanteFalseCount = visitanteFalseCount + 1;
        } else {
          visitanteOtherCount = visitanteOtherCount + 1;
        }
      } else if (statusKind === "empty") {
        if (titherKind === "true") {
          emptyTrueCount = emptyTrueCount + 1;
        } else if (titherKind === "false") {
          emptyFalseCount = emptyFalseCount + 1;
        } else {
          emptyOtherCount = emptyOtherCount + 1;
        }
      } else {
        if (titherKind === "true") {
          unknownTrueCount = unknownTrueCount + 1;
        } else if (titherKind === "false") {
          unknownFalseCount = unknownFalseCount + 1;
        } else {
          unknownOtherCount = unknownOtherCount + 1;
        }
      }
    }
  }
  return {
    rowCount: validRowCount + invalidRowCount,
    invalidRowCount: invalidRowCount,
    validRowCount: validRowCount,
    ativoTrueCount: ativoTrueCount,
    ativoFalseCount: ativoFalseCount,
    ativoOtherCount: ativoOtherCount,
    inativoTrueCount: inativoTrueCount,
    inativoFalseCount: inativoFalseCount,
    inativoOtherCount: inativoOtherCount,
    visitanteTrueCount: visitanteTrueCount,
    visitanteFalseCount: visitanteFalseCount,
    visitanteOtherCount: visitanteOtherCount,
    emptyTrueCount: emptyTrueCount,
    emptyFalseCount: emptyFalseCount,
    emptyOtherCount: emptyOtherCount,
    unknownTrueCount: unknownTrueCount,
    unknownFalseCount: unknownFalseCount,
    unknownOtherCount: unknownOtherCount
  };
}
