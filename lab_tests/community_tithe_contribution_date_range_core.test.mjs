import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_contribution_date_range_core.mjs";

describe("tithe contribution date range core", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_RANGE_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_RANGE_ROOT" });
    assert.throws(() => runFeature("2024-01-01"), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_RANGE_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_RANGE_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_CONTRIBUTION_DATE_RANGE_ROOT" });
  });
  it("enforces 1000 row limit and empty array contract", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({ contributionDate: "2024-01-01" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_CONTRIBUTION_DATE_RANGE_LIMIT" });
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      dateValidCount: 0,
      dateMissingCount: 0,
      dateInvalidCount: 0,
      earliest: "",
      latest: ""
    });
  });
  it("matches first contract example unordered range", () => {
    assert.deepEqual(runFeature([{ contributionDate: "2024-03-10" }, { contributionDate: "2024-01-05" }, { contributionDate: "2024-12-20" }]), {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      dateValidCount: 3,
      dateMissingCount: 0,
      dateInvalidCount: 0,
      earliest: "2024-01-05",
      latest: "2024-12-20"
    });
  });
  it("matches second contract example with invalid and missing", () => {
    assert.deepEqual(runFeature([null, {}, { contributionDate: "2024-13-01" }, { contributionDate: "2024-05-06" }]), {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      dateValidCount: 1,
      dateMissingCount: 1,
      dateInvalidCount: 1,
      earliest: "2024-05-06",
      latest: "2024-05-06"
    });
  });
  it("counts non-object rows as invalid and ignores other keys", () => {
    const out = runFeature([null, 42, "2024-01-01", [], { id: 1, memberId: "m1", contributionDate: "2024-02-02" }, { id: 2, notes: "x" }, { foo: "2024-01-01" }]);
    assert.equal(out.rowCount, 7);
    assert.equal(out.invalidRowCount, 4);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.dateValidCount, 1);
    assert.equal(out.dateMissingCount, 2);
    assert.equal(out.dateInvalidCount, 0);
    assert.equal(out.earliest, "2024-02-02");
    assert.equal(out.latest, "2024-02-02");
  });
  it("classifies shape edges without month-length beyond 01-31", () => {
    const out = runFeature([
      { contributionDate: "0000-01-01" },
      { contributionDate: "2024-00-10" },
      { contributionDate: "2024-13-01" },
      { contributionDate: "2024-01-00" },
      { contributionDate: "2024-01-32" },
      { contributionDate: "2024/01/01" },
      { contributionDate: "2024-1-01" },
      { contributionDate: 123 },
      { contributionDate: null },
      {},
      { contributionDate: "2024-02-30" },
      { contributionDate: "2024-12-31" }
    ]);
    assert.equal(out.rowCount, 12);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 12);
    assert.equal(out.dateMissingCount, 1);
    assert.equal(out.dateInvalidCount, 9);
    assert.equal(out.dateValidCount, 2);
    assert.equal(out.earliest, "2024-02-30");
    assert.equal(out.latest, "2024-12-31");
  });
  it("computes min and max independent of input order", () => {
    const a = runFeature([{ contributionDate: "2023-05-01" }, { contributionDate: "2025-08-15" }, { contributionDate: "2024-01-01" }]);
    const b = runFeature([{ contributionDate: "2025-08-15" }, { contributionDate: "2024-01-01" }, { contributionDate: "2023-05-01" }]);
    assert.equal(a.earliest, "2023-05-01");
    assert.equal(a.latest, "2025-08-15");
    assert.deepEqual(a, b);
  });
  it("returns fresh deterministic object with exact keys and no mutation", () => {
    const input = [{ contributionDate: "2024-06-01" }, null];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.deepEqual(Object.keys(first).sort(), ["dateInvalidCount", "dateMissingCount", "dateValidCount", "earliest", "invalidRowCount", "latest", "rowCount", "validRowCount"]);
    assert.equal(JSON.stringify(input), before);
    assert.equal(JSON.parse(JSON.stringify(first)).earliest, "2024-06-01");
    assert.equal(first.rowCount, first.validRowCount + first.invalidRowCount);
    assert.equal(first.validRowCount, first.dateValidCount + first.dateMissingCount + first.dateInvalidCount);
  });
  it("keeps earliest and latest empty when no valid dates", () => {
    const out = runFeature([null, {}, { contributionDate: "bad" }]);
    assert.equal(out.dateValidCount, 0);
    assert.equal(out.earliest, "");
    assert.equal(out.latest, "");
  });
});
