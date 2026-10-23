import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_address_notes_presence_summary_core.mjs";

describe("member address notes presence summary core", () => {
  it("throws TypeError for non-array payload", () => {
    for (const bad of [null, undefined, 1, "x", {}, { length: 0 }]) {
      assert.throws(() => runFeature(bad), (err) => err instanceof TypeError && err.message === "INVALID_MEMBER_ADDRESS_NOTES_PRESENCE_ROOT");
    }
  });
  it("throws RangeError when length exceeds 1000", () => {
    const big = [];
    for (let n = 0; n < 1001; n = n + 1) {
      big.push({ address: "Rua A", notes: "n" });
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "MEMBER_ADDRESS_NOTES_PRESENCE_LIMIT");
  });
  it("returns all zeros for empty array with fresh object", () => {
    const first = runFeature([]);
    const second = runFeature([]);
    assert.deepStrictEqual(first, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      addressMissingCount: 0,
      addressEmptyCount: 0,
      addressPresentCount: 0,
      addressUnknownCount: 0,
      notesMissingCount: 0,
      notesEmptyCount: 0,
      notesPresentCount: 0,
      notesUnknownCount: 0
    });
    assert.deepStrictEqual(Object.keys(first).sort(), ["addressEmptyCount", "addressMissingCount", "addressPresentCount", "addressUnknownCount", "invalidRowCount", "notesEmptyCount", "notesMissingCount", "notesPresentCount", "notesUnknownCount", "rowCount", "validRowCount"].sort());
    assert.notStrictEqual(first, second);
  });
  it("counts null, non-object and array rows as invalid only", () => {
    const result = runFeature([null, 7, "Rua", true, undefined, ["x"], { address: "Rua A", notes: "ok" }]);
    assert.strictEqual(result.rowCount, 7);
    assert.strictEqual(result.invalidRowCount, 6);
    assert.strictEqual(result.validRowCount, 1);
    assert.strictEqual(result.addressPresentCount, 1);
    assert.strictEqual(result.notesPresentCount, 1);
    assert.strictEqual(result.addressMissingCount + result.addressEmptyCount + result.addressPresentCount + result.addressUnknownCount, 1);
    assert.strictEqual(result.notesMissingCount + result.notesEmptyCount + result.notesPresentCount + result.notesUnknownCount, 1);
  });
  it("classifies missing, unknown, empty and present without coercion", () => {
    const payload = [
      { address: "Rua A", notes: "rascunho" },
      { address: "", notes: "" },
      { address: 123, notes: null },
      { fullName: "Sintetico" },
      { address: " ", notes: "  " }
    ];
    const result = runFeature(payload);
    assert.strictEqual(result.rowCount, 5);
    assert.strictEqual(result.validRowCount, 5);
    assert.strictEqual(result.invalidRowCount, 0);
    assert.strictEqual(result.addressPresentCount, 2);
    assert.strictEqual(result.addressEmptyCount, 1);
    assert.strictEqual(result.addressUnknownCount, 1);
    assert.strictEqual(result.addressMissingCount, 1);
    assert.strictEqual(result.notesPresentCount, 2);
    assert.strictEqual(result.notesEmptyCount, 1);
    assert.strictEqual(result.notesUnknownCount, 1);
    assert.strictEqual(result.notesMissingCount, 1);
  });
  it("ignores unrelated keys and matches contract examples", () => {
    const first = runFeature([{ address: "Rua A", notes: "rascunho" }, { address: "", notes: "" }, { address: "Rua A" }]);
    assert.deepStrictEqual(first, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      addressMissingCount: 0,
      addressEmptyCount: 1,
      addressPresentCount: 2,
      addressUnknownCount: 0,
      notesMissingCount: 1,
      notesEmptyCount: 1,
      notesPresentCount: 1,
      notesUnknownCount: 0
    });
    const second = runFeature([null, { address: 123, notes: "" }, { fullName: "Sintetico", id: "1", email: "a@b.c", phone: "1", birthDate: "x", baptismDate: "y", status: "z", isTither: true, createdAt: "w" }]);
    assert.deepStrictEqual(second, {
      rowCount: 3,
      invalidRowCount: 1,
      validRowCount: 2,
      addressMissingCount: 1,
      addressEmptyCount: 0,
      addressPresentCount: 0,
      addressUnknownCount: 1,
      notesMissingCount: 1,
      notesEmptyCount: 1,
      notesPresentCount: 0,
      notesUnknownCount: 0
    });
  });
  it("preserves input and returns fresh object per call", () => {
    const payload = [{ address: "Rua A", notes: "x" }, null];
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    assert.strictEqual(JSON.stringify(payload), before);
    assert.deepStrictEqual(a, b);
    assert.notStrictEqual(a, b);
    assert.strictEqual(a.rowCount, a.validRowCount + a.invalidRowCount);
  });
});
