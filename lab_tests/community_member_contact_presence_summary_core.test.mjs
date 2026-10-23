import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_contact_presence_summary_core.mjs";

describe("member contact presence summary core", () => {
  it("rejects non-array payload with TypeError", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_MEMBER_CONTACT_PRESENCE_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_MEMBER_CONTACT_PRESENCE_ROOT" });
    assert.throws(() => runFeature("email"), { name: "TypeError", message: "INVALID_MEMBER_CONTACT_PRESENCE_ROOT" });
    assert.throws(() => runFeature(123), { name: "TypeError", message: "INVALID_MEMBER_CONTACT_PRESENCE_ROOT" });
    assert.throws(() => runFeature({ length: 0 }), { name: "TypeError", message: "INVALID_MEMBER_CONTACT_PRESENCE_ROOT" });
  });

  it("rejects arrays longer than 1000 with RangeError", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ email: "a@exemplo.test", phone: "1" });
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "MEMBER_CONTACT_PRESENCE_LIMIT" });
  });

  it("accepts exactly 1000 rows", () => {
    const items = [];
    for (let i = 0; i < 1000; i = i + 1) {
      items.push({ email: "a@exemplo.test", phone: "1" });
    }
    const out = runFeature(items);
    assert.equal(out.rowCount, 1000);
    assert.equal(out.validRowCount, 1000);
    assert.equal(out.invalidRowCount, 0);
  });

  it("returns all zero counts for empty array with fresh object", () => {
    const a = runFeature([]);
    assert.deepEqual(a, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      emailMissingCount: 0,
      emailEmptyCount: 0,
      emailPresentCount: 0,
      emailUnknownCount: 0,
      phoneMissingCount: 0,
      phoneEmptyCount: 0,
      phonePresentCount: 0,
      phoneUnknownCount: 0
    });
    const b = runFeature([]);
    assert.notEqual(a, b);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
  });

  it("matches first contract example", () => {
    const out = runFeature([
      { email: "a@exemplo.test", phone: "111" },
      { email: "", phone: "" },
      { fullName: "Sintetico" }
    ]);
    assert.equal(out.rowCount, 3);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.invalidRowCount, 0);
    assert.equal(out.emailPresentCount, 1);
    assert.equal(out.emailEmptyCount, 1);
    assert.equal(out.emailMissingCount, 1);
    assert.equal(out.emailUnknownCount, 0);
    assert.equal(out.phonePresentCount, 1);
    assert.equal(out.phoneEmptyCount, 1);
    assert.equal(out.phoneMissingCount, 1);
    assert.equal(out.phoneUnknownCount, 0);
  });

  it("matches second contract example", () => {
    const out = runFeature([null, { email: 123, phone: null }, { email: "x@exemplo.test" }, { phone: "" }]);
    assert.equal(out.rowCount, 4);
    assert.equal(out.validRowCount, 3);
    assert.equal(out.invalidRowCount, 1);
    assert.equal(out.emailMissingCount, 1);
    assert.equal(out.emailPresentCount, 1);
    assert.equal(out.emailUnknownCount, 1);
    assert.equal(out.emailEmptyCount, 0);
    assert.equal(out.phoneMissingCount, 1);
    assert.equal(out.phoneUnknownCount, 1);
    assert.equal(out.phoneEmptyCount, 1);
    assert.equal(out.phonePresentCount, 0);
  });

  it("counts null, non-object and array rows as invalid only", () => {
    const out = runFeature([null, undefined, 0, "x", true, ["email"], { email: "a@exemplo.test", phone: "p" }]);
    assert.equal(out.rowCount, 7);
    assert.equal(out.invalidRowCount, 6);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.emailPresentCount, 1);
    assert.equal(out.phonePresentCount, 1);
    assert.equal(out.emailMissingCount + out.emailEmptyCount + out.emailPresentCount + out.emailUnknownCount, 1);
    assert.equal(out.phoneMissingCount + out.phoneEmptyCount + out.phonePresentCount + out.phoneUnknownCount, 1);
  });

  it("ignores unrelated keys without copying or error", () => {
    const out = runFeature([{ id: "1", fullName: "Ana", address: "Rua", status: "active", isTither: true, notes: "n" }]);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.emailMissingCount, 1);
    assert.equal(out.phoneMissingCount, 1);
    assert.equal(out.emailPresentCount, 0);
    assert.equal(out.phonePresentCount, 0);
  });

  it("applies unknown for non-string and empty only for zero length without trim", () => {
    const out = runFeature([
      { email: 0, phone: false },
      { email: null, phone: undefined },
      { email: " ", phone: "  " },
      { email: "", phone: "" }
    ]);
    assert.equal(out.validRowCount, 4);
    assert.equal(out.emailUnknownCount, 2);
    assert.equal(out.phoneUnknownCount, 2);
    assert.equal(out.emailPresentCount, 1);
    assert.equal(out.phonePresentCount, 1);
    assert.equal(out.emailEmptyCount, 1);
    assert.equal(out.phoneEmptyCount, 1);
    assert.equal(out.emailMissingCount, 0);
    assert.equal(out.phoneMissingCount, 0);
  });

  it("returns exactly eleven keys with consistent sums and JSON compatibility", () => {
    const input = [{ email: "a@exemplo.test", phone: "1" }, null, {}];
    const out = runFeature(input);
    assert.deepEqual(Object.keys(out).sort(), ["emailEmptyCount", "emailMissingCount", "emailPresentCount", "emailUnknownCount", "invalidRowCount", "phoneEmptyCount", "phoneMissingCount", "phonePresentCount", "phoneUnknownCount", "rowCount", "validRowCount"]);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.equal(out.emailMissingCount + out.emailEmptyCount + out.emailPresentCount + out.emailUnknownCount, out.validRowCount);
    assert.equal(out.phoneMissingCount + out.phoneEmptyCount + out.phonePresentCount + out.phoneUnknownCount, out.validRowCount);
    const round = JSON.parse(JSON.stringify(out));
    assert.deepEqual(round, out);
  });

  it("does not mutate input and allocates fresh result per call", () => {
    const input = [{ email: "a@exemplo.test", phone: "1" }, { email: "", phone: null }];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.equal(JSON.stringify(input), before);
    first.rowCount = 9999;
    const third = runFeature(input);
    assert.notEqual(third.rowCount, 9999);
  });

  it("discarding result leaves no side effect", () => {
    const input = [{ email: "a@exemplo.test", phone: "1" }];
    runFeature(input);
    const out = runFeature(input);
    assert.equal(out.rowCount, 1);
    assert.equal(out.emailPresentCount, 1);
    assert.equal(out.phonePresentCount, 1);
  });
});
