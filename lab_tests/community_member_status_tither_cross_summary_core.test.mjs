import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_status_tither_cross_summary_core.mjs";

function zeroResult() {
  return {
    rowCount: 0,
    invalidRowCount: 0,
    validRowCount: 0,
    ativoTrueCount: 0,
    ativoFalseCount: 0,
    ativoOtherCount: 0,
    inativoTrueCount: 0,
    inativoFalseCount: 0,
    inativoOtherCount: 0,
    visitanteTrueCount: 0,
    visitanteFalseCount: 0,
    visitanteOtherCount: 0,
    emptyTrueCount: 0,
    emptyFalseCount: 0,
    emptyOtherCount: 0,
    unknownTrueCount: 0,
    unknownFalseCount: 0,
    unknownOtherCount: 0
  };
}

function crossSum(r) {
  return r.ativoTrueCount + r.ativoFalseCount + r.ativoOtherCount + r.inativoTrueCount + r.inativoFalseCount + r.inativoOtherCount + r.visitanteTrueCount + r.visitanteFalseCount + r.visitanteOtherCount + r.emptyTrueCount + r.emptyFalseCount + r.emptyOtherCount + r.unknownTrueCount + r.unknownFalseCount + r.unknownOtherCount;
}

describe("member status tither cross summary core", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_MEMBER_STATUS_TITHER_CROSS_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_MEMBER_STATUS_TITHER_CROSS_ROOT" });
    assert.throws(() => runFeature("Ativo"), { name: "TypeError", message: "INVALID_MEMBER_STATUS_TITHER_CROSS_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_MEMBER_STATUS_TITHER_CROSS_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_MEMBER_STATUS_TITHER_CROSS_ROOT" });
  });

  it("throws RangeError over 1000 and returns zeros for empty", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ status: "Ativo", isTither: true });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "MEMBER_STATUS_TITHER_CROSS_LIMIT" });
    assert.deepEqual(runFeature([]), zeroResult());
  });

  it("matches first contract example", () => {
    const out = runFeature([
      { isTither: true, status: "Ativo" },
      { isTither: false, status: "Ativo" },
      { isTither: true, status: "Inativo" }
    ]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.ativoTrueCount, 1);
    assert.equal(out.ativoFalseCount, 1);
    assert.equal(out.inativoTrueCount, 1);
    assert.equal(out.ativoOtherCount, 0);
    assert.equal(crossSum(out), out.validRowCount);
    assert.equal(Object.keys(out).length, 18);
  });

  it("matches second contract example", () => {
    const out = runFeature([null, { fullName: "Sintetico" }, { isTither: "yes", status: "" }, { isTither: true, status: "Desconhecido" }]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.emptyOtherCount, 2);
    assert.equal(out.unknownTrueCount, 1);
    assert.equal(crossSum(out), 3);
  });

  it("counts invalid rows once and excludes from cross", () => {
    const out = runFeature([null, 7, "x", true, [1, 2], { status: "Ativo", isTither: true }]);
    assert.equal(out.invalidRowCount, 5);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.rowCount, 6);
    assert.equal(out.ativoTrueCount, 1);
    assert.equal(crossSum(out), 1);
  });

  it("maps status exactly with no trim or coercion", () => {
    const out = runFeature([
      { status: " Ativo", isTither: true },
      { status: "ativo", isTither: true },
      { status: "Ativo ", isTither: false },
      { status: 0, isTither: false },
      { status: "Inativo", isTither: false },
      { status: "Visitante", isTither: true },
      { status: "", isTither: false },
      { isTither: false }
    ]);
    assert.equal(out.unknownTrueCount, 2);
    assert.equal(out.unknownFalseCount, 2);
    assert.equal(out.inativoFalseCount, 1);
    assert.equal(out.visitanteTrueCount, 1);
    assert.equal(out.emptyFalseCount, 2);
    assert.equal(out.ativoTrueCount, 0);
  });

  it("maps tither strictly and missing to other", () => {
    const out = runFeature([
      { status: "Ativo", isTither: true },
      { status: "Ativo", isTither: false },
      { status: "Ativo" },
      { status: "Ativo", isTither: 1 },
      { status: "Ativo", isTither: "true" },
      { status: "Ativo", isTither: null }
    ]);
    assert.equal(out.ativoTrueCount, 1);
    assert.equal(out.ativoFalseCount, 1);
    assert.equal(out.ativoOtherCount, 4);
  });

  it("covers all fifteen buckets and ignores extra keys", () => {
    const payload = [
      { status: "Ativo", isTither: true, id: "a", fullName: "A", email: "a@x", phone: "1", address: "r", birthDate: "d", baptismDate: "d", notes: "n", createdAt: "c" },
      { status: "Ativo", isTither: false },
      { status: "Ativo" },
      { status: "Inativo", isTither: true },
      { status: "Inativo", isTither: false },
      { status: "Inativo", isTither: 0 },
      { status: "Visitante", isTither: true },
      { status: "Visitante", isTither: false },
      { status: "Visitante" },
      { status: "", isTither: true },
      { status: "", isTither: false },
      {},
      { status: "X", isTither: true },
      { status: "X", isTither: false },
      { status: "X" }
    ];
    const out = runFeature(payload);
    assert.equal(out.ativoTrueCount, 1);
    assert.equal(out.ativoFalseCount, 1);
    assert.equal(out.ativoOtherCount, 1);
    assert.equal(out.inativoTrueCount, 1);
    assert.equal(out.inativoFalseCount, 1);
    assert.equal(out.inativoOtherCount, 1);
    assert.equal(out.visitanteTrueCount, 1);
    assert.equal(out.visitanteFalseCount, 1);
    assert.equal(out.visitanteOtherCount, 1);
    assert.equal(out.emptyTrueCount, 1);
    assert.equal(out.emptyFalseCount, 1);
    assert.equal(out.emptyOtherCount, 1);
    assert.equal(out.unknownTrueCount, 1);
    assert.equal(out.unknownFalseCount, 1);
    assert.equal(out.unknownOtherCount, 1);
    assert.equal(out.validRowCount, 15);
    assert.equal(out.rowCount, 15);
    assert.equal(Object.keys(out).length, 18);
  });

  it("never mutates input and returns fresh objects", () => {
    const payload = [{ status: "Ativo", isTither: true }, null];
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    assert.equal(JSON.stringify(payload), before);
    const second = runFeature(payload);
    assert.notEqual(first, second);
    assert.deepEqual(first, second);
    first.ativoTrueCount = 999;
    assert.equal(second.ativoTrueCount, 1);
    const third = runFeature(payload);
    assert.equal(third.ativoTrueCount, 1);
  });

  it("returns JSON-compatible exact eighteen fields", () => {
    const out = runFeature([{ status: "Inativo", isTither: false }]);
    const keys = Object.keys(out).sort();
    assert.deepEqual(keys, ["ativoFalseCount", "ativoOtherCount", "ativoTrueCount", "emptyFalseCount", "emptyOtherCount", "emptyTrueCount", "inativoFalseCount", "inativoOtherCount", "inativoTrueCount", "invalidRowCount", "rowCount", "unknownFalseCount", "unknownOtherCount", "unknownTrueCount", "validRowCount", "visitanteFalseCount", "visitanteOtherCount", "visitanteTrueCount"]);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(crossSum(out), out.validRowCount);
    assert.equal(JSON.parse(JSON.stringify(out)).inativoFalseCount, 1);
  });
});
