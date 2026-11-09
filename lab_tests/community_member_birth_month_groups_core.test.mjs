import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_birth_month_groups_core.mjs";

describe("member birth month groups core", () => {
  it("throws TypeError for non-array payload", () => {
    for (const bad of [null, undefined, {}, "x", 42, true]) {
      assert.throws(() => runFeature(bad), (e) => e instanceof TypeError && e.message === "INVALID_MEMBER_BIRTH_MONTH_ROOT");
    }
  });
  it("throws RangeError over 1000 rows", () => {
    const big = [];
    for (const item of Array.from({ length: 1001 })) {
      void item;
      big.push({ birthDate: "2000-01-01" });
    }
    assert.throws(() => runFeature(big), (e) => e instanceof RangeError && e.message === "MEMBER_BIRTH_MONTH_LIMIT");
  });
  it("empty array returns all zeros", () => {
    assert.deepStrictEqual(runFeature([]), { rowCount: 0, invalidRowCount: 0, validRowCount: 0, missingCount: 0, invalidDateCount: 0, withBirthdayCount: 0, groupCount: 0, groups: [] });
  });
  it("matches first contract example", () => {
    const out = runFeature([{ birthDate: "2000-01-15" }, { birthDate: "1999-03-02" }, { birthDate: "" }]);
    assert.deepStrictEqual(out, { rowCount: 3, invalidRowCount: 0, validRowCount: 3, missingCount: 1, invalidDateCount: 0, withBirthdayCount: 2, groupCount: 2, groups: [{ month: "01", count: 1, indexes: [0] }, { month: "03", count: 1, indexes: [1] }] });
  });
  it("matches second contract example", () => {
    const out = runFeature([null, { birthDate: "2023-13-01" }, { birthDate: "2020-02-29", fullName: "Ana" }, { birthDate: 123 }]);
    assert.deepStrictEqual(out, { rowCount: 4, invalidRowCount: 1, validRowCount: 3, missingCount: 0, invalidDateCount: 2, withBirthdayCount: 1, groupCount: 1, groups: [{ month: "02", count: 1, indexes: [2] }] });
  });
  it("counts invalid rows and ignores other keys", () => {
    const out = runFeature([null, 7, "s", [1], { birthDate: "2001-05-10", id: "x", fullName: "A", email: "a@b", phone: "1", address: "r", baptismDate: "2020-01-01", status: "a", isTither: true, notes: "n", createdAt: "t" }]);
    assert.strictEqual(out.invalidRowCount, 4);
    assert.strictEqual(out.validRowCount, 1);
    assert.strictEqual(out.rowCount, 5);
    assert.strictEqual(out.withBirthdayCount, 1);
    assert.deepStrictEqual(out.groups, [{ month: "05", count: 1, indexes: [4] }]);
  });
  it("missing for absent or empty birthDate", () => {
    const out = runFeature([{}, { other: 1 }, { birthDate: "" }]);
    assert.strictEqual(out.validRowCount, 3);
    assert.strictEqual(out.missingCount, 3);
    assert.strictEqual(out.invalidDateCount, 0);
    assert.strictEqual(out.withBirthdayCount, 0);
    assert.strictEqual(out.groupCount, 0);
  });
  it("rejects malformed shapes without Date", () => {
    const bad = ["0000-01-10", "2000-00-10", "2000-13-10", "2000-01-00", "2000-01-32", "2000/01/10", "2000-1-10", "20-01-10", "2000-01-3a", 0, null, undefined, true, {}, []];
    const rows = [];
    for (const v of bad) {
      rows.push({ birthDate: v });
    }
    const out = runFeature(rows);
    assert.strictEqual(out.validRowCount, rows.length);
    assert.strictEqual(out.invalidDateCount, rows.length);
    assert.strictEqual(out.missingCount, 0);
    assert.strictEqual(out.withBirthdayCount, 0);
  });
  it("groups ordered 01 to 12 with ascending indexes", () => {
    const out = runFeature([{ birthDate: "2000-03-01" }, { birthDate: "2000-01-01" }, { birthDate: "2000-03-02" }, { birthDate: "2000-12-31" }]);
    assert.deepStrictEqual(out.groups, [{ month: "01", count: 1, indexes: [1] }, { month: "03", count: 2, indexes: [0, 2] }, { month: "12", count: 1, indexes: [3] }]);
    assert.strictEqual(out.groupCount, 3);
    assert.strictEqual(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.strictEqual(out.validRowCount, out.missingCount + out.invalidDateCount + out.withBirthdayCount);
  });
  it("returns fresh object with eight keys and preserves input", () => {
    const input = [{ birthDate: "2000-02-10" }, { birthDate: "" }];
    const snap = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.strictEqual(JSON.stringify(input), snap);
    assert.deepStrictEqual(Object.keys(a).sort(), ["groupCount", "groups", "invalidDateCount", "invalidRowCount", "missingCount", "rowCount", "validRowCount", "withBirthdayCount"].sort());
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a.groups, b.groups);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), a);
  });
});
