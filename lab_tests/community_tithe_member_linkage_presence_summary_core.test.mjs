import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_member_linkage_presence_summary_core.mjs";

describe("tithe member linkage presence summary core", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_MEMBER_LINKAGE_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_MEMBER_LINKAGE_ROOT" });
    assert.throws(() => runFeature("x"), { name: "TypeError", message: "INVALID_TITHE_MEMBER_LINKAGE_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_MEMBER_LINKAGE_ROOT" });
  });
  it("throws RangeError when length exceeds 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({ memberId: "m-1", memberName: "A" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_MEMBER_LINKAGE_LIMIT" });
  });
  it("returns all zero counts for empty array with exact keys", () => {
    const result = runFeature([]);
    assert.deepEqual(result, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      memberIdMissingCount: 0,
      memberIdEmptyCount: 0,
      memberIdPresentCount: 0,
      memberIdUnknownCount: 0,
      memberNameMissingCount: 0,
      memberNameEmptyCount: 0,
      memberNamePresentCount: 0,
      memberNameUnknownCount: 0
    });
    assert.equal(Object.keys(result).length, 11);
  });
  it("counts null, non-object and array rows as invalid once", () => {
    const result = runFeature([null, 7, "s", [], { memberId: "m-1", memberName: "Ana" }]);
    assert.equal(result.rowCount, 5);
    assert.equal(result.invalidRowCount, 4);
    assert.equal(result.validRowCount, 1);
    assert.equal(result.memberIdPresentCount, 1);
    assert.equal(result.memberNamePresentCount, 1);
  });
  it("matches first contract example", () => {
    const result = runFeature([
      { memberId: "m-001", memberName: "Maria Sintetica" },
      { memberId: "", memberName: "Joao Sintetico" },
      { memberId: "m-003" }
    ]);
    assert.deepEqual(result, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      memberIdMissingCount: 0,
      memberIdEmptyCount: 1,
      memberIdPresentCount: 2,
      memberIdUnknownCount: 0,
      memberNameMissingCount: 1,
      memberNameEmptyCount: 0,
      memberNamePresentCount: 2,
      memberNameUnknownCount: 0
    });
  });
  it("matches second contract example", () => {
    const result = runFeature([null, { memberId: 123, memberName: "" }, { memberId: "m-009", memberName: "Bia Sintetica" }, { fullName: "Sintetico" }]);
    assert.deepEqual(result, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      memberIdMissingCount: 1,
      memberIdEmptyCount: 0,
      memberIdPresentCount: 1,
      memberIdUnknownCount: 1,
      memberNameMissingCount: 1,
      memberNameEmptyCount: 1,
      memberNamePresentCount: 1,
      memberNameUnknownCount: 0
    });
  });
  it("classifies missing, unknown, empty and present without trim or coercion", () => {
    const result = runFeature([
      {},
      { memberId: 0, memberName: null },
      { memberId: "", memberName: "" },
      { memberId: "  ", memberName: " x " }
    ]);
    assert.equal(result.validRowCount, 4);
    assert.equal(result.memberIdMissingCount, 1);
    assert.equal(result.memberIdUnknownCount, 1);
    assert.equal(result.memberIdEmptyCount, 1);
    assert.equal(result.memberIdPresentCount, 1);
    assert.equal(result.memberNameMissingCount, 1);
    assert.equal(result.memberNameUnknownCount, 1);
    assert.equal(result.memberNameEmptyCount, 1);
    assert.equal(result.memberNamePresentCount, 1);
  });
  it("ignores other keys and keeps sums consistent with fresh JSON object", () => {
    const input = [{ id: "1", amount: 10, memberId: "m-1", memberName: "Z", paymentMethod: "pix", notes: "hi" }];
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
    assert.equal(a.rowCount, a.validRowCount + a.invalidRowCount);
    assert.equal(a.memberIdMissingCount + a.memberIdEmptyCount + a.memberIdPresentCount + a.memberIdUnknownCount, a.validRowCount);
    assert.equal(a.memberNameMissingCount + a.memberNameEmptyCount + a.memberNamePresentCount + a.memberNameUnknownCount, a.validRowCount);
    assert.equal(JSON.stringify(input), before);
    assert.equal(JSON.stringify(a), JSON.stringify(JSON.parse(JSON.stringify(a))));
  });
});
