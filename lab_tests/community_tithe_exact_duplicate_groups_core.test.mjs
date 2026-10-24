import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_exact_duplicate_groups_core.mjs";

test("root must be array else TypeError", () => {
  assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_EXACT_DUPLICATE_ROOT" });
  assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_EXACT_DUPLICATE_ROOT" });
  assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_EXACT_DUPLICATE_ROOT" });
  assert.throws(() => runFeature("m1"), { name: "TypeError", message: "INVALID_TITHE_EXACT_DUPLICATE_ROOT" });
  assert.throws(() => runFeature(123), { name: "TypeError", message: "INVALID_TITHE_EXACT_DUPLICATE_ROOT" });
});

test("length over 1000 throws RangeError", () => {
  const big = [];
  for (let i = 0; i < 1001; i = i + 1) {
    big.push(null);
  }
  assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_EXACT_DUPLICATE_LIMIT" });
});

test("empty array returns all zeros", () => {
  assert.deepStrictEqual(runFeature([]), {
    rowCount: 0,
    invalidRowCount: 0,
    validRowCount: 0,
    groupCount: 0,
    duplicateRowCount: 0,
    groups: []
  });
});

test("contract example one groups exact triple", () => {
  const input = [
    { amount: 100, contributionDate: "2024-01-15", memberId: "m1" },
    { amount: 100, contributionDate: "2024-01-15", memberId: "m1" },
    { amount: 50, contributionDate: "2024-01-15", memberId: "m1" }
  ];
  assert.deepStrictEqual(runFeature(input), {
    rowCount: 3,
    invalidRowCount: 0,
    validRowCount: 3,
    groupCount: 1,
    duplicateRowCount: 2,
    groups: [[0, 1]]
  });
});

test("contract example two skips null and empty member", () => {
  const input = [
    null,
    { amount: 10, contributionDate: "2024-01-15", memberId: "" },
    { amount: 20, contributionDate: "2024-02-01", memberId: "m1" },
    { amount: 20, contributionDate: "2024-02-01", memberId: "m1" }
  ];
  assert.deepStrictEqual(runFeature(input), {
    rowCount: 4,
    invalidRowCount: 1,
    validRowCount: 3,
    groupCount: 1,
    duplicateRowCount: 2,
    groups: [[2, 3]]
  });
});

test("non-object rows invalid and ineligible triples ungrouped", () => {
  const input = [null, 7, "x", [1, 2], {}, { memberId: "m1" }, { memberId: "m1", contributionDate: "2024-01-01", amount: "10" }];
  const result = runFeature(input);
  assert.strictEqual(result.rowCount, 7);
  assert.strictEqual(result.invalidRowCount, 4);
  assert.strictEqual(result.validRowCount, 3);
  assert.strictEqual(result.groupCount, 0);
  assert.strictEqual(result.duplicateRowCount, 0);
  assert.deepStrictEqual(result.groups, []);
});

test("only exact non-empty string and finite number form keys", () => {
  const input = [
    { memberId: "m1", contributionDate: "2024-01-15", amount: 100 },
    { memberId: " m1", contributionDate: "2024-01-15", amount: 100 },
    { memberId: "M1", contributionDate: "2024-01-15", amount: 100 },
    { memberId: "m1", contributionDate: "2024-01-15", amount: 100 },
    { memberId: "", contributionDate: "2024-01-15", amount: 100 },
    { memberId: "m1", contributionDate: "", amount: 100 },
    { memberId: "m1", contributionDate: "2024-01-15", amount: Number.NaN },
    { memberId: "m1", contributionDate: "2024-01-15", amount: Number.POSITIVE_INFINITY }
  ];
  const result = runFeature(input);
  assert.deepStrictEqual(result.groups, [[0, 3]]);
  assert.strictEqual(result.groupCount, 1);
  assert.strictEqual(result.duplicateRowCount, 2);
  assert.strictEqual(result.rowCount, 8);
  assert.strictEqual(result.invalidRowCount, 0);
  assert.strictEqual(result.validRowCount, 8);
});

test("groups ordered by first index ascending", () => {
  const input = [
    { memberId: "m1", contributionDate: "d1", amount: 10 },
    { memberId: "m2", contributionDate: "d1", amount: 10 },
    { memberId: "m1", contributionDate: "d1", amount: 20 },
    { memberId: "m1", contributionDate: "d1", amount: 20 },
    { memberId: "m2", contributionDate: "d1", amount: 10 }
  ];
  const result = runFeature(input);
  assert.deepStrictEqual(result.groups, [[1, 4], [2, 3]]);
  assert.strictEqual(result.groupCount, 2);
  assert.strictEqual(result.duplicateRowCount, 4);
});

test("other keys ignored without error and input never mutated", () => {
  const input = [
    { id: "a", memberId: "m1", memberName: "Ana", contributionDate: "2024-03-01", amount: 30, paymentMethod: "pix", status: "x", notes: "n", createdAt: "t" },
    { id: "b", memberId: "m1", memberName: "Ana C", contributionDate: "2024-03-01", amount: 30, paymentMethod: "cash", status: "y", notes: "m", createdAt: "u" }
  ];
  const snapshot = JSON.parse(JSON.stringify(input));
  const result = runFeature(input);
  assert.deepStrictEqual(result.groups, [[0, 1]]);
  assert.deepStrictEqual(input, snapshot);
  assert.deepStrictEqual(Object.keys(result).sort(), ["duplicateRowCount", "groupCount", "groups", "invalidRowCount", "rowCount", "validRowCount"]);
});

test("fresh JSON-compatible allocation per call", () => {
  const input = [
    { memberId: "m1", contributionDate: "2024-01-15", amount: 5 },
    { memberId: "m1", contributionDate: "2024-01-15", amount: 5 }
  ];
  const first = runFeature(input);
  const second = runFeature(input);
  assert.deepStrictEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.groups, second.groups);
  assert.notStrictEqual(first.groups[0], second.groups[0]);
  assert.strictEqual(JSON.parse(JSON.stringify(first)).groupCount, 1);
});
