import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_contribution_date_shape_core.mjs";

describe("tithe contribution-date shape core", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_SHAPE_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_SHAPE_ROOT" });
    assert.throws(() => runFeature("2024-01-01"), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_SHAPE_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_SHAPE_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_SHAPE_ROOT" });
  });
  it("throws RangeError when length exceeds 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({ contributionDate: "2024-01-01" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_CONTRIBUTION_DATE_SHAPE_LIMIT" });
  });
  it("returns all zero counts for empty array with exact keys", () => {
    const out = runFeature([]);
    assert.deepStrictEqual(out, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      dateMissingCount: 0,
      dateEmptyCount: 0,
      dateValidCount: 0,
      dateInvalidCount: 0,
      dateUnknownCount: 0
    });
  });
  it("matches first documented example", () => {
    const out = runFeature([{ contributionDate: "2024-02-29" }, { contributionDate: "" }, { contributionDate: "2024-13-01" }, {}]);
    assert.deepStrictEqual(out, {
      rowCount: 4,
      invalidRowCount: 0,
      validRowCount: 4,
      dateMissingCount: 1,
      dateEmptyCount: 1,
      dateValidCount: 1,
      dateInvalidCount: 1,
      dateUnknownCount: 0
    });
  });
  it("matches second documented example", () => {
    const out = runFeature([null, { contributionDate: 123 }, { contributionDate: "2023-05-09" }, { amount: 10 }]);
    assert.deepStrictEqual(out, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      dateMissingCount: 1,
      dateEmptyCount: 0,
      dateValidCount: 1,
      dateInvalidCount: 0,
      dateUnknownCount: 1
    });
  });
  it("counts null and array rows as invalid and ignores them for date counts", () => {
    const out = runFeature([null, [], ["2024-01-01"], 5, "x", { contributionDate: "2024-01-15" }]);
    assert.equal(out.rowCount, 6);
    assert.equal(out.invalidRowCount, 5);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.dateValidCount, 1);
    assert.equal(out.dateMissingCount + out.dateEmptyCount + out.dateValidCount + out.dateInvalidCount + out.dateUnknownCount, 1);
  });
  it("ignores unrelated keys without error", () => {
    const out = runFeature([{ id: "a", memberId: "m", memberName: "Ana", amount: 10, paymentMethod: "pix", status: "x", notes: "n", createdAt: "t", contributionDate: "2023-12-01" }]);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.dateValidCount, 1);
  });
  it("treats missing key as missing and non-string as unknown", () => {
    const out = runFeature([{}, { contributionDate: null }, { contributionDate: 0 }, { contributionDate: true }, { contributionDate: {} }]);
    assert.equal(out.validRowCount, 5);
    assert.equal(out.dateMissingCount, 1);
    assert.equal(out.dateUnknownCount, 4);
    assert.equal(out.dateEmptyCount, 0);
  });
  it("validates month day year boundaries without Date", () => {
    const valid = runFeature([{ contributionDate: "0100-01-01" }, { contributionDate: "9999-12-31" }, { contributionDate: "2024-01-31" }]);
    assert.equal(valid.dateValidCount, 3);
    const invalid = runFeature([
      { contributionDate: "2024-00-10" },
      { contributionDate: "2024-13-01" },
      { contributionDate: "2024-01-00" },
      { contributionDate: "2024-01-32" },
      { contributionDate: "0000-01-01" },
      { contributionDate: "0099-01-01" },
      { contributionDate: "2024/01/01" },
      { contributionDate: "2024-1-01" },
      { contributionDate: "24-01-01" },
      { contributionDate: "2024-01-0x" }
    ]);
    assert.equal(invalid.dateInvalidCount, 10);
    assert.equal(invalid.dateValidCount, 0);
  });
  it("keeps invariants and fresh allocation without mutating input", () => {
    const payload = [{ contributionDate: "2024-02-29" }, null];
    const snapshot = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    assert.equal(JSON.stringify(payload), snapshot);
    assert.notStrictEqual(a, b);
    assert.deepStrictEqual(a, b);
    assert.equal(a.rowCount, a.validRowCount + a.invalidRowCount);
    assert.equal(a.dateMissingCount + a.dateEmptyCount + a.dateValidCount + a.dateInvalidCount + a.dateUnknownCount, a.validRowCount);
  });
});
