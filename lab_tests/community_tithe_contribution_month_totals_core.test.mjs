import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_contribution_month_totals_core.mjs";

describe("tithe contribution month totals core", () => {
  it("rejects non-array root with TypeError", () => {
    assert.throws(() => runFeature(null), (e) => e instanceof TypeError && e.message === "INVALID_TITHE_CONTRIBUTION_MONTH_TOTALS_ROOT");
    assert.throws(() => runFeature({}), (e) => e instanceof TypeError && e.message === "INVALID_TITHE_CONTRIBUTION_MONTH_TOTALS_ROOT");
    assert.throws(() => runFeature("x"), (e) => e instanceof TypeError && e.message === "INVALID_TITHE_CONTRIBUTION_MONTH_TOTALS_ROOT");
    assert.throws(() => runFeature(42), (e) => e instanceof TypeError && e.message === "INVALID_TITHE_CONTRIBUTION_MONTH_TOTALS_ROOT");
  });
  it("rejects length over 1000 with RangeError", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ amount: 1, contributionDate: "2024-01-01" });
    }
    assert.throws(() => runFeature(big), (e) => e instanceof RangeError && e.message === "TITHE_CONTRIBUTION_MONTH_TOTALS_LIMIT");
  });
  it("returns zeros for empty array", () => {
    assert.deepEqual(runFeature([]), { rowCount: 0, invalidRowCount: 0, validRowCount: 0, groupableCount: 0, ungroupableCount: 0, monthCount: 0, monthTotal: 0, months: [] });
  });
  it("groups doc example in first-seen order", () => {
    const out = runFeature([
      { amount: 100, contributionDate: "2024-01-15" },
      { amount: 50, contributionDate: "2024-01-20" },
      { amount: 200, contributionDate: "2024-02-05" }
    ]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.groupableCount, 3);
    assert.equal(out.ungroupableCount, 0);
    assert.equal(out.monthCount, 2);
    assert.equal(out.monthTotal, 350);
    assert.deepEqual(out.months, [{ month: "2024-01", count: 2, total: 150 }, { month: "2024-02", count: 1, total: 200 }]);
  });
  it("counts invalid rows and ungroupable rows per doc example", () => {
    const out = runFeature([null, { amount: 10, contributionDate: "" }, { amount: 10, contributionDate: "2024-13-01" }, { amount: 0, contributionDate: "2024-03-10" }]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.groupableCount, 0);
    assert.equal(out.ungroupableCount, 3);
    assert.equal(out.monthCount, 0);
    assert.equal(out.monthTotal, 0);
    assert.deepEqual(out.months, []);
  });
  it("treats non-object and array rows as invalid", () => {
    const out = runFeature([null, 7, "x", true, [], { amount: 5, contributionDate: "2024-04-02" }]);
    assert.equal(out.invalidRowCount, 5);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.rowCount, 6);
    assert.equal(out.groupableCount, 1);
    assert.equal(out.ungroupableCount, 0);
    assert.deepEqual(out.months, [{ month: "2024-04", count: 1, total: 5 }]);
  });
  it("rejects bad months and bad amounts as ungroupable", () => {
    const rows = [
      { amount: 10, contributionDate: "0000-01-10" },
      { amount: 10, contributionDate: "2024-00-10" },
      { amount: 10, contributionDate: "2024-13-10" },
      { amount: 10, contributionDate: "2024-01-00" },
      { amount: 10, contributionDate: "2024-01-32" },
      { amount: 10, contributionDate: "2024/01/10" },
      { amount: 10, contributionDate: "2024-1-10" },
      { amount: 0, contributionDate: "2024-03-10" },
      { amount: -4, contributionDate: "2024-03-10" },
      { amount: Number.NaN, contributionDate: "2024-03-10" },
      { amount: Number.POSITIVE_INFINITY, contributionDate: "2024-03-10" },
      { amount: 9007199254740992, contributionDate: "2024-03-10" },
      { amount: "10", contributionDate: "2024-03-10" },
      { contributionDate: "2024-03-10" },
      { amount: 10 }
    ];
    const out = runFeature(rows);
    assert.equal(out.rowCount, 15);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 15);
    assert.equal(out.groupableCount, 0);
    assert.equal(out.ungroupableCount, 15);
    assert.deepEqual(out.months, []);
  });
  it("ignores extra keys and keeps first-seen month order", () => {
    const out = runFeature([
      { amount: 20, contributionDate: "2024-02-01", id: "a", status: "x" },
      { amount: 30, contributionDate: "2024-01-01", memberName: "n" },
      { amount: 10, contributionDate: "2024-02-15", notes: "hi" }
    ]);
    assert.deepEqual(out.months, [{ month: "2024-02", count: 2, total: 30 }, { month: "2024-01", count: 1, total: 30 }]);
    assert.equal(out.monthCount, 2);
    assert.equal(out.monthTotal, 60);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(out.validRowCount, out.groupableCount + out.ungroupableCount);
  });
  it("is deterministic with fresh allocation and no input mutation", () => {
    const input = [{ amount: 100, contributionDate: "2024-01-15" }, { amount: 25, contributionDate: "2024-01-16" }];
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.deepEqual(a, b);
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a.months, b.months);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(a.months, [{ month: "2024-01", count: 2, total: 125 }]);
    assert.equal(a.monthTotal, 125);
  });
});
