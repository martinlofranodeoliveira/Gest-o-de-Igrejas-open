import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_fullname_duplicate_groups_core.mjs";

describe("member fullname duplicate groups core", () => {
  it("rejects non-array payload with TypeError", () => {
    for (const bad of [null, undefined, 1, "x", {}, { length: 0 }]) {
      assert.throws(() => runFeature(bad), (err) => err instanceof TypeError && err.message === "INVALID_MEMBER_FULLNAME_DUPLICATE_ROOT");
    }
  });
  it("rejects array longer than 1000 with RangeError", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ fullName: "A Sintetico" });
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "MEMBER_FULLNAME_DUPLICATE_LIMIT");
  });
  it("returns zeros for empty array", () => {
    assert.deepEqual(runFeature([]), { rowCount: 0, invalidRowCount: 0, validRowCount: 0, groupCount: 0, duplicateRowCount: 0, groups: [] });
  });
  it("counts invalid rows and excludes them from grouping", () => {
    const out = runFeature([null, 1, "x", [1], { fullName: "A Sintetica" }, { fullName: "A Sintetica" }]);
    assert.equal(out.invalidRowCount, 4);
    assert.equal(out.validRowCount, 2);
    assert.equal(out.rowCount, 6);
    assert.deepEqual(out.groups, [[4, 5]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.duplicateRowCount, 2);
  });
  it("ignores missing non-string empty fullName and groups exact matches only", () => {
    const out = runFeature([{ email: "a@exemplo.test" }, { fullName: 1 }, { fullName: "" }, { fullName: "Ana Sintetica" }, { fullName: "ana sintetica" }, { fullName: "Ana Sintetica " }, { fullName: "Ana Sintetica" }]);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.validRowCount, 7);
    assert.equal(out.rowCount, 7);
    assert.deepEqual(out.groups, [[3, 6]]);
    assert.equal(out.groupCount, 1);
    assert.equal(out.duplicateRowCount, 2);
  });
  it("matches contract examples", () => {
    assert.deepEqual(runFeature([{ fullName: "Ana Sintetica" }, { fullName: "Bruno Sintetico" }, { fullName: "Ana Sintetica" }]), { rowCount: 3, invalidRowCount: 0, validRowCount: 3, groupCount: 1, duplicateRowCount: 2, groups: [[0, 2]] });
    assert.deepEqual(runFeature([null, { fullName: "" }, { fullName: "X Sintetico" }, { email: "a@exemplo.test" }]), { rowCount: 4, invalidRowCount: 1, validRowCount: 3, groupCount: 0, duplicateRowCount: 0, groups: [] });
  });
  it("orders groups by first index and sums duplicate rows", () => {
    const out = runFeature([{ fullName: "B Sintetico" }, { fullName: "A Sintetica" }, { fullName: "B Sintetico" }, { fullName: "A Sintetica" }, { fullName: "A Sintetica" }, { fullName: "Solo" }]);
    assert.deepEqual(out.groups, [[0, 2], [1, 3, 4]]);
    assert.equal(out.groupCount, 2);
    assert.equal(out.duplicateRowCount, 5);
    assert.equal(out.rowCount, 6);
  });
  it("returns fresh object and never mutates input", () => {
    const input = [{ fullName: "A Sintetica" }, { fullName: "A Sintetica" }, null];
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.deepEqual(a, b);
    assert.notEqual(a, b);
    assert.notEqual(a.groups, b.groups);
    assert.deepEqual(Object.keys(a).sort(), ["duplicateRowCount", "groupCount", "groups", "invalidRowCount", "rowCount", "validRowCount"]);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  });
});
