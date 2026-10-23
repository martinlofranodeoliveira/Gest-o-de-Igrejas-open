import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_phone_duplicate_groups_core.mjs";

describe("member phone duplicate groups core", () => {
  it("rejects non-array root with TypeError", () => {
    const bad = [null, undefined, {}, "x", 42, true];
    for (const value of bad) {
      assert.throws(() => runFeature(value), (err) => err instanceof TypeError && err.message === "INVALID_MEMBER_PHONE_DUPLICATE_ROOT");
    }
  });

  it("enforces 1000 limit", () => {
    const big = [];
    for (let n = 0; n < 1001; n += 1) {
      big.push({ phone: "555-0100" });
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "MEMBER_PHONE_DUPLICATE_LIMIT");
    const ok = [];
    for (let n = 0; n < 1000; n += 1) {
      ok.push({ phone: "" });
    }
    const out = runFeature(ok);
    assert.equal(out.rowCount, 1000);
    assert.equal(out.validRowCount, 1000);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.groupCount, 0);
  });

  it("handles empty array with fresh object", () => {
    const a = runFeature([]);
    const b = runFeature([]);
    assert.deepEqual(a, { rowCount: 0, invalidRowCount: 0, validRowCount: 0, groupCount: 0, duplicateRowCount: 0, groups: [] });
    assert.notEqual(a, b);
    assert.notEqual(a.groups, b.groups);
  });

  it("matches first contract example", () => {
    const out = runFeature([{ phone: "555-0100" }, { phone: "555-0200" }, { phone: "555-0100" }]);
    assert.deepEqual(out, { rowCount: 3, invalidRowCount: 0, validRowCount: 3, groupCount: 1, duplicateRowCount: 2, groups: [[0, 2]] });
  });

  it("matches second contract example", () => {
    const out = runFeature([null, { phone: "" }, { phone: "555-0300" }, { fullName: "Sintetico" }]);
    assert.deepEqual(out, { rowCount: 4, invalidRowCount: 1, validRowCount: 3, groupCount: 0, duplicateRowCount: 0, groups: [] });
  });

  it("classifies invalid rows and keeps exact-match order", () => {
    const out = runFeature([
      { phone: "B" },
      { phone: "A" },
      "oops",
      { phone: "B" },
      ["phone"],
      { phone: "A" },
      { phone: "C" },
      7
    ]);
    assert.equal(out.rowCount, 8);
    assert.equal(out.invalidRowCount, 3);
    assert.equal(out.validRowCount, 5);
    assert.deepEqual(out.groups, [[0, 3], [1, 5]]);
    assert.equal(out.groupCount, 2);
    assert.equal(out.duplicateRowCount, 4);
  });

  it("ignores empty missing non-string and trims nothing", () => {
    const out = runFeature([
      { phone: "555-0100" },
      { phone: "" },
      {},
      { phone: 123 },
      { phone: null },
      { phone: " 555-0100" },
      { phone: "555-0100 " },
      { phone: "555-0100" }
    ]);
    assert.deepEqual(out.groups, [[0, 7]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.duplicateRowCount, 2);
    assert.equal(out.validRowCount, 8);
  });

  it("ignores extra keys but groups on phone", () => {
    const out = runFeature([
      { id: "a", fullName: "Ana", phone: "999", email: "a@x" },
      { phone: "999", notes: "hi" },
      { phone: "111" }
    ]);
    assert.deepEqual(out.groups, [[0, 1]]);
    assert.equal(out.rowCount, 3);
  });

  it("is pure with fresh JSON result and no input mutation", () => {
    const input = [{ phone: "555-0100" }, { phone: "555-0100" }];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.notEqual(first.groups, second.groups);
    assert.notEqual(first.groups[0], second.groups[0]);
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.deepEqual(Object.keys(first).sort(), ["duplicateRowCount", "groupCount", "groups", "invalidRowCount", "rowCount", "validRowCount"]);
  });
});
