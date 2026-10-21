import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_amount_totals_core.mjs";

describe("tithe amount totals core", () => {
  it("throws TypeError for non-array root", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_AMOUNT_TOTALS_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_AMOUNT_TOTALS_ROOT" });
    assert.throws(() => runFeature("x"), { name: "TypeError", message: "INVALID_TITHE_AMOUNT_TOTALS_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_AMOUNT_TOTALS_ROOT" });
  });
  it("throws RangeError when length exceeds 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({ amount: 1, status: "Confirmado" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_AMOUNT_TOTALS_LIMIT" });
  });
  it("returns all zeros for empty array", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      amountValidCount: 0,
      amountMissingCount: 0,
      amountInvalidCount: 0,
      amountTotal: 0,
      confirmadoCount: 0,
      pendenteCount: 0,
      statusEmptyCount: 0,
      statusUnknownCount: 0,
      confirmadoTotal: 0,
      pendenteTotal: 0
    });
  });
  it("matches first contract example", () => {
    const out = runFeature([
      { amount: 100, status: "Confirmado" },
      { amount: 50.5, status: "Pendente" },
      { amount: 20, status: "Confirmado" }
    ]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      amountValidCount: 3,
      amountMissingCount: 0,
      amountInvalidCount: 0,
      amountTotal: 170.5,
      confirmadoCount: 2,
      pendenteCount: 1,
      statusEmptyCount: 0,
      statusUnknownCount: 0,
      confirmadoTotal: 120,
      pendenteTotal: 50.5
    });
  });
  it("matches second contract example", () => {
    const out = runFeature([null, {}, { amount: "10", status: "X" }, { amount: -5, status: "Confirmado" }]);
    assert.deepEqual(out, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      amountValidCount: 0,
      amountMissingCount: 1,
      amountInvalidCount: 2,
      amountTotal: 0,
      confirmadoCount: 1,
      pendenteCount: 0,
      statusEmptyCount: 1,
      statusUnknownCount: 1,
      confirmadoTotal: 0,
      pendenteTotal: 0
    });
  });
  it("counts non-object rows as invalid and ignores them for amount and status", () => {
    const out = runFeature([null, 5, "a", [1, 2], { amount: 10, status: "Pendente" }]);
    assert.equal(out.invalidRowCount, 4);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.rowCount, 5);
    assert.equal(out.amountValidCount, 1);
    assert.equal(out.amountTotal, 10);
    assert.equal(out.pendenteCount, 1);
    assert.equal(out.pendenteTotal, 10);
  });
  it("classifies amount missing invalid and valid without coercion", () => {
    const out = runFeature([
      {},
      { amount: "10", status: "Confirmado" },
      { amount: Number.NaN, status: "Confirmado" },
      { amount: -1, status: "Confirmado" },
      { amount: 1000000001, status: "Confirmado" },
      { amount: 0, status: "Confirmado" },
      { amount: 1000000000, status: "Pendente" }
    ]);
    assert.equal(out.amountMissingCount, 1);
    assert.equal(out.amountInvalidCount, 4);
    assert.equal(out.amountValidCount, 2);
    assert.equal(out.amountTotal, 1000000000);
    assert.equal(out.confirmadoTotal, 0);
    assert.equal(out.pendenteTotal, 1000000000);
  });
  it("classifies status exactly with no coercion", () => {
    const out = runFeature([
      { amount: 10 },
      { amount: 10, status: "Confirmado" },
      { amount: 10, status: "Pendente" },
      { amount: 10, status: "confirmado" },
      { amount: 10, status: " Confirmado" },
      { amount: 10, status: 5 },
      { amount: 10, status: null }
    ]);
    assert.equal(out.statusEmptyCount, 1);
    assert.equal(out.confirmadoCount, 1);
    assert.equal(out.pendenteCount, 1);
    assert.equal(out.statusUnknownCount, 4);
    assert.equal(out.confirmadoTotal, 10);
    assert.equal(out.pendenteTotal, 10);
    assert.equal(out.amountTotal, 70);
  });
  it("never adds invalid or missing amounts to totals", () => {
    const out = runFeature([
      { amount: "50", status: "Confirmado" },
      { status: "Pendente" },
      { amount: -5, status: "Pendente" },
      { amount: 25, status: "Confirmado" }
    ]);
    assert.equal(out.amountTotal, 25);
    assert.equal(out.confirmadoTotal, 25);
    assert.equal(out.pendenteTotal, 0);
  });
  it("ignores other keys without copy", () => {
    const out = runFeature([{ id: 1, memberId: 2, memberName: "A", paymentMethod: "Pix", contributionDate: "2026-01-01", notes: "n", createdAt: "c", amount: 7, status: "Pendente" }]);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.amountTotal, 7);
    assert.equal(out.pendenteTotal, 7);
  });
  it("holds invariants and preserves input with fresh allocation", () => {
    const input = [{ amount: 3, status: "Confirmado" }, null, { amount: 4, status: "Nope" }];
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    assert.equal(a.rowCount, a.validRowCount + a.invalidRowCount);
    assert.equal(a.amountValidCount + a.amountMissingCount + a.amountInvalidCount, a.validRowCount);
    assert.equal(a.confirmadoCount + a.pendenteCount + a.statusEmptyCount + a.statusUnknownCount, a.validRowCount);
    assert.deepEqual(a, b);
    assert.notEqual(a, b);
  });
});
