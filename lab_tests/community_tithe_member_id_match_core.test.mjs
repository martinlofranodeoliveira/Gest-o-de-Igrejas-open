import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_member_id_match_core.mjs";

describe("tithe member id match core", () => {
  it("rejects bad root with TypeError", () => {
    const bad = [null, [], "x", 1, undefined, {}, { members: [] }, { tithes: [] }, { members: {}, tithes: [] }, { members: [], tithes: {} }, { members: null, tithes: [] }, { members: [], tithes: null }];
    for (const v of bad) {
      assert.throws(() => runFeature(v), (e) => e instanceof TypeError && e.message === "INVALID_TITHE_MEMBER_MATCH_ROOT");
    }
  });
  it("ignores extra root keys", () => {
    const out = runFeature({ members: [], tithes: [], extra: 1 });
    assert.equal(out.memberRowCount, 0);
    assert.deepEqual(out.unmatchedIndexes, []);
  });
  it("rejects over 1000 with RangeError", () => {
    const bigMembers = [];
    for (let i = 0; i < 1001; i += 1) {
      bigMembers.push({ id: "m" });
    }
    assert.throws(() => runFeature({ members: bigMembers, tithes: [] }), (e) => e instanceof RangeError && e.message === "TITHE_MEMBER_MATCH_LIMIT");
    const bigTithes = [];
    for (let i = 0; i < 1001; i += 1) {
      bigTithes.push({ memberId: "m" });
    }
    assert.throws(() => runFeature({ members: [], tithes: bigTithes }), (e) => e instanceof RangeError && e.message === "TITHE_MEMBER_MATCH_LIMIT");
  });
  it("accepts exactly 1000 rows", () => {
    const members = [];
    const tithes = [];
    for (let i = 0; i < 1000; i += 1) {
      members.push({ id: "k" });
      tithes.push({ memberId: "k" });
    }
    const out = runFeature({ members, tithes });
    assert.equal(out.memberRowCount, 1000);
    assert.equal(out.titheRowCount, 1000);
    assert.equal(out.matchedCount, 1000);
  });
  it("empty returns all zeros", () => {
    assert.deepEqual(runFeature({ members: [], tithes: [] }), {
      memberRowCount: 0,
      memberInvalidRowCount: 0,
      memberValidRowCount: 0,
      knownIdCount: 0,
      titheRowCount: 0,
      titheInvalidRowCount: 0,
      titheValidRowCount: 0,
      matchedCount: 0,
      missingCount: 0,
      unknownCount: 0,
      unmatchedIndexes: []
    });
  });
  it("matches first public example", () => {
    const out = runFeature({ members: [{ id: "m1" }, { id: "m2" }], tithes: [{ memberId: "m1" }, { memberId: "" }, { memberId: "m9" }] });
    assert.equal(out.knownIdCount, 2);
    assert.equal(out.matchedCount, 1);
    assert.equal(out.missingCount, 1);
    assert.equal(out.unknownCount, 1);
    assert.deepEqual(out.unmatchedIndexes, [1, 2]);
    assert.equal(out.memberRowCount, 2);
    assert.equal(out.titheRowCount, 3);
    assert.equal(out.titheValidRowCount, 3);
  });
  it("matches second public example with invalid rows", () => {
    const out = runFeature({ members: [null, { fullName: "Sintetico" }, { id: "" }], tithes: [null, { memberId: "m1" }, {}] });
    assert.deepEqual(out, {
      memberRowCount: 3,
      memberInvalidRowCount: 1,
      memberValidRowCount: 2,
      knownIdCount: 0,
      titheRowCount: 3,
      titheInvalidRowCount: 1,
      titheValidRowCount: 2,
      matchedCount: 0,
      missingCount: 1,
      unknownCount: 1,
      unmatchedIndexes: [1, 2]
    });
  });
  it("counts distinct exact ids with no trim or coercion", () => {
    const out = runFeature({
      members: [{ id: "m1" }, { id: "m1" }, { id: " m1" }, { id: "" }, { id: 1 }, { fullName: "A" }],
      tithes: [{ memberId: "m1" }, { memberId: " m1" }, { memberId: "m1 " }]
    });
    assert.equal(out.memberValidRowCount, 6);
    assert.equal(out.knownIdCount, 2);
    assert.equal(out.matchedCount, 2);
    assert.equal(out.unknownCount, 1);
    assert.equal(out.missingCount, 0);
    assert.deepEqual(out.unmatchedIndexes, [2]);
    const out2 = runFeature({ members: [{ id: "m1", fullName: "X", email: "e" }], tithes: [{ memberId: 1 }, { memberId: null }, {}] });
    assert.equal(out2.missingCount, 3);
    assert.deepEqual(out2.unmatchedIndexes, [0, 1, 2]);
  });
  it("treats non-object and array rows as invalid", () => {
    const out = runFeature({
      members: [null, [], "s", 5, { id: "a" }, { id: "b" }],
      tithes: [null, [], "s", { memberId: "a" }, { memberId: "" }, { memberId: "z" }, {}]
    });
    assert.equal(out.memberInvalidRowCount, 4);
    assert.equal(out.memberValidRowCount, 2);
    assert.equal(out.knownIdCount, 2);
    assert.equal(out.titheInvalidRowCount, 3);
    assert.equal(out.titheValidRowCount, 4);
    assert.equal(out.matchedCount, 1);
    assert.equal(out.missingCount, 2);
    assert.equal(out.unknownCount, 1);
    assert.deepEqual(out.unmatchedIndexes, [4, 5, 6]);
  });
  it("keeps invariants and ascending indexes", () => {
    const out = runFeature({
      members: [null, [], "s", { id: "a" }, { id: "b" }],
      tithes: [null, [], { memberId: "a" }, { memberId: "" }, { memberId: "z" }, {}]
    });
    assert.equal(out.memberRowCount, out.memberValidRowCount + out.memberInvalidRowCount);
    assert.equal(out.titheRowCount, out.titheValidRowCount + out.titheInvalidRowCount);
    assert.equal(out.titheValidRowCount, out.matchedCount + out.missingCount + out.unknownCount);
    assert.deepEqual(out.unmatchedIndexes, [3, 4, 5]);
  });
  it("is deterministic, fresh, JSON compatible and non-mutating", () => {
    const payload = { members: [{ id: "m1" }], tithes: [{ memberId: "m1" }, { memberId: "x" }] };
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    assert.deepEqual(a, b);
    assert.notEqual(a, b);
    assert.notEqual(a.unmatchedIndexes, b.unmatchedIndexes);
    assert.equal(JSON.stringify(a), JSON.stringify(JSON.parse(JSON.stringify(a))));
    assert.equal(JSON.stringify(payload), before);
    runFeature(payload);
    assert.equal(JSON.stringify(payload), before);
  });
});
