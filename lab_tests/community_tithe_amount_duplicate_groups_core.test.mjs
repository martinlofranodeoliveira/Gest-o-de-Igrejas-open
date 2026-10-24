import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_amount_duplicate_groups_core.mjs";

describe("tithe amount duplicate groups core", () => {
  it("throws TypeError for non-array payload", () => {
    const bad = [null, undefined, {}, "x", 12, true];
    for (const value of bad) {
      assert.throws(() => runFeature(value), (err) => {
        assert.equal(err instanceof TypeError, true);
        assert.equal(err.message, "INVALID_TITHE_AMOUNT_DUPLICATE_ROOT");
        return true;
      });
    }
  });
  it("throws RangeError when longer than 1000 without mutation", () => {
    const payload = [];
    for (let n = 0; n < 1001; n += 1) {
      payload.push({ amount: 1 });
    }
    const before = payload.length;
    assert.throws(() => runFeature(payload), (err) => {
      assert.equal(err instanceof RangeError, true);
      assert.equal(err.message, "TITHE_AMOUNT_DUPLICATE_LIMIT");
      return true;
    });
    assert.equal(payload.length, before);
    assert.equal(payload.length, 1001);
  });
  it("returns fresh empty result for empty array", () => {
    const first = runFeature([]);
    assert.deepEqual(first, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      groupCount: 0,
      duplicateRowCount: 0,
      groups: []
    });
    const second = runFeature([]);
    assert.deepEqual(second, first);
    assert.notEqual(second, first);
    assert.notEqual(second.groups, first.groups);
  });
  it("counts invalid rows once and ignores non-numeric amounts", () => {
    const out = runFeature([null, { memberName: "Sintetico" }, { amount: "10" }, { amount: 5 }]);
    assert.deepEqual(out, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      groupCount: 0,
      duplicateRowCount: 0,
      groups: []
    });
  });
  it("counts array and primitive rows as invalid", () => {
    const out = runFeature([[], [1], 42, "hi", null, { amount: 9 }]);
    assert.equal(out.rowCount, 6);
    assert.equal(out.invalidRowCount, 5);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.groupCount, 0);
    assert.equal(out.duplicateRowCount, 0);
    assert.deepEqual(out.groups, []);
  });
  it("groups equal numeric amounts in ascending order", () => {
    const out = runFeature([{ amount: 10 }, { amount: 20 }, { amount: 10 }]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      groupCount: 1,
      duplicateRowCount: 2,
      groups: [[0, 2]]
    });
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
  });
  it("orders multiple groups by first index and sums duplicates", () => {
    const out = runFeature([
      { amount: 20 },
      { amount: 10 },
      { amount: 20 },
      { amount: 10 },
      { amount: 30 }
    ]);
    assert.deepEqual(out.groups, [[0, 2], [1, 3]]);
    assert.equal(out.groupCount, 2);
    assert.equal(out.duplicateRowCount, 4);
    assert.equal(out.rowCount, 5);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 5);
  });
  it("ignores other keys and never copies them", () => {
    const out = runFeature([
      { id: 1, memberId: 2, memberName: "A", amount: 7, paymentMethod: "x", notes: "n" },
      { amount: 7, createdAt: "y" },
      { amount: 8 }
    ]);
    assert.deepEqual(out.groups, [[0, 1]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.duplicateRowCount, 2);
  });
  it("returns deep-equal fresh objects and does not retain input", () => {
    const input = [{ amount: 4 }, { amount: 4 }, { amount: 5 }];
    const snapshot = JSON.parse(JSON.stringify(input));
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.notEqual(first.groups, second.groups);
    assert.notEqual(first.groups[0], second.groups[0]);
    assert.deepEqual(input, snapshot);
    first.groups.push([99]);
    first.groups[0].push(99);
    const third = runFeature(input);
    assert.deepEqual(third.groups, [[0, 1]]);
    assert.deepEqual(input, snapshot);
  });
  it("discarding result writes nothing and next call is stable", () => {
    runFeature([{ amount: 1 }, { amount: 1 }]);
    const out = runFeature([{ amount: 1 }, { amount: 1 }]);
    assert.deepEqual(out.groups, [[0, 1]]);
    assert.equal(out.duplicateRowCount, 2);
    assert.equal(out.groupCount, 1);
  });
});
