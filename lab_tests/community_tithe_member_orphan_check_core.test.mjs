import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_member_orphan_check_core.mjs";

describe("tithe member orphan check core", () => {
  it("throws TypeError for invalid roots", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature([]), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature("x"), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature({ members: [] }), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature({ tithes: [] }), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature({ members: {}, tithes: [] }), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
    assert.throws(() => runFeature({ members: [], tithes: null }), { name: "TypeError", message: "INVALID_TITHE_MEMBER_ORPHAN_ROOT" });
  });
  it("returns zeros for empty collections and enforces limit", () => {
    assert.deepEqual(runFeature({ members: [], tithes: [] }), {
      memberRowCount: 0,
      memberInvalidRowCount: 0,
      memberValidRowCount: 0,
      distinctMemberIdCount: 0,
      titheRowCount: 0,
      titheInvalidRowCount: 0,
      titheValidRowCount: 0,
      linkedCount: 0,
      orphanCount: 0,
      missingCount: 0,
      orphanIndexes: []
    });
    const bigMembers = [];
    for (let i = 0; i < 1001; i = i + 1) {
      bigMembers.push({ id: "x" });
    }
    assert.throws(() => runFeature({ members: bigMembers, tithes: [] }), { name: "RangeError", message: "TITHE_MEMBER_ORPHAN_LIMIT" });
    const bigTithes = [];
    for (let j = 0; j < 1001; j = j + 1) {
      bigTithes.push({ memberId: "x" });
    }
    assert.throws(() => runFeature({ members: [], tithes: bigTithes }), { name: "RangeError", message: "TITHE_MEMBER_ORPHAN_LIMIT" });
  });
  it("matches first contract example", () => {
    const out = runFeature({
      members: [{ id: "m1" }, { id: "m2" }, { id: "" }],
      tithes: [{ memberId: "m1" }, { memberId: "mx" }, { memberId: "" }]
    });
    assert.equal(out.memberRowCount, 3);
    assert.equal(out.memberValidRowCount, 3);
    assert.equal(out.memberInvalidRowCount, 0);
    assert.equal(out.distinctMemberIdCount, 2);
    assert.equal(out.titheRowCount, 3);
    assert.equal(out.titheValidRowCount, 3);
    assert.equal(out.linkedCount, 1);
    assert.equal(out.orphanCount, 1);
    assert.equal(out.missingCount, 1);
    assert.deepEqual(out.orphanIndexes, [1]);
  });
  it("matches second contract example with invalid rows", () => {
    const out = runFeature({
      members: [null, { fullName: "Sintetico" }, { id: "a" }, { id: "a" }],
      tithes: [null, [], { memberId: "a" }, { memberId: "b" }, {}]
    });
    assert.equal(out.memberRowCount, 4);
    assert.equal(out.memberInvalidRowCount, 1);
    assert.equal(out.memberValidRowCount, 3);
    assert.equal(out.distinctMemberIdCount, 1);
    assert.equal(out.titheRowCount, 5);
    assert.equal(out.titheInvalidRowCount, 2);
    assert.equal(out.titheValidRowCount, 3);
    assert.equal(out.linkedCount, 1);
    assert.equal(out.orphanCount, 1);
    assert.equal(out.missingCount, 1);
    assert.deepEqual(out.orphanIndexes, [3]);
  });
  it("collapses duplicates without trim or coercion", () => {
    const out = runFeature({
      members: [{ id: " a" }, { id: "a" }, { id: "a " }, { id: 5 }, { id: "" }],
      tithes: [{ memberId: " a" }, { memberId: "a" }, { memberId: "a " }]
    });
    assert.equal(out.distinctMemberIdCount, 3);
    assert.equal(out.linkedCount, 3);
    assert.equal(out.orphanCount, 0);
    assert.equal(out.missingCount, 0);
  });
  it("classifies missing orphan linked and keeps ascending indexes", () => {
    const out = runFeature({
      members: [{ id: "k1" }],
      tithes: [{ memberId: "k1" }, { nope: 1 }, { memberId: 9 }, { memberId: "" }, { memberId: "zzz" }, "bad", { memberId: "k1" }]
    });
    assert.equal(out.titheInvalidRowCount, 1);
    assert.equal(out.titheValidRowCount, 6);
    assert.equal(out.linkedCount, 2);
    assert.equal(out.orphanCount, 1);
    assert.equal(out.missingCount, 3);
    assert.deepEqual(out.orphanIndexes, [4]);
    assert.equal(out.titheValidRowCount, out.linkedCount + out.orphanCount + out.missingCount);
    assert.equal(out.orphanIndexes.length, out.orphanCount);
  });
  it("is pure, fresh and preserves input with extra keys ignored", () => {
    const payload = {
      extra: "ignore",
      members: [{ id: "m1", fullName: "A", email: "a@x.com", memberId: "zzz" }],
      tithes: [{ memberId: "m1", id: "t1", amount: 10 }],
      another: 123
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.notEqual(first.orphanIndexes, second.orphanIndexes);
    assert.equal(JSON.stringify(payload), before);
    assert.deepEqual(Object.keys(first).sort(), ["distinctMemberIdCount", "linkedCount", "memberInvalidRowCount", "memberRowCount", "memberValidRowCount", "missingCount", "orphanCount", "orphanIndexes", "titheInvalidRowCount", "titheRowCount", "titheValidRowCount"].sort());
  });
});
