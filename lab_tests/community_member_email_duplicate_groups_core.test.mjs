import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_email_duplicate_groups_core.mjs";

describe("member email duplicate groups core", () => {
  it("throws TypeError for non-array payloads", () => {
    const badValues = [{}, "a@exemplo.test", null, 42];
    for (const bad of badValues) {
      assert.throws(() => runFeature(bad), (err) => {
        assert.equal(err instanceof TypeError, true);
        assert.equal(err.message, "INVALID_MEMBER_EMAIL_DUPLICATE_ROOT");
        return true;
      });
    }
  });

  it("throws RangeError for more than 1000 rows without partial groups", () => {
    const rows = [];
    for (let n = 0; n < 1001; n = n + 1) {
      rows.push({ email: "a@exemplo.test" });
    }
    assert.throws(() => runFeature(rows), (err) => {
      assert.equal(err instanceof RangeError, true);
      assert.equal(err.message, "MEMBER_EMAIL_DUPLICATE_LIMIT");
      return true;
    });
  });

  it("returns empty result for empty array", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      groupCount: 0,
      duplicateRowCount: 0,
      groups: []
    });
  });

  it("groups first and third rows sharing exact email", () => {
    const result = runFeature([
      { email: "a@exemplo.test" },
      { email: "b@exemplo.test" },
      { email: "a@exemplo.test" }
    ]);
    assert.equal(result.rowCount, 3);
    assert.equal(result.invalidRowCount, 0);
    assert.equal(result.validRowCount, 3);
    assert.equal(result.groupCount, 1);
    assert.equal(result.duplicateRowCount, 2);
    assert.deepEqual(result.groups, [[0, 2]]);
  });

  it("counts null as invalid and empty email as valid but ignored", () => {
    const result = runFeature([
      null,
      { email: "" },
      { email: "x@exemplo.test" },
      { fullName: "Sintetico" }
    ]);
    assert.deepEqual(result, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      groupCount: 0,
      duplicateRowCount: 0,
      groups: []
    });
  });

  it("ignores extra keys and non-string emails without error", () => {
    const result = runFeature([
      { email: "a@exemplo.test", fullName: "A", phone: "1", status: "x" },
      { email: 123 },
      { email: null },
      { email: "a@exemplo.test", address: "Rua", notes: "n" }
    ]);
    assert.equal(result.rowCount, 4);
    assert.equal(result.invalidRowCount, 0);
    assert.equal(result.validRowCount, 4);
    assert.equal(result.groupCount, 1);
    assert.equal(result.duplicateRowCount, 2);
    assert.deepEqual(result.groups, [[0, 3]]);
  });

  it("never mutates input, returns fresh objects, discarding writes nothing", () => {
    const input = [
      { email: "a@exemplo.test" },
      { email: "b@exemplo.test" },
      { email: "a@exemplo.test" }
    ];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    runFeature(input);
    assert.equal(JSON.stringify(input), before);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.equal(first === second, false);
    assert.equal(first.groups === second.groups, false);
    first.groups.push([99]);
    assert.deepEqual(second.groups, [[0, 2]]);
    assert.equal(JSON.stringify(input), before);
  });
});
