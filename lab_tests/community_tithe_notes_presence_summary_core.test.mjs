import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_notes_presence_summary_core.mjs";

describe("tithe notes presence summary core", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_NOTES_PRESENCE_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_NOTES_PRESENCE_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_NOTES_PRESENCE_ROOT" });
    assert.throws(() => runFeature("notes"), { name: "TypeError", message: "INVALID_TITHE_NOTES_PRESENCE_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_NOTES_PRESENCE_ROOT" });
  });
  it("enforces 1000 row limit and empty array zeros", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({});
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_NOTES_PRESENCE_LIMIT" });
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      notesMissingCount: 0,
      notesEmptyCount: 0,
      notesPresentCount: 0,
      notesUnknownCount: 0
    });
  });
  it("matches first documented example", () => {
    assert.deepEqual(runFeature([{ notes: "oferta" }, {}, { notes: "" }, { notes: 123 }]), {
      rowCount: 4,
      invalidRowCount: 0,
      validRowCount: 4,
      notesMissingCount: 1,
      notesEmptyCount: 1,
      notesPresentCount: 1,
      notesUnknownCount: 1
    });
  });
  it("matches second documented example with invalid row", () => {
    assert.deepEqual(runFeature([null, { notes: "  x  " }, { notes: "" }, { memberName: "Sintetico" }]), {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      notesMissingCount: 1,
      notesEmptyCount: 1,
      notesPresentCount: 1,
      notesUnknownCount: 0
    });
  });
  it("counts null, primitives and arrays as invalid only", () => {
    const result = runFeature([null, undefined, 7, "n", true, [1], { notes: "ok" }]);
    assert.equal(result.rowCount, 7);
    assert.equal(result.invalidRowCount, 6);
    assert.equal(result.validRowCount, 1);
    assert.equal(result.notesPresentCount, 1);
    assert.equal(result.notesMissingCount, 0);
    assert.equal(result.notesEmptyCount, 0);
    assert.equal(result.notesUnknownCount, 0);
  });
  it("maps missing empty unknown present without trim or coercion", () => {
    const result = runFeature([
      {},
      { notes: "" },
      { notes: " " },
      { notes: 0 },
      { notes: null },
      { notes: false },
      { notes: "0" }
    ]);
    assert.equal(result.validRowCount, 7);
    assert.equal(result.notesMissingCount, 1);
    assert.equal(result.notesEmptyCount, 1);
    assert.equal(result.notesPresentCount, 2);
    assert.equal(result.notesUnknownCount, 3);
  });
  it("ignores other keys without error", () => {
    const result = runFeature([{ id: "1", memberId: "m", memberName: "A", amount: 10, paymentMethod: "pix", contributionDate: "2026-01-01", status: "ok", createdAt: "x", notes: "hi" }]);
    assert.equal(result.validRowCount, 1);
    assert.equal(result.notesPresentCount, 1);
    const missing = runFeature([{ id: "1", memberId: "m", memberName: "A", amount: 10, paymentMethod: "pix", contributionDate: "2026-01-01", status: "ok", createdAt: "x" }]);
    assert.equal(missing.notesMissingCount, 1);
  });
  it("keeps result shape, sums and freshness without input mutation", () => {
    const input = [{ notes: "a" }, { notes: "" }];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(Object.keys(first).sort(), ["invalidRowCount", "notesEmptyCount", "notesMissingCount", "notesPresentCount", "notesUnknownCount", "rowCount", "validRowCount"]);
    assert.equal(first.rowCount, first.validRowCount + first.invalidRowCount);
    assert.equal(first.notesMissingCount + first.notesEmptyCount + first.notesPresentCount + first.notesUnknownCount, first.validRowCount);
    assert.notEqual(first, second);
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(input), before);
  });
});
