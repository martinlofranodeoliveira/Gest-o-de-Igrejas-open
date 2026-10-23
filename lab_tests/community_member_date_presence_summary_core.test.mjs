import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_date_presence_summary_core.mjs";

describe("member date presence summary core", () => {
  it("rejects non-array payload with TypeError", () => {
    for (const bad of [null, undefined, 1, "x", {}, { length: 0 }]) {
      assert.throws(() => runFeature(bad), (err) => err instanceof TypeError && err.message === "INVALID_MEMBER_DATE_PRESENCE_ROOT");
    }
  });
  it("rejects length over 1000 with RangeError", () => {
    const big = [];
    for (let n = 0; n < 1001; n += 1) {
      big.push({});
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "MEMBER_DATE_PRESENCE_LIMIT");
    assert.strictEqual(big.length, 1001);
  });
  it("returns all zero counts for empty array", () => {
    const input = [];
    const out = runFeature(input);
    assert.deepStrictEqual(out, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      birthMissingCount: 0,
      birthEmptyCount: 0,
      birthPresentCount: 0,
      birthUnknownCount: 0,
      baptismMissingCount: 0,
      baptismEmptyCount: 0,
      baptismPresentCount: 0,
      baptismUnknownCount: 0
    });
    assert.deepStrictEqual(Object.keys(out).sort(), ["baptismEmptyCount", "baptismMissingCount", "baptismPresentCount", "baptismUnknownCount", "birthEmptyCount", "birthMissingCount", "birthPresentCount", "birthUnknownCount", "invalidRowCount", "rowCount", "validRowCount"]);
    assert.deepStrictEqual(input, []);
  });
  it("matches first contract example", () => {
    const out = runFeature([
      { baptismDate: "2010-05-06", birthDate: "1990-01-01" },
      { baptismDate: "", birthDate: "" },
      { fullName: "Sintetico" }
    ]);
    assert.deepStrictEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      birthMissingCount: 1,
      birthEmptyCount: 1,
      birthPresentCount: 1,
      birthUnknownCount: 0,
      baptismMissingCount: 1,
      baptismEmptyCount: 1,
      baptismPresentCount: 1,
      baptismUnknownCount: 0
    });
  });
  it("matches second contract example with invalid rows", () => {
    const out = runFeature([null, { baptismDate: "2020-02-02", birthDate: 123 }, { baptismDate: null, birthDate: "" }, []]);
    assert.deepStrictEqual(out, {
      rowCount: 4,
      invalidRowCount: 2,
      validRowCount: 2,
      birthMissingCount: 0,
      birthEmptyCount: 1,
      birthPresentCount: 0,
      birthUnknownCount: 1,
      baptismMissingCount: 0,
      baptismEmptyCount: 0,
      baptismPresentCount: 1,
      baptismUnknownCount: 1
    });
  });
  it("counts invalid rows only and ignores other keys", () => {
    const out = runFeature([
      "nope",
      42,
      undefined,
      { id: "1", fullName: "A", email: "a@x.y", phone: "1", address: "s", status: "active", isTither: true, notes: "n", createdAt: "t" },
      { id: "2", fullName: "B", email: "b@x.y", phone: "2", address: "s", status: "active", isTither: false, notes: "m", createdAt: "t", birthDate: "2000-01-01", baptismDate: "2020-01-01" }
    ]);
    assert.strictEqual(out.rowCount, 5);
    assert.strictEqual(out.invalidRowCount, 3);
    assert.strictEqual(out.validRowCount, 2);
    assert.strictEqual(out.birthMissingCount, 1);
    assert.strictEqual(out.birthPresentCount, 1);
    assert.strictEqual(out.baptismMissingCount, 1);
    assert.strictEqual(out.baptismPresentCount, 1);
    assert.strictEqual(out.birthMissingCount + out.birthEmptyCount + out.birthPresentCount + out.birthUnknownCount, out.validRowCount);
    assert.strictEqual(out.baptismMissingCount + out.baptismEmptyCount + out.baptismPresentCount + out.baptismUnknownCount, out.validRowCount);
  });
  it("is deterministic with fresh JSON-compatible allocation and no trim or coercion", () => {
    const input = [{ birthDate: " ", baptismDate: 0 }, { birthDate: false, baptismDate: undefined }];
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    assert.deepStrictEqual(a, b);
    assert.notStrictEqual(a, b);
    assert.strictEqual(a.birthPresentCount, 1);
    assert.strictEqual(a.birthUnknownCount, 1);
    assert.strictEqual(a.baptismUnknownCount, 2);
    assert.strictEqual(JSON.stringify(input), before);
    const round = JSON.parse(JSON.stringify(a));
    assert.deepStrictEqual(round, a);
  });
});
