import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_phone_shape_core.mjs";

describe("member phone shape core", () => {
  it("throws TypeError for non-array payloads", () => {
    const badValues = [undefined, null, {}, "x", 42, true];
    for (const bad of badValues) {
      assert.throws(() => runFeature(bad), (err) => err instanceof TypeError && err.message === "INVALID_MEMBER_PHONE_SHAPE_ROOT");
    }
  });

  it("throws RangeError when array longer than 1000", () => {
    const big = [];
    for (let n = 0; n < 1001; n = n + 1) {
      big.push({ phone: "1" });
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "MEMBER_PHONE_SHAPE_LIMIT");
  });

  it("returns all zero counters for empty array", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      phoneValidCount: 0,
      phoneEmptyCount: 0,
      phoneMissingCount: 0,
      phoneTooLongCount: 0,
      phoneInvalidCount: 0
    });
  });

  it("counts null, non-object and array rows as invalid only", () => {
    const out = runFeature([null, 5, "phone", ["phone"], { phone: "11999999999" }]);
    assert.equal(out.invalidRowCount, 4);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.rowCount, 5);
    assert.equal(out.phoneValidCount, 1);
    assert.equal(out.phoneEmptyCount, 0);
    assert.equal(out.phoneMissingCount, 0);
    assert.equal(out.phoneTooLongCount, 0);
    assert.equal(out.phoneInvalidCount, 0);
  });

  it("matches first contract example", () => {
    const out = runFeature([{ phone: "11999999999" }, { phone: "" }, { fullName: "Sintetico" }]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      phoneValidCount: 1,
      phoneEmptyCount: 1,
      phoneMissingCount: 1,
      phoneTooLongCount: 0,
      phoneInvalidCount: 0
    });
  });

  it("matches second contract example", () => {
    const out = runFeature([null, { phone: 123 }, { phone: "01234567890123456789012345678901234567890" }]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 1,
      validRowCount: 2,
      phoneValidCount: 0,
      phoneEmptyCount: 0,
      phoneMissingCount: 0,
      phoneTooLongCount: 1,
      phoneInvalidCount: 1
    });
  });

  it("classifies missing, non-string, empty, tooLong and valid without coercion", () => {
    const missing = runFeature([{ fullName: "Ana", email: "a@b.c", id: "1" }]);
    assert.equal(missing.phoneMissingCount, 1);
    const nonStringA = runFeature([{ phone: 0 }]);
    assert.equal(nonStringA.phoneInvalidCount, 1);
    const nonStringB = runFeature([{ phone: null }]);
    assert.equal(nonStringB.phoneInvalidCount, 1);
    const empty = runFeature([{ phone: "" }]);
    assert.equal(empty.phoneEmptyCount, 1);
    assert.equal(empty.phoneValidCount, 0);
    const spaces = runFeature([{ phone: "  " }]);
    assert.equal(spaces.phoneValidCount, 1);
    const exact40 = runFeature([{ phone: "0123456789012345678901234567890123456789" }]);
    assert.equal(exact40.phoneValidCount, 1);
    assert.equal(exact40.phoneTooLongCount, 0);
    const over40 = runFeature([{ phone: "01234567890123456789012345678901234567890" }]);
    assert.equal(over40.phoneTooLongCount, 1);
    assert.equal(over40.phoneValidCount, 0);
  });

  it("keeps rowCount invariants", () => {
    const payload = [
      null,
      { phone: "ok" },
      { phone: "" },
      { fullName: "NoPhone" },
      { phone: 9 },
      { phone: "01234567890123456789012345678901234567890" },
      "oops"
    ];
    const out = runFeature(payload);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(out.validRowCount, out.phoneValidCount + out.phoneEmptyCount + out.phoneMissingCount + out.phoneTooLongCount + out.phoneInvalidCount);
    assert.equal(out.rowCount, 7);
    assert.equal(out.invalidRowCount, 2);
    assert.equal(out.validRowCount, 5);
  });

  it("returns fresh deep-equal objects without input mutation or retained state", () => {
    const payload = [{ phone: "11999999999" }, { phone: "" }, null];
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepEqual(first, second);
    assert.notStrictEqual(first, second);
    assert.equal(JSON.stringify(payload), before);
    first.rowCount = 999;
    const third = runFeature(payload);
    assert.equal(third.rowCount, 3);
    assert.deepEqual(second, third);
  });

  it("ignores other keys and exposes exactly eight counters", () => {
    const out = runFeature([{ phone: "55", fullName: "Ana", email: "a@b.c", address: "Rua 1", status: "x", notes: "n" }]);
    assert.deepEqual(Object.keys(out).sort(), ["invalidRowCount", "phoneEmptyCount", "phoneInvalidCount", "phoneMissingCount", "phoneTooLongCount", "phoneValidCount", "rowCount", "validRowCount"]);
    assert.equal(out.phoneValidCount, 1);
    assert.equal(out.validRowCount, 1);
  });
});
