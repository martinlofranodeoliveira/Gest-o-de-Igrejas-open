import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_import_invariant_check_core.mjs";

describe("member import invariant check core", () => {
  it("empty rows with declarations returns zeros and consistent", () => {
    const result = runFeature({ rowCount: 0, validCount: 0, invalidCount: 0, canImport: false, rows: [] });
    assert.deepEqual(result, {
      rowCount: 0,
      validCount: 0,
      invalidCount: 0,
      malformedCount: 0,
      canImportExpected: false,
      declaredConsistent: true,
      indexMismatchCount: 0,
      violationCount: 0,
      mismatchedIndexes: []
    });
  });
  it("consistent two-row preview recomputes and stays consistent", () => {
    const result = runFeature({
      rowCount: 2,
      validCount: 1,
      invalidCount: 1,
      canImport: false,
      rows: [
        { data: { fullName: "Maria Sintetica" }, index: 0, status: "valid" },
        { index: 1, issues: [{ code: "REQUIRED", field: "fullName" }], status: "invalid" }
      ]
    });
    assert.equal(result.rowCount, 2);
    assert.equal(result.validCount, 1);
    assert.equal(result.invalidCount, 1);
    assert.equal(result.malformedCount, 0);
    assert.equal(result.canImportExpected, false);
    assert.equal(result.declaredConsistent, true);
    assert.equal(result.indexMismatchCount, 0);
    assert.equal(result.violationCount, 0);
    assert.deepEqual(result.mismatchedIndexes, []);
    assert.equal(result.rowCount, result.validCount + result.invalidCount + result.malformedCount);
  });
  it("defeats declared-counter shortcut", () => {
    const result = runFeature({
      rowCount: 2,
      validCount: 2,
      invalidCount: 0,
      canImport: true,
      rows: [
        { data: {}, index: 0, status: "valid" },
        { index: 1, issues: [{ code: "ROW_TYPE", field: null }], status: "invalid" }
      ]
    });
    assert.equal(result.validCount, 1);
    assert.equal(result.invalidCount, 1);
    assert.equal(result.canImportExpected, false);
    assert.equal(result.declaredConsistent, false);
    assert.equal(result.violationCount, 1);
  });
  it("uses input order for index check and ignores declared rowCount", () => {
    const result = runFeature({
      rowCount: 99,
      validCount: 2,
      invalidCount: 0,
      canImport: false,
      rows: [
        { data: {}, index: 0, status: "valid" },
        { data: {}, index: 1, status: "valid" },
        { data: {}, index: 5, status: "valid" }
      ]
    });
    assert.equal(result.rowCount, 3);
    assert.equal(result.indexMismatchCount, 1);
    assert.deepEqual(result.mismatchedIndexes, [2]);
    assert.equal(result.declaredConsistent, false);
  });
  it("counts malformed rows once each and forces no import", () => {
    const result = runFeature({
      rowCount: 3,
      validCount: 2,
      invalidCount: 1,
      canImport: false,
      rows: [
        { data: {}, index: 0, status: "valid" },
        null,
        { data: {}, index: 5, status: "valid" }
      ]
    });
    assert.equal(result.rowCount, 3);
    assert.equal(result.validCount, 2);
    assert.equal(result.malformedCount, 1);
    assert.equal(result.canImportExpected, false);
    assert.equal(result.indexMismatchCount, 1);
    assert.deepEqual(result.mismatchedIndexes, [2]);
    assert.equal(result.violationCount, 3);
  });
  it("treats non-object and bad status rows as malformed", () => {
    const result = runFeature({
      rows: [null, 7, [1], { index: 99, status: "unknown" }, { index: 99 }],
      rowCount: 5,
      validCount: 0,
      invalidCount: 0,
      canImport: false
    });
    assert.equal(result.malformedCount, 5);
    assert.equal(result.validCount, 0);
    assert.equal(result.invalidCount, 0);
    assert.equal(result.canImportExpected, false);
    assert.equal(result.indexMismatchCount, 2);
    assert.deepEqual(result.mismatchedIndexes, [3, 4]);
  });
  it("throws for bad root and rows and limit", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_MEMBER_IMPORT_INVARIANT_ROOT" });
    assert.throws(() => runFeature([1]), { name: "TypeError", message: "INVALID_MEMBER_IMPORT_INVARIANT_ROOT" });
    assert.throws(() => runFeature("x"), { name: "TypeError", message: "INVALID_MEMBER_IMPORT_INVARIANT_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_MEMBER_IMPORT_INVARIANT_ROWS" });
    assert.throws(() => runFeature({ rows: "no" }), { name: "TypeError", message: "INVALID_MEMBER_IMPORT_INVARIANT_ROWS" });
    const big = [];
    for (let i = 0; i < 251; i = i + 1) {
      big.push({ index: i, status: "valid" });
    }
    assert.throws(() => runFeature({ rows: big }), { name: "RangeError", message: "MEMBER_IMPORT_INVARIANT_LIMIT" });
  });
  it("never mutates input and returns fresh objects", () => {
    const payload = {
      rowCount: 1,
      validCount: 1,
      invalidCount: 0,
      canImport: true,
      extra: "ignored",
      rows: [{ index: 0, status: "valid", data: { fullName: "A" }, notes: "x" }]
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.equal(JSON.stringify(payload), before);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.notEqual(first.mismatchedIndexes, second.mismatchedIndexes);
    assert.equal(first.canImportExpected, true);
    assert.equal(first.declaredConsistent, true);
  });
});
