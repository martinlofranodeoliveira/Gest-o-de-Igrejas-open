import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_birthdate_shape_core.mjs";

describe("root and limit", () => {
  it("throws TypeError for non-array payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_MEMBER_BIRTHDATE_SHAPE_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_MEMBER_BIRTHDATE_SHAPE_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_MEMBER_BIRTHDATE_SHAPE_ROOT" });
    assert.throws(() => runFeature("x"), { name: "TypeError", message: "INVALID_MEMBER_BIRTHDATE_SHAPE_ROOT" });
    assert.throws(() => runFeature(123), { name: "TypeError", message: "INVALID_MEMBER_BIRTHDATE_SHAPE_ROOT" });
  });
  it("throws RangeError over 1000 rows", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({});
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "MEMBER_BIRTHDATE_SHAPE_LIMIT" });
  });
  it("empty array returns all zero counts", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      birthDateValidCount: 0,
      birthDateEmptyCount: 0,
      birthDateMissingCount: 0,
      birthDateInvalidCount: 0
    });
  });
});

describe("row counting", () => {
  it("null non-object and array rows count as invalid once", () => {
    const out = runFeature([null, 123, "s", true, undefined, [], [1]]);
    assert.equal(out.rowCount, 7);
    assert.equal(out.invalidRowCount, 7);
    assert.equal(out.validRowCount, 0);
    assert.equal(out.birthDateValidCount, 0);
    assert.equal(out.birthDateEmptyCount, 0);
    assert.equal(out.birthDateMissingCount, 0);
    assert.equal(out.birthDateInvalidCount, 0);
  });
  it("object rows increment validRowCount and rowCount equals sum", () => {
    const out = runFeature([null, {}, { birthDate: "2000-01-15" }]);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.validRowCount, 2);
    assert.equal(out.rowCount, 3);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
  });
  it("extra keys are ignored without error", () => {
    const out = runFeature([{ id: 1, email: "a@b.c", fullName: "N", phone: "1", address: "a", baptismDate: "2020-01-01", status: "x", isTither: true, notes: "n", createdAt: "y", birthDate: "2000-01-15" }]);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.birthDateValidCount, 1);
  });
});

describe("shape kinds", () => {
  it("contract example one", () => {
    const out = runFeature([{ birthDate: "2000-02-29" }, { birthDate: "" }, {}, { birthDate: "2023-02-30" }]);
    assert.deepEqual(out, {
      rowCount: 4,
      invalidRowCount: 0,
      validRowCount: 4,
      birthDateValidCount: 1,
      birthDateEmptyCount: 1,
      birthDateMissingCount: 1,
      birthDateInvalidCount: 1
    });
  });
  it("contract example two", () => {
    const out = runFeature([null, { birthDate: 123 }, { birthDate: "0100-01-01" }]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 1,
      validRowCount: 2,
      birthDateValidCount: 1,
      birthDateEmptyCount: 0,
      birthDateMissingCount: 0,
      birthDateInvalidCount: 1
    });
  });
  it("missing non-string and empty kinds", () => {
    const out = runFeature([{}, { birthDate: null }, { birthDate: 123 }, { birthDate: true }, { birthDate: {} }, { birthDate: "" }]);
    assert.equal(out.validRowCount, 6);
    assert.equal(out.birthDateMissingCount, 1);
    assert.equal(out.birthDateInvalidCount, 4);
    assert.equal(out.birthDateEmptyCount, 1);
    assert.equal(out.birthDateValidCount, 0);
    assert.equal(out.validRowCount, out.birthDateValidCount + out.birthDateEmptyCount + out.birthDateMissingCount + out.birthDateInvalidCount);
  });
  it("invalid formats without trim or coercion", () => {
    const rows = [
      { birthDate: "2023-1-01" },
      { birthDate: "23-01-01" },
      { birthDate: "2023/01/01" },
      { birthDate: "2023-01-0x" },
      { birthDate: " 2023-01-01" },
      { birthDate: "2023-01-01 " },
      { birthDate: "2023-13-01" },
      { birthDate: "2023-00-10" },
      { birthDate: "2023-04-31" },
      { birthDate: "0099-01-01" },
      { birthDate: "0000-01-01" },
      { birthDate: "2023-01-32" }
    ];
    const out = runFeature(rows);
    assert.equal(out.validRowCount, 12);
    assert.equal(out.birthDateInvalidCount, 12);
    assert.equal(out.birthDateValidCount, 0);
  });
});

describe("leap and boundaries", () => {
  it("leap and boundary cases hold", () => {
    const out = runFeature([
      { birthDate: "2000-02-29" },
      { birthDate: "1900-02-29" },
      { birthDate: "2023-02-30" },
      { birthDate: "0100-01-01" },
      { birthDate: "9999-12-31" }
    ]);
    assert.equal(out.birthDateValidCount, 3);
    assert.equal(out.birthDateInvalidCount, 2);
  });
  it("additional calendar checks", () => {
    assert.equal(runFeature([{ birthDate: "2024-02-29" }]).birthDateValidCount, 1);
    assert.equal(runFeature([{ birthDate: "2023-02-29" }]).birthDateInvalidCount, 1);
    assert.equal(runFeature([{ birthDate: "2023-04-30" }]).birthDateValidCount, 1);
    assert.equal(runFeature([{ birthDate: "2023-02-28" }]).birthDateValidCount, 1);
    assert.equal(runFeature([{ birthDate: "2023-01-00" }]).birthDateInvalidCount, 1);
  });
});

describe("return purity", () => {
  it("holds exact keys fresh allocation and no mutation", () => {
    const payload = [{ birthDate: "2000-01-15" }, {}];
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    assert.deepEqual(Object.keys(a).sort(), ["birthDateEmptyCount", "birthDateInvalidCount", "birthDateMissingCount", "birthDateValidCount", "invalidRowCount", "rowCount", "validRowCount"].sort());
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(payload), before);
    assert.equal(JSON.parse(JSON.stringify(a)).rowCount, 2);
  });
  it("discarding result writes nothing and stays deterministic", () => {
    runFeature([{ birthDate: "2000-01-15" }]);
    const out = runFeature([{ birthDate: "2000-01-15" }]);
    assert.equal(out.birthDateValidCount, 1);
    assert.equal(out.rowCount, 1);
  });
});
