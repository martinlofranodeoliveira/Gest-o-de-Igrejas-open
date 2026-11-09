import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_contribution_month_gap_core.mjs";

describe("tithe contribution month gap core", () => {
  it("detects gap Jan to Mar 2024", () => {
    const out = runFeature([
      { contributionDate: "2024-01-15" },
      { contributionDate: "2024-03-10" },
      { contributionDate: "2024-03-20" }
    ]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.malformedDateCount, 0);
    assert.equal(out.validDateCount, 3);
    assert.equal(out.monthCount, 2);
    assert.equal(out.minMonth, "2024-01");
    assert.equal(out.maxMonth, "2024-03");
    assert.deepEqual(out.coveredMonths, ["2024-01", "2024-03"]);
    assert.deepEqual(out.missingMonths, ["2024-02"]);
    assert.equal(out.missingCount, 1);
    assert.equal(out.continuous, false);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(out.validRowCount, out.malformedDateCount + out.validDateCount);
    assert.equal(out.monthCount, out.coveredMonths.length);
    assert.equal(out.missingCount, out.missingMonths.length);
  });
  it("handles invalid and malformed with extra keys ignored", () => {
    const out = runFeature([
      { contributionDate: "2024-05-01" },
      { contributionDate: "bad" },
      null,
      { memberId: "x" }
    ]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.malformedDateCount, 2);
    assert.equal(out.validDateCount, 1);
    assert.equal(out.monthCount, 1);
    assert.equal(out.minMonth, "2024-05");
    assert.equal(out.maxMonth, "2024-05");
    assert.deepEqual(out.coveredMonths, ["2024-05"]);
    assert.deepEqual(out.missingMonths, []);
    assert.equal(out.missingCount, 0);
    assert.equal(out.continuous, true);
  });
  it("ignores documented extra keys without error", () => {
    const out = runFeature([{
      contributionDate: "2024-06-15",
      id: "a",
      memberId: "m1",
      memberName: "Ana",
      amount: 100,
      paymentMethod: "cash",
      status: "paid",
      notes: "hi",
      createdAt: "2024-06-15"
    }]);
    assert.equal(out.validDateCount, 1);
    assert.equal(out.malformedDateCount, 0);
    assert.deepEqual(out.coveredMonths, ["2024-06"]);
    assert.equal(out.continuous, true);
  });
  it("is order independent and sorted ascending", () => {
    const out = runFeature([
      { contributionDate: "2024-03-05" },
      { contributionDate: "2024-01-22" }
    ]);
    assert.equal(out.minMonth, "2024-01");
    assert.equal(out.maxMonth, "2024-03");
    assert.deepEqual(out.coveredMonths, ["2024-01", "2024-03"]);
    assert.deepEqual(out.missingMonths, ["2024-02"]);
    assert.equal(out.continuous, false);
  });
  it("rejects identifier shortcut and bad calendar dates", () => {
    const out = runFeature([
      { id: "1", memberId: "m", amount: 50 },
      { contributionDate: " 2024-01-01" },
      { contributionDate: "2024-02-30" },
      { contributionDate: 20240101 },
      { contributionDate: "2024-13-01" }
    ]);
    assert.equal(out.rowCount, 5);
    assert.equal(out.validRowCount, 5);
    assert.equal(out.malformedDateCount, 5);
    assert.equal(out.validDateCount, 0);
    assert.equal(out.monthCount, 0);
    assert.equal(out.minMonth, "");
    assert.equal(out.maxMonth, "");
    assert.equal(out.continuous, true);
  });
  it("handles leap years", () => {
    const leap = runFeature([{ contributionDate: "2024-02-29" }]);
    assert.equal(leap.validDateCount, 1);
    assert.deepEqual(leap.coveredMonths, ["2024-02"]);
    const nonLeap = runFeature([{ contributionDate: "2023-02-29" }]);
    assert.equal(nonLeap.malformedDateCount, 1);
    assert.equal(nonLeap.validDateCount, 0);
  });
  it("returns empties for empty array and discards cleanly", () => {
    const out = runFeature([]);
    assert.deepEqual(out, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      malformedDateCount: 0,
      validDateCount: 0,
      monthCount: 0,
      minMonth: "",
      maxMonth: "",
      coveredMonths: [],
      missingMonths: [],
      missingCount: 0,
      continuous: true
    });
    runFeature([]);
  });
  it("throws on non-array root", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_MONTH_GAP_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_MONTH_GAP_ROOT" });
    assert.throws(() => runFeature("2024-01-01"), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_MONTH_GAP_ROOT" });
  });
  it("throws on length over 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({});
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_CONTRIBUTION_MONTH_GAP_LIMIT" });
  });
  it("throws on span over 1200", () => {
    assert.throws(() => runFeature([
      { contributionDate: "1920-01-15" },
      { contributionDate: "2025-06-15" }
    ]), { name: "RangeError", message: "TITHE_CONTRIBUTION_MONTH_GAP_SPAN" });
  });
  it("never mutates input and allocates fresh objects", () => {
    const input = [{ contributionDate: "2024-01-01" }, null];
    const before = JSON.stringify(input);
    const a = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    const b = runFeature(input);
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a.coveredMonths, b.coveredMonths);
    assert.notStrictEqual(a.missingMonths, b.missingMonths);
    a.coveredMonths.push("9999-99");
    const c = runFeature(input);
    assert.deepEqual(c.coveredMonths, ["2024-01"]);
  });
  it("does not use Date builtin", () => {
    const holder = globalThis.Date;
    const broken = function () { throw new Error("date-used"); };
    broken.now = function () { throw new Error("date-used"); };
    broken.parse = function () { throw new Error("date-used"); };
    broken.UTC = function () { throw new Error("date-used"); };
    globalThis.Date = broken;
    try {
      const out = runFeature([{ contributionDate: "2024-01-15" }]);
      assert.equal(out.validDateCount, 1);
    } finally {
      globalThis.Date = holder;
    }
  });
});
