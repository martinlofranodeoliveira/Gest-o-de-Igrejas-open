import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_member_name_consistency_core.mjs";

describe("tithe member name consistency core", () => {
  it("throws TypeError for non-array payload", () => {
    const badValues = [null, undefined, {}, "x", 42, true];
    for (const bad of badValues) {
      assert.throws(() => runFeature(bad), (e) => e instanceof TypeError && e.message === "INVALID_TITHE_MEMBER_NAME_CONSISTENCY_ROOT");
    }
  });
  it("empty array returns all zero counts", () => {
    assert.deepStrictEqual(runFeature([]), { rowCount: 0, invalidRowCount: 0, validRowCount: 0, linkedRowCount: 0, idCount: 0, inconsistentIdCount: 0, inconsistentRowCount: 0, groups: [] });
  });
  it("throws RangeError beyond 1000 and allows 1000", () => {
    const big = [];
    for (let k = 0; k < 1001; k += 1) {
      big.push({ memberId: "m1", memberName: "Ana" });
    }
    assert.throws(() => runFeature(big), (e) => e instanceof RangeError && e.message === "TITHE_MEMBER_NAME_CONSISTENCY_LIMIT");
    const ok = [];
    for (let k = 0; k < 1000; k += 1) {
      ok.push({ memberId: "m1", memberName: "Ana" });
    }
    const out = runFeature(ok);
    assert.strictEqual(out.rowCount, 1000);
    assert.strictEqual(out.linkedRowCount, 1000);
    assert.strictEqual(out.idCount, 1);
    assert.strictEqual(out.inconsistentIdCount, 0);
  });
  it("matches first contract example", () => {
    const out = runFeature([{ memberId: "m1", memberName: "Ana" }, { memberId: "m1", memberName: "Ana" }, { memberId: "m1", memberName: "Ana Silva" }, { memberId: "m2", memberName: "Beto" }]);
    assert.strictEqual(out.rowCount, 4);
    assert.strictEqual(out.invalidRowCount, 0);
    assert.strictEqual(out.validRowCount, 4);
    assert.strictEqual(out.linkedRowCount, 4);
    assert.strictEqual(out.idCount, 2);
    assert.strictEqual(out.inconsistentIdCount, 1);
    assert.strictEqual(out.inconsistentRowCount, 3);
    assert.deepStrictEqual(out.groups, [{ memberId: "m1", names: ["Ana", "Ana Silva"], indexes: [0, 1, 2] }]);
  });
  it("matches second contract example", () => {
    const out = runFeature([null, { memberId: "", memberName: "Ana" }, { memberId: "m1" }, { memberId: "m1", memberName: "" }, { memberId: "m1", memberName: "Ana" }]);
    assert.deepStrictEqual(out, { rowCount: 5, invalidRowCount: 1, validRowCount: 4, linkedRowCount: 1, idCount: 1, inconsistentIdCount: 0, inconsistentRowCount: 0, groups: [] });
  });
  it("counts null non-object and array rows as invalid", () => {
    const out = runFeature([null, 7, "s", [1], { memberId: "m1", memberName: "Ana" }]);
    assert.strictEqual(out.invalidRowCount, 4);
    assert.strictEqual(out.validRowCount, 1);
    assert.strictEqual(out.rowCount, 5);
    assert.strictEqual(out.linkedRowCount, 1);
    assert.strictEqual(out.idCount, 1);
  });
  it("links only exact non-empty strings and ignores extra keys", () => {
    const out = runFeature([
      { memberId: "m1", memberName: "Ana", amount: 10, notes: "x", id: "q" },
      { memberId: 5, memberName: "Ana" },
      { memberId: "m1", memberName: 9 },
      { memberId: " m1", memberName: "Ana" },
      { memberId: "m1", memberName: "Ana " }
    ]);
    assert.strictEqual(out.validRowCount, 5);
    assert.strictEqual(out.linkedRowCount, 3);
    assert.strictEqual(out.idCount, 2);
    assert.strictEqual(out.inconsistentIdCount, 1);
    assert.strictEqual(out.inconsistentRowCount, 2);
    assert.deepStrictEqual(out.groups, [{ memberId: "m1", names: ["Ana", "Ana "], indexes: [0, 4] }]);
  });
  it("groups only ids with two distinct exact names in order", () => {
    const out = runFeature([
      { memberId: "b", memberName: "Zed" },
      { memberId: "a", memberName: "Ana" },
      { memberId: "b", memberName: "Zed Two" },
      { memberId: "a", memberName: "Ana" },
      { memberId: "c", memberName: "Solo" }
    ]);
    assert.strictEqual(out.idCount, 3);
    assert.strictEqual(out.inconsistentIdCount, 1);
    assert.strictEqual(out.inconsistentRowCount, 2);
    assert.deepStrictEqual(out.groups, [{ memberId: "b", names: ["Zed", "Zed Two"], indexes: [0, 2] }]);
  });
  it("preserves input and returns fresh exact-key object", () => {
    const input = [{ memberId: "m1", memberName: "Ana" }, { memberId: "m1", memberName: "Bob" }];
    const snap = JSON.parse(JSON.stringify(input));
    const a = runFeature(input);
    assert.deepStrictEqual(input, snap);
    assert.deepStrictEqual(Object.keys(a).sort(), ["groups", "idCount", "inconsistentIdCount", "inconsistentRowCount", "invalidRowCount", "linkedRowCount", "rowCount", "validRowCount"]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), a);
    const b = runFeature(input);
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a.groups, b.groups);
    a.groups.push({ memberId: "x", names: [], indexes: [] });
    assert.strictEqual(b.groups.length, 1);
    runFeature(input);
  });
});
