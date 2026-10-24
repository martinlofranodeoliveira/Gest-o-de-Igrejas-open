import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_baptismdate_shape_core.mjs";

describe("member baptismDate shape core", () => {
  it("throws TypeError for non-array payload", () => {
    for (const bad of [null, "x", {}, 123, undefined, true]) {
      assert.throws(() => runFeature(bad), (e) => e instanceof TypeError && e.message === "INVALID_MEMBER_BAPTISMDATE_SHAPE_ROOT");
    }
  });
  it("throws RangeError when length exceeds 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({});
    }
    assert.throws(() => runFeature(big), (e) => e instanceof RangeError && e.message === "MEMBER_BAPTISMDATE_SHAPE_LIMIT");
  });
  it("empty array returns all zero", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      baptismDateValidCount: 0,
      baptismDateEmptyCount: 0,
      baptismDateMissingCount: 0,
      baptismDateInvalidCount: 0
    });
  });
  it("null and array rows count as invalid once", () => {
    const out = runFeature([null, [], "nope", 5]);
    assert.equal(out.invalidRowCount, 4);
    assert.equal(out.validRowCount, 0);
    assert.equal(out.rowCount, 4);
    assert.equal(out.baptismDateValidCount, 0);
    assert.equal(out.baptismDateEmptyCount, 0);
    assert.equal(out.baptismDateMissingCount, 0);
    assert.equal(out.baptismDateInvalidCount, 0);
  });
  it("missing empty invalid and valid kinds", () => {
    const out = runFeature([{}, { baptismDate: "" }, { baptismDate: 123 }, { baptismDate: "2023-02-28" }]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 4);
    assert.equal(out.baptismDateMissingCount, 1);
    assert.equal(out.baptismDateEmptyCount, 1);
    assert.equal(out.baptismDateInvalidCount, 1);
    assert.equal(out.baptismDateValidCount, 1);
  });
  it("matches first contract example", () => {
    const out = runFeature([{ baptismDate: "2023-02-28" }, { baptismDate: "" }, {}, null]);
    assert.deepEqual(out, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      baptismDateValidCount: 1,
      baptismDateEmptyCount: 1,
      baptismDateMissingCount: 1,
      baptismDateInvalidCount: 0
    });
  });
  it("matches second contract example", () => {
    const out = runFeature([{ baptismDate: "2023-02-30" }, { baptismDate: 123 }, { baptismDate: "2024-02-29" }]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      baptismDateValidCount: 1,
      baptismDateEmptyCount: 0,
      baptismDateMissingCount: 0,
      baptismDateInvalidCount: 2
    });
  });
  it("rejects impossible date separators and length, accepts leap day", () => {
    assert.equal(runFeature([{ baptismDate: "2023-02-30" }]).baptismDateInvalidCount, 1);
    assert.equal(runFeature([{ baptismDate: "2023/02/28" }]).baptismDateInvalidCount, 1);
    assert.equal(runFeature([{ baptismDate: "2023-2-28" }]).baptismDateInvalidCount, 1);
    assert.equal(runFeature([{ baptismDate: "2024-02-29" }]).baptismDateValidCount, 1);
    assert.equal(runFeature([{ baptismDate: "2023-02-29" }]).baptismDateInvalidCount, 1);
    assert.equal(runFeature([{ baptismDate: "2023-13-01" }]).baptismDateInvalidCount, 1);
    assert.equal(runFeature([{ baptismDate: "0099-01-01" }]).baptismDateInvalidCount, 1);
  });
  it("ignores other keys without error", () => {
    const out = runFeature([{ id: 1, email: "a@b.c", fullName: "A", phone: "1", address: "x", birthDate: "2000-01-01", status: "a", isTither: true, notes: "n", createdAt: "t", baptismDate: "2000-01-31" }]);
    assert.equal(out.baptismDateValidCount, 1);
    assert.equal(out.validRowCount, 1);
  });
  it("result is fresh JSON-compatible with sums and input never mutated", () => {
    const input = [{ baptismDate: "2023-02-28" }, {}];
    const snap = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.notEqual(a, b);
    assert.deepEqual(Object.keys(a).sort(), ["baptismDateEmptyCount", "baptismDateInvalidCount", "baptismDateMissingCount", "baptismDateValidCount", "invalidRowCount", "rowCount", "validRowCount"]);
    assert.equal(a.rowCount, a.validRowCount + a.invalidRowCount);
    assert.equal(a.validRowCount, a.baptismDateValidCount + a.baptismDateEmptyCount + a.baptismDateMissingCount + a.baptismDateInvalidCount);
    assert.equal(JSON.parse(JSON.stringify(a)).rowCount, a.rowCount);
    assert.equal(JSON.stringify(input), snap);
  });
});
