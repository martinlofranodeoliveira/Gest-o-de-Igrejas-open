import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_fullname_shape_core.mjs";

describe("member fullName shape core", () => {
  it("throws TypeError for non-array payloads without exposing raw values", () => {
    const badValues = [null, "hello", 123, 0, true, { fullName: "Ana" }, { length: 1 }, undefined];
    for (const value of badValues) {
      assert.throws(() => runFeature(value), (err) => {
        assert.ok(err instanceof TypeError);
        assert.equal(err.message, "INVALID_MEMBER_FULLNAME_SHAPE_ROOT");
        return true;
      });
    }
    try {
      runFeature("secret-value");
    } catch (err) {
      assert.equal(err.message, "INVALID_MEMBER_FULLNAME_SHAPE_ROOT");
      assert.equal(String(err).includes("secret-value"), false);
    }
  });

  it("throws RangeError over 1000 rows and returns all zeros for empty array", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ fullName: "A" });
    }
    assert.throws(() => runFeature(big), (err) => {
      assert.ok(err instanceof RangeError);
      assert.equal(err.message, "MEMBER_FULLNAME_SHAPE_LIMIT");
      return true;
    });
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      fullNameValidCount: 0,
      fullNameEmptyCount: 0,
      fullNameMissingCount: 0,
      fullNameTooLongCount: 0,
      fullNameInvalidCount: 0
    });
  });

  it("matches first documented example with empty and missing", () => {
    const out = runFeature([
      { fullName: "Maria Sintetica" },
      { fullName: "" },
      { email: "a@exemplo.test" }
    ]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      fullNameValidCount: 1,
      fullNameEmptyCount: 1,
      fullNameMissingCount: 1,
      fullNameTooLongCount: 0,
      fullNameInvalidCount: 0
    });
  });

  it("matches second documented example with invalid row and tooLong", () => {
    const longName = "a".repeat(200);
    assert.ok(longName.length > 120);
    const out = runFeature([
      null,
      { fullName: 123 },
      { extra: 1, fullName: "Joao Sintetico" },
      { fullName: longName }
    ]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.fullNameInvalidCount, 1);
    assert.equal(out.fullNameValidCount, 1);
    assert.equal(out.fullNameTooLongCount, 1);
    assert.equal(out.fullNameEmptyCount, 0);
    assert.equal(out.fullNameMissingCount, 0);
  });

  it("counts null array and non-object rows as invalid only and preserves input", () => {
    const payload = [null, [], [1], "x", 42, true, undefined, { fullName: "Ok" }];
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.equal(out.rowCount, 8);
    assert.equal(out.invalidRowCount, 7);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.fullNameValidCount, 1);
    assert.equal(out.fullNameMissingCount, 0);
    assert.equal(out.fullNameEmptyCount, 0);
    assert.equal(out.fullNameTooLongCount, 0);
    assert.equal(out.fullNameInvalidCount, 0);
    assert.equal(JSON.stringify(payload), before);
  });

  it("ignores all other keys without copying and keeps extra keys untouched", () => {
    const row = {
      id: "1",
      email: "a@test.example",
      phone: "123",
      address: "Rua X",
      birthDate: "2000-01-01",
      baptismDate: "2020-01-01",
      status: "active",
      isTither: true,
      notes: "hello",
      createdAt: "2024-01-01",
      fullName: "Ana Sintetica"
    };
    const before = JSON.stringify(row);
    const out = runFeature([row]);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.fullNameValidCount, 1);
    assert.equal(JSON.stringify(row), before);
    assert.deepEqual(Object.keys(out).sort(), [
      "fullNameEmptyCount",
      "fullNameInvalidCount",
      "fullNameMissingCount",
      "fullNameTooLongCount",
      "fullNameValidCount",
      "invalidRowCount",
      "rowCount",
      "validRowCount"
    ]);
    const missing = runFeature([{ id: "9", email: "b@test.example", phone: "9" }]);
    assert.equal(missing.fullNameMissingCount, 1);
    assert.equal(missing.fullNameValidCount, 0);
  });

  it("distinguishes missing empty valid tooLong and non-string invalid with exact sums", () => {
    const payload = [
      { fullName: "Ana" },
      { fullName: "" },
      { other: 1 },
      { fullName: "a".repeat(121) },
      { fullName: 5 },
      { fullName: null },
      { fullName: true },
      { fullName: {} },
      { fullName: ["x"] },
      {}
    ];
    const out = runFeature(payload);
    assert.equal(out.fullNameValidCount, 1);
    assert.equal(out.fullNameEmptyCount, 1);
    assert.equal(out.fullNameMissingCount, 2);
    assert.equal(out.fullNameTooLongCount, 1);
    assert.equal(out.fullNameInvalidCount, 5);
    assert.equal(out.validRowCount, 10);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.rowCount, 10);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(out.validRowCount, out.fullNameValidCount + out.fullNameEmptyCount + out.fullNameMissingCount + out.fullNameTooLongCount + out.fullNameInvalidCount);
  });

  it("enforces 120 boundary without trimming or coercion", () => {
    const exact = "b".repeat(120);
    const over = "b".repeat(121);
    const out = runFeature([{ fullName: exact }, { fullName: over }, { fullName: "  Ana  " }]);
    assert.equal(out.fullNameValidCount, 2);
    assert.equal(out.fullNameTooLongCount, 1);
    const numeric = runFeature([{ fullName: 0 }]);
    assert.equal(numeric.fullNameInvalidCount, 1);
  });

  it("returns fresh JSON-compatible object deterministically", () => {
    const payload = [{ fullName: "Ana" }, { fullName: "" }];
    const a = runFeature(payload);
    const b = runFeature(payload);
    assert.deepEqual(a, b);
    assert.notStrictEqual(a, b);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
    assert.equal(Object.keys(a).length, 8);
    a.rowCount = 999;
    const c = runFeature(payload);
    assert.equal(c.rowCount, 2);
  });

  it("handles synthetic mixed drafts with extra keys and empty strings without persistence", () => {
    const drafts = [
      { fullName: "", notes: "draft" },
      { fullName: "Carlos Sintetico", id: "x1", email: "c@test.example" },
      { notes: "no name yet" },
      null,
      { fullName: "a".repeat(130) }
    ];
    const before = JSON.stringify(drafts);
    const out = runFeature(drafts);
    assert.equal(out.rowCount, 5);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 4);
    assert.equal(out.fullNameEmptyCount, 1);
    assert.equal(out.fullNameValidCount, 1);
    assert.equal(out.fullNameMissingCount, 1);
    assert.equal(out.fullNameTooLongCount, 1);
    assert.equal(out.fullNameInvalidCount, 0);
    assert.equal(JSON.stringify(drafts), before);
  });
});
