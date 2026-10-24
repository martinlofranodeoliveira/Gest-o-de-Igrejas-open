import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_address_duplicate_groups_core.mjs";

describe("member address duplicate groups core", () => {
  it("throws TypeError for non-array payloads", () => {
    const bad = [null, {}, "x", 42, undefined, true];
    for (const value of bad) {
      assert.throws(() => runFeature(value), (err) => {
        assert.ok(err instanceof TypeError);
        assert.equal(err.message, "INVALID_MEMBER_ADDRESS_DUPLICATE_ROOT");
        return true;
      });
    }
  });

  it("returns empty shape for length 0 and throws RangeError beyond 1000", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      groupCount: 0,
      duplicateRowCount: 0,
      groups: []
    });
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ address: "Rua A" });
    }
    assert.throws(() => runFeature(big), (err) => {
      assert.ok(err instanceof RangeError);
      assert.equal(err.message, "MEMBER_ADDRESS_DUPLICATE_LIMIT");
      return true;
    });
  });

  it("counts null and arrays as invalid without throwing", () => {
    const payload = [null, ["Rua A"], 7, "Rua A", { address: "Rua A" }, { address: "Rua A" }];
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.equal(out.invalidRowCount, 4);
    assert.equal(out.validRowCount, 2);
    assert.equal(out.rowCount, 6);
    assert.deepEqual(out.groups, [[4, 5]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.duplicateRowCount, 2);
    assert.equal(JSON.stringify(payload), before);
  });

  it("groups only exact non-empty string address values", () => {
    const payload = [
      { address: "Rua A 10" },
      { address: "Rua B 20" },
      { address: "Rua A 10" }
    ];
    assert.deepEqual(runFeature(payload), {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      groupCount: 1,
      duplicateRowCount: 2,
      groups: [[0, 2]]
    });
    const mixed = [null, { address: "" }, { address: "Rua C 5" }, { fullName: "Sintetico" }];
    assert.deepEqual(runFeature(mixed), {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      groupCount: 0,
      duplicateRowCount: 0,
      groups: []
    });
  });

  it("ignores missing non-string empty and other keys without coercion", () => {
    const payload = [
      { fullName: "A" },
      { address: 123 },
      { address: "" },
      { address: "  Rua X  " },
      { address: "Rua X" },
      { address: "rua x" },
      { address: "Rua X" },
      { id: "1", fullName: "N", email: "a@b.c", phone: "1", birthDate: "d", baptismDate: "d", status: "s", isTither: true, notes: "n", createdAt: "c", address: "Rua X" }
    ];
    const out = runFeature(payload);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 8);
    assert.equal(out.rowCount, 8);
    assert.deepEqual(out.groups, [[4, 6, 7]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.duplicateRowCount, 3);
  });

  it("orders groups by first-seen address with ascending indexes", () => {
    const payload = [
      { address: "B" },
      { address: "A" },
      { address: "B" },
      { address: "C" },
      { address: "A" },
      { address: "B" }
    ];
    const out = runFeature(payload);
    assert.deepEqual(out.groups, [[0, 2, 5], [1, 4]]);
    assert.equal(out.groupCount, 2);
    assert.equal(out.duplicateRowCount, 5);
    for (const g of out.groups) {
      assert.ok(g.length >= 2);
      for (let i = 1; i < g.length; i = i + 1) {
        assert.ok(g[i - 1] < g[i]);
      }
    }
  });

  it("is fresh JSON-compatible and never mutates input", () => {
    const payload = [{ address: "Rua A 10" }, { address: "Rua A 10" }];
    const snapshot = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.deepEqual(Object.keys(first).sort(), ["duplicateRowCount", "groupCount", "groups", "invalidRowCount", "rowCount", "validRowCount"]);
    assert.equal(first.rowCount, first.validRowCount + first.invalidRowCount);
    assert.notEqual(first, second);
    assert.notEqual(first.groups, second.groups);
    assert.notEqual(first.groups[0], second.groups[0]);
    first.groups[0].push(999);
    assert.deepEqual(second.groups, [[0, 1]]);
    assert.equal(JSON.stringify(payload), snapshot);
    runFeature(payload);
    assert.equal(JSON.stringify(payload), snapshot);
  });
});
