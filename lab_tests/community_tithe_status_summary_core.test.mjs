import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_status_summary_core.mjs";

describe("tithe status summary core", () => {
  it("throws TypeError for non-array payloads", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_STATUS_SUMMARY_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_STATUS_SUMMARY_ROOT" });
    assert.throws(() => runFeature("Confirmado"), { name: "TypeError", message: "INVALID_TITHE_STATUS_SUMMARY_ROOT" });
    assert.throws(() => runFeature(5), { name: "TypeError", message: "INVALID_TITHE_STATUS_SUMMARY_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_STATUS_SUMMARY_ROOT" });
  });
  it("throws RangeError when length exceeds 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ status: "Confirmado" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_STATUS_SUMMARY_LIMIT" });
    assert.equal(big.length, 1001);
  });
  it("accepts exactly 1000 rows", () => {
    const rows = [];
    for (let i = 0; i < 1000; i = i + 1) {
      rows.push({ status: "Pendente" });
    }
    const out = runFeature(rows);
    assert.equal(out.rowCount, 1000);
    assert.equal(out.validRowCount, 1000);
    assert.equal(out.pendenteCount, 1000);
  });
  it("returns zeros for empty array", () => {
    const out = runFeature([]);
    assert.deepEqual(out, { rowCount: 0, invalidRowCount: 0, validRowCount: 0, confirmadoCount: 0, pendenteCount: 0, statusMissingCount: 0, statusUnknownCount: 0, statusInvalidCount: 0 });
  });
  it("counts confirmado versus pendente", () => {
    const out = runFeature([{ status: "Confirmado" }, { status: "Pendente" }, { status: "Confirmado" }]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.confirmadoCount, 2);
    assert.equal(out.pendenteCount, 1);
    assert.equal(out.statusMissingCount, 0);
    assert.equal(out.statusUnknownCount, 0);
    assert.equal(out.statusInvalidCount, 0);
  });
  it("counts invalid rows and missing invalid unknown", () => {
    const out = runFeature([null, { memberName: "Sintetico" }, { status: 5 }, { status: "Pago" }]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.statusMissingCount, 1);
    assert.equal(out.statusInvalidCount, 1);
    assert.equal(out.statusUnknownCount, 1);
    assert.equal(out.confirmadoCount, 0);
    assert.equal(out.pendenteCount, 0);
  });
  it("treats non-object and array rows as invalid", () => {
    const out = runFeature([null, 7, "x", true, ["status"], { status: "Confirmado" }]);
    assert.equal(out.invalidRowCount, 5);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.rowCount, 6);
    assert.equal(out.confirmadoCount, 1);
  });
  it("uses exact string match only", () => {
    const out = runFeature([{ status: "confirmado" }, { status: " Confirmado" }, { status: "Confirmado " }, { status: "PENDENTE" }, { status: "" }, { status: null }, { status: "Pendente" }]);
    assert.equal(out.validRowCount, 7);
    assert.equal(out.pendenteCount, 1);
    assert.equal(out.confirmadoCount, 0);
    assert.equal(out.statusInvalidCount, 1);
    assert.equal(out.statusUnknownCount, 5);
    assert.equal(out.statusMissingCount, 0);
  });
  it("ignores other keys without error", () => {
    const out = runFeature([{ id: 1, memberId: 2, memberName: "A", amount: 10, paymentMethod: "Pix", contributionDate: "2026-01-01", notes: "n", createdAt: "c", status: "Confirmado" }]);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.confirmadoCount, 1);
    assert.equal(out.rowCount, 1);
  });
  it("keeps invariants and fresh allocation", () => {
    const input = [{ status: "Confirmado" }, null, {}];
    const a = runFeature(input);
    const b = runFeature(input);
    assert.deepEqual(a, b);
    assert.notEqual(a, b);
    assert.equal(a.rowCount, a.validRowCount + a.invalidRowCount);
    assert.equal(a.validRowCount, a.confirmadoCount + a.pendenteCount + a.statusMissingCount + a.statusUnknownCount + a.statusInvalidCount);
    assert.deepEqual(Object.keys(a), ["rowCount", "invalidRowCount", "validRowCount", "confirmadoCount", "pendenteCount", "statusMissingCount", "statusUnknownCount", "statusInvalidCount"]);
    assert.equal(input.length, 3);
    a.rowCount = 999;
    const c = runFeature(input);
    assert.equal(c.rowCount, 3);
  });
});
