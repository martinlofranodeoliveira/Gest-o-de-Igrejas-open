import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_date_groups_core.mjs";

describe("tithe contribution date groups core", () => {
  it("throws TypeError for non-array payload", () => {
    const bad = [null, undefined, {}, "x", 42, true];
    for (const value of bad) {
      assert.throws(() => runFeature(value), (err) => {
        assert.ok(err instanceof TypeError);
        assert.equal(err.message, "INVALID_TITHE_DATE_GROUPS_ROOT");
        return true;
      });
    }
  });
  it("throws RangeError when longer than 1000 without mutating", () => {
    const big = [];
    for (let n = 0; n < 1001; n = n + 1) {
      big.push({ contributionDate: "2024-01-07" });
    }
    const before = JSON.stringify(big);
    assert.throws(() => runFeature(big), (err) => {
      assert.ok(err instanceof RangeError);
      assert.equal(err.message, "TITHE_DATE_GROUPS_LIMIT");
      return true;
    });
    assert.equal(JSON.stringify(big), before);
    assert.equal(big.length, 1001);
  });
  it("returns zeros for empty array", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      groupCount: 0,
      groupedRowCount: 0,
      groups: []
    });
  });
  it("groups exact equal dates preserving order and first-seen group order", () => {
    const out = runFeature([
      { contributionDate: "2024-01-07" },
      { contributionDate: "2024-01-08" },
      { contributionDate: "2024-01-07" }
    ]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.groupCount, 1);
    assert.equal(out.groupedRowCount, 2);
    assert.deepEqual(out.groups, [[0, 2]]);
    const ordered = runFeature([
      { contributionDate: "2024-02-02" },
      { contributionDate: "2024-01-01" },
      { contributionDate: "2024-02-02" },
      { contributionDate: "2024-01-01" },
      { contributionDate: "2024-03-03" }
    ]);
    assert.deepEqual(ordered.groups, [[0, 2], [1, 3]]);
    assert.equal(ordered.groupCount, 2);
    assert.equal(ordered.groupedRowCount, 4);
    const distinct = runFeature([
      { contributionDate: "2024-01-01" },
      { contributionDate: "2024-01-02" },
      { contributionDate: "2024-01-03" }
    ]);
    assert.deepEqual(distinct.groups, []);
    assert.equal(distinct.groupCount, 0);
    assert.equal(distinct.groupedRowCount, 0);
  });
  it("does not trim or coerce dates", () => {
    const out = runFeature([
      { contributionDate: "2024-01-07" },
      { contributionDate: " 2024-01-07" },
      { contributionDate: "2024-01-07 " },
      { contributionDate: "2024-01-07" }
    ]);
    assert.deepEqual(out.groups, [[0, 3]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.groupedRowCount, 2);
  });
  it("counts invalid rows once and ignores ungroupable valid rows", () => {
    const out = runFeature([null, { contributionDate: "" }, { contributionDate: "2024-02-01" }, { memberId: "m1" }]);
    assert.deepEqual(out, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      groupCount: 0,
      groupedRowCount: 0,
      groups: []
    });
    const mixed = runFeature([null, 42, "hi", [], { contributionDate: "2024-01-01" }, { contributionDate: 123 }, {}, { contributionDate: null }]);
    assert.equal(mixed.invalidRowCount, 4);
    assert.equal(mixed.validRowCount, 4);
    assert.equal(mixed.rowCount, 8);
    assert.deepEqual(mixed.groups, []);
  });
  it("returns fresh JSON-compatible deterministic result without mutating input", () => {
    const input = [
      { contributionDate: "2024-01-07", memberId: "a" },
      { contributionDate: "2024-01-07", memberId: "b" }
    ];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.notEqual(first.groups, second.groups);
    assert.deepEqual(Object.keys(first).sort(), ["groupCount", "groupedRowCount", "groups", "invalidRowCount", "rowCount", "validRowCount"]);
    assert.equal(first.rowCount, first.validRowCount + first.invalidRowCount);
    assert.equal(JSON.stringify(first), JSON.stringify(JSON.parse(JSON.stringify(first))));
    assert.equal(JSON.stringify(input), before);
    first.groups.push([99]);
    const third = runFeature(input);
    assert.deepEqual(third.groups, [[0, 1]]);
    runFeature(input);
    const after = runFeature([]);
    assert.deepEqual(after.groups, []);
  });
});
