import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_tither_summary_core.mjs";

describe("member tither summary core", () => {
  it("throws TypeError for non-array payload", () => {
    for (const bad of [null, undefined, {}, "x", 5, true]) {
      assert.throws(() => runFeature(bad), (err) => err instanceof TypeError && err.message === "INVALID_MEMBER_TITHER_SUMMARY_ROOT");
    }
  });
  it("throws RangeError when longer than 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ isTither: true });
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "MEMBER_TITHER_SUMMARY_LIMIT");
  });
  it("accepts exactly 1000 rows", () => {
    const ok = [];
    for (let i = 0; i < 1000; i = i + 1) {
      ok.push({ isTither: false });
    }
    const out = runFeature(ok);
    assert.equal(out.rowCount, 1000);
    assert.equal(out.titherFalseCount, 1000);
  });
  it("empty array returns all zeros with fresh object", () => {
    const a = runFeature([]);
    assert.deepEqual(a, { rowCount: 0, invalidRowCount: 0, validRowCount: 0, titherTrueCount: 0, titherFalseCount: 0, titherMissingCount: 0, titherUnknownCount: 0 });
    assert.deepEqual(Object.keys(a).sort(), ["invalidRowCount", "rowCount", "titherFalseCount", "titherMissingCount", "titherTrueCount", "titherUnknownCount", "validRowCount"]);
    const b = runFeature([]);
    assert.notStrictEqual(a, b);
    assert.deepEqual(a, b);
  });
  it("matches first contract example", () => {
    const out = runFeature([{ isTither: true }, { isTither: false }, { fullName: "Sintetico" }]);
    assert.deepEqual(out, { rowCount: 3, invalidRowCount: 0, validRowCount: 3, titherTrueCount: 1, titherFalseCount: 1, titherMissingCount: 1, titherUnknownCount: 0 });
  });
  it("matches second contract example", () => {
    const out = runFeature([null, { isTither: 1 }, { isTither: true }, []]);
    assert.deepEqual(out, { rowCount: 4, invalidRowCount: 2, validRowCount: 2, titherTrueCount: 1, titherFalseCount: 0, titherMissingCount: 0, titherUnknownCount: 1 });
  });
  it("counts null, non-object and array rows as invalid", () => {
    const out = runFeature([null, undefined, 0, "x", true, [], {}, { isTither: true }]);
    assert.equal(out.invalidRowCount, 6);
    assert.equal(out.validRowCount, 2);
    assert.equal(out.rowCount, 8);
    assert.equal(out.titherTrueCount, 1);
    assert.equal(out.titherMissingCount, 1);
    assert.equal(out.titherFalseCount, 0);
    assert.equal(out.titherUnknownCount, 0);
  });
  it("treats non-boolean isTither as unknown with no coercion", () => {
    const out = runFeature([{ isTither: 1 }, { isTither: 0 }, { isTither: "" }, { isTither: "true" }, { isTither: null }, { isTither: {} }, { isTither: [] }, { isTither: 1.5 }]);
    assert.equal(out.validRowCount, 8);
    assert.equal(out.titherUnknownCount, 8);
    assert.equal(out.titherTrueCount, 0);
    assert.equal(out.titherFalseCount, 0);
    assert.equal(out.titherMissingCount, 0);
  });
  it("ignores other own keys without error and never copies", () => {
    const input = [{ id: "1", fullName: "A", email: "a@x.com", phone: "1", address: "r", birthDate: "d", baptismDate: "b", status: "s", notes: "n", createdAt: "c", isTither: true }];
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(out.titherTrueCount, 1);
    assert.equal(JSON.stringify(input), before);
    assert.equal(JSON.stringify(input[0]), before.slice(1, before.length - 1));
  });
  it("keeps invariants and does not retain input", () => {
    const input = [{ isTither: true }, null, { foo: 1 }, { isTither: "x" }];
    const snap = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(out.validRowCount, out.titherTrueCount + out.titherFalseCount + out.titherMissingCount + out.titherUnknownCount);
    assert.equal(JSON.stringify(input), snap);
    input.push({ isTither: true });
    assert.equal(out.rowCount, 4);
    const again = runFeature(input.slice(0, 4));
    assert.deepEqual(again, out);
    assert.notStrictEqual(again, out);
  });
  it("discarding result writes nothing and stays deterministic", () => {
    runFeature([{ isTither: false }]);
    const first = runFeature([{ isTither: false }, { isTither: true }]);
    const second = runFeature([{ isTither: false }, { isTither: true }]);
    assert.deepEqual(first, second);
    assert.notStrictEqual(first, second);
  });
});
