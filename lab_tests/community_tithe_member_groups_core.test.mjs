import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_member_groups_core.mjs";

describe("tithe member groups core", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_MEMBER_GROUPS_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_MEMBER_GROUPS_ROOT" });
    assert.throws(() => runFeature("x"), { name: "TypeError", message: "INVALID_TITHE_MEMBER_GROUPS_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_MEMBER_GROUPS_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_MEMBER_GROUPS_ROOT" });
  });

  it("enforces 1000 limit and handles empty array", () => {
    const empty = runFeature([]);
    assert.deepEqual(empty, { rowCount: 0, invalidRowCount: 0, validRowCount: 0, groupCount: 0, groupedRowCount: 0, groups: [] });
    const big = [];
    for (let n = 0; n < 1001; n = n + 1) {
      big.push({ memberId: "m-1" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_MEMBER_GROUPS_LIMIT" });
    const edge = [];
    for (let n = 0; n < 1000; n = n + 1) {
      edge.push({ memberId: "solo" });
    }
    const out = runFeature(edge);
    assert.equal(out.rowCount, 1000);
    assert.equal(out.validRowCount, 1000);
    assert.equal(out.groupCount, 1);
  });

  it("matches first documented example", () => {
    const out = runFeature([{ memberId: "m-1" }, { memberId: "m-2" }, { memberId: "m-1" }]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.groupCount, 1);
    assert.equal(out.groupedRowCount, 2);
    assert.deepEqual(out.groups, [[0, 2]]);
  });

  it("matches second documented example", () => {
    const out = runFeature([null, { memberId: "" }, { memberId: "m-9" }, { fullName: "Sintetico" }]);
    assert.deepEqual(out, { rowCount: 4, invalidRowCount: 1, validRowCount: 3, groupCount: 0, groupedRowCount: 0, groups: [] });
  });

  it("counts null, primitives and arrays as invalid", () => {
    const out = runFeature([null, 7, "s", true, [1], { memberId: "a" }, { memberId: "a" }]);
    assert.equal(out.invalidRowCount, 5);
    assert.equal(out.validRowCount, 2);
    assert.equal(out.rowCount, 7);
    assert.deepEqual(out.groups, [[5, 6]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.groupedRowCount, 2);
  });

  it("ignores missing, empty and non-string memberId with no coercion", () => {
    const out = runFeature([
      {},
      { memberId: "" },
      { memberId: 123 },
      { memberId: "123" },
      { memberId: 123 },
      { memberId: null },
      { memberId: " m-x" },
      { memberId: "m-x" }
    ]);
    assert.equal(out.validRowCount, 8);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.groupCount, 0);
    assert.deepEqual(out.groups, []);
    const exact = runFeature([{ memberId: "M-1" }, { memberId: "m-1" }, { memberId: "M-1" }]);
    assert.deepEqual(exact.groups, [[0, 2]]);
  });

  it("ignores other keys and keeps ascending first-index order", () => {
    const out = runFeature([
      { memberId: "b", memberName: "B", amount: 10 },
      { memberId: "a", id: "x" },
      { memberId: "b", notes: "hi" },
      { memberId: "a", paymentMethod: "pix" },
      { memberId: "solo" }
    ]);
    assert.deepEqual(out.groups, [[0, 2], [1, 3]]);
    assert.equal(out.groupCount, 2);
    assert.equal(out.groupedRowCount, 4);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    for (const g of out.groups) {
      assert.ok(g.length >= 2);
    }
  });

  it("returns fresh JSON-compatible result without mutating input", () => {
    const input = [{ memberId: "m-1" }, { memberId: "m-1" }];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    assert.deepEqual(Object.keys(first).sort(), ["groupCount", "groupedRowCount", "groups", "invalidRowCount", "rowCount", "validRowCount"]);
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.equal(JSON.stringify(input), before);
    const second = runFeature(input);
    assert.notEqual(first, second);
    assert.notEqual(first.groups, second.groups);
    first.groups.push([99]);
    const third = runFeature(input);
    assert.deepEqual(third.groups, [[0, 1]]);
    runFeature(input);
  });
});
