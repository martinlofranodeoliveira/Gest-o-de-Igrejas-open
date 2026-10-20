import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { previewMemberImportJson } from "../src/services/memberImportPreview.ts";

function checkThrow(fn, Cls, message) {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof Cls, `expected ${Cls.name}`);
    assert.equal(err.message, message);
    return;
  }
  assert.fail("expected throw " + message);
}

describe("input budgets", () => {
  it("rejects non-string input", () => {
    checkThrow(() => previewMemberImportJson(null), TypeError, "INVALID_MEMBER_IMPORT_INPUT");
    checkThrow(() => previewMemberImportJson(undefined), TypeError, "INVALID_MEMBER_IMPORT_INPUT");
    checkThrow(() => previewMemberImportJson(123), TypeError, "INVALID_MEMBER_IMPORT_INPUT");
    checkThrow(() => previewMemberImportJson([]), TypeError, "INVALID_MEMBER_IMPORT_INPUT");
    checkThrow(() => previewMemberImportJson({}), TypeError, "INVALID_MEMBER_IMPORT_INPUT");
  });
  it("rejects oversize text before parse", () => {
    const big = "x".repeat(200001);
    assert.equal(big.length, 200001);
    checkThrow(() => previewMemberImportJson(big), RangeError, "MEMBER_IMPORT_LIMIT");
  });
  it("rejects invalid json syntax", () => {
    checkThrow(() => previewMemberImportJson("[,"), TypeError, "INVALID_MEMBER_IMPORT_JSON");
    checkThrow(() => previewMemberImportJson(""), TypeError, "INVALID_MEMBER_IMPORT_JSON");
  });
  it("rejects non-array root", () => {
    checkThrow(() => previewMemberImportJson("{}"), TypeError, "INVALID_MEMBER_IMPORT_ROOT");
    checkThrow(() => previewMemberImportJson("null"), TypeError, "INVALID_MEMBER_IMPORT_ROOT");
    checkThrow(() => previewMemberImportJson('"hi"'), TypeError, "INVALID_MEMBER_IMPORT_ROOT");
    checkThrow(() => previewMemberImportJson("123"), TypeError, "INVALID_MEMBER_IMPORT_ROOT");
  });
  it("accepts empty array with canImport false", () => {
    const r = previewMemberImportJson("[]");
    assert.deepEqual(r, { rowCount: 0, validCount: 0, invalidCount: 0, canImport: false, rows: [] });
  });
  it("enforces 250 row budget", () => {
    const okRows = Array.from({ length: 250 }, () => ({ fullName: "A" }));
    const ok = previewMemberImportJson(JSON.stringify(okRows));
    assert.equal(ok.rowCount, 250);
    assert.equal(ok.canImport, true);
    const bigRows = Array.from({ length: 251 }, () => ({ fullName: "A" }));
    checkThrow(() => previewMemberImportJson(JSON.stringify(bigRows)), RangeError, "MEMBER_IMPORT_LIMIT");
  });
  it("duplicate-key final value applies", () => {
    const r = previewMemberImportJson('[{"fullName":"A","fullName":"B"}]');
    assert.equal(r.rowCount, 1);
    assert.equal(r.validCount, 1);
    assert.equal(r.rows[0].status, "valid");
    assert.equal(r.rows[0].data.fullName, "B");
  });
});

describe("records and defaults", () => {
  it("complete record normalized", () => {
    const input = JSON.stringify([
      {
        fullName: "  Maria Sintética  ",
        email: "  maria@exemplo.test  ",
        phone: "  11  ",
        address: " Rua A ",
        birthDate: " 2000-02-29 ",
        baptismDate: "2020-01-15",
        status: "Inativo",
        isTither: true,
        notes: "nota"
      }
    ]);
    const r = previewMemberImportJson(input);
    assert.equal(r.rowCount, 1);
    assert.equal(r.validCount, 1);
    assert.equal(r.canImport, true);
    const row = r.rows[0];
    assert.equal(row.index, 0);
    assert.equal(row.status, "valid");
    assert.deepEqual(Object.keys(row.data), ["fullName", "email", "phone", "address", "birthDate", "baptismDate", "status", "isTither", "notes"]);
    assert.equal(row.data.fullName, "Maria Sintética");
    assert.equal(row.data.email, "maria@exemplo.test");
    assert.equal(row.data.birthDate, "2000-02-29");
    assert.equal(row.data.status, "Inativo");
    assert.equal(row.data.isTither, true);
  });
  it("minimal record uses defaults", () => {
    const r = previewMemberImportJson('[{"fullName":"Ana"}]');
    assert.equal(r.canImport, true);
    assert.deepEqual(r.rows[0].data, {
      fullName: "Ana",
      email: "",
      phone: "",
      address: "",
      birthDate: "",
      baptismDate: "",
      status: "Ativo",
      isTither: false,
      notes: ""
    });
  });
  it("duplicates preserved with indexes", () => {
    const r = previewMemberImportJson('[{"fullName":"A"},{"fullName":"A"}]');
    assert.equal(r.rowCount, 2);
    assert.equal(r.validCount, 2);
    assert.equal(r.rows[0].index, 0);
    assert.equal(r.rows[1].index, 1);
  });
  it("ignores legacy id and createdAt", () => {
    const r = previewMemberImportJson('[{"fullName":"A","id":"x","createdAt":123}]');
    assert.equal(r.validCount, 1);
    const data = r.rows[0].data;
    assert.equal("id" in data, false);
    assert.equal("createdAt" in data, false);
    assert.deepEqual(Object.keys(data).length, 9);
  });
  it("counts mixed valid invalid", () => {
    const r = previewMemberImportJson('[{"fullName":"A"},{"fullName":""}]');
    assert.equal(r.rowCount, 2);
    assert.equal(r.validCount, 1);
    assert.equal(r.invalidCount, 1);
    assert.equal(r.canImport, false);
    assert.equal(r.rows[0].status, "valid");
    assert.equal(r.rows[1].status, "invalid");
    assert.deepEqual(Object.keys(r), ["rowCount", "validCount", "invalidCount", "canImport", "rows"]);
  });
});

describe("ordered errors and privacy", () => {
  it("row type only issue", () => {
    const r = previewMemberImportJson('[null, 1, "x", []]');
    assert.equal(r.invalidCount, 4);
    for (const row of r.rows) {
      assert.deepEqual(row.issues, [{ field: null, code: "ROW_TYPE" }]);
    }
  });
  it("unknown field first then known order", () => {
    const r = previewMemberImportJson(JSON.stringify([{ fullName: 123, email: 5, extra: 1 }]));
    const issues = r.rows[0].issues;
    assert.deepEqual(issues, [
      { field: null, code: "UNKNOWN_FIELD" },
      { field: "fullName", code: "TYPE" },
      { field: "email", code: "TYPE" }
    ]);
    const dumped = JSON.stringify(issues);
    assert.equal(dumped.includes("extra"), false);
  });
  it("single unknown key including proto is one issue and still validates", () => {
    const parsed = JSON.parse('{"fullName":123,"__proto__":1,"constructor":2}');
    const text = JSON.stringify([parsed]);
    const r = previewMemberImportJson(text);
    const issues = r.rows[0].issues;
    assert.equal(issues[0].field, null);
    assert.equal(issues[0].code, "UNKNOWN_FIELD");
    assert.equal(issues.length, 2);
    assert.equal(issues[1].field, "fullName");
    assert.equal(JSON.stringify(r).includes("__proto__"), false);
  });
  it("at most one issue per field with precedence", () => {
    const long = "a".repeat(300);
    const r = previewMemberImportJson(JSON.stringify([{ fullName: long }]));
    assert.deepEqual(r.rows[0].issues, [{ field: "fullName", code: "LENGTH" }]);
    const nulLong = "a".repeat(121) + "\u0000";
    const r2 = previewMemberImportJson(JSON.stringify([{ fullName: nulLong }]));
    assert.deepEqual(r2.rows[0].issues, [{ field: "fullName", code: "LENGTH" }]);
  });
  it("missing fullName required and whitespace required", () => {
    const r = previewMemberImportJson('[{},{"fullName":"   "}]');
    assert.deepEqual(r.rows[0].issues, [{ field: "fullName", code: "REQUIRED" }]);
    assert.deepEqual(r.rows[1].issues, [{ field: "fullName", code: "REQUIRED" }]);
    assert.equal("data" in r.rows[0], false);
  });
  it("type errors do not echo values", () => {
    const r = previewMemberImportJson('[{"fullName":null,"email":["x"]}]');
    assert.deepEqual(r.rows[0].issues, [
      { field: "fullName", code: "TYPE" },
      { field: "email", code: "TYPE" }
    ]);
    assert.equal(JSON.stringify(r.rows[0]).includes("null"), false);
  });
});

describe("dates boundaries unicode", () => {
  it("accepts year boundaries and rejects rollover and formats", () => {
    const good = previewMemberImportJson('[{"fullName":"A","birthDate":"0100-01-01","baptismDate":"9999-12-31"}]');
    assert.equal(good.validCount, 1);
    const badYear = previewMemberImportJson('[{"fullName":"A","birthDate":"0099-01-01"}]');
    assert.deepEqual(badYear.rows[0].issues, [{ field: "birthDate", code: "DATE" }]);
    const roll = previewMemberImportJson('[{"fullName":"A","birthDate":"2023-02-30"}]');
    assert.deepEqual(roll.rows[0].issues, [{ field: "birthDate", code: "DATE" }]);
    const slash = previewMemberImportJson('[{"fullName":"A","birthDate":"01/02/2023"}]');
    assert.deepEqual(slash.rows[0].issues, [{ field: "birthDate", code: "DATE" }]);
    const stamp = previewMemberImportJson('[{"fullName":"A","birthDate":"2023-01-01T00:00:00"}]');
    assert.deepEqual(stamp.rows[0].issues, [{ field: "birthDate", code: "DATE" }]);
    const empty = previewMemberImportJson('[{"fullName":"A","birthDate":"   "}]');
    assert.equal(empty.validCount, 1);
    assert.equal(empty.rows[0].data.birthDate, "");
  });
  it("utf16 length boundaries", () => {
    const okName = "a".repeat(120);
    const r1 = previewMemberImportJson(JSON.stringify([{ fullName: okName }]));
    assert.equal(r1.validCount, 1);
    const badName = "a".repeat(121);
    const r2 = previewMemberImportJson(JSON.stringify([{ fullName: badName }]));
    assert.deepEqual(r2.rows[0].issues, [{ field: "fullName", code: "LENGTH" }]);
    const badNotes = "b".repeat(2001);
    const r3 = previewMemberImportJson(JSON.stringify([{ fullName: "A", notes: badNotes }]));
    assert.deepEqual(r3.rows[0].issues, [{ field: "notes", code: "LENGTH" }]);
  });
  it("nul produces value and unicode markup retained", () => {
    const r = previewMemberImportJson(JSON.stringify([{ fullName: "a\u0000b" }]));
    assert.deepEqual(r.rows[0].issues, [{ field: "fullName", code: "VALUE" }]);
    const notesText = "  <b>olá 😀</b>\nlinha  ";
    const r2 = previewMemberImportJson(JSON.stringify([{ fullName: "A", notes: notesText }]));
    assert.equal(r2.validCount, 1);
    assert.equal(r2.rows[0].data.notes, notesText);
    const mail = previewMemberImportJson(JSON.stringify([{ fullName: "A", email: "  X@Y  " }]));
    assert.equal(mail.rows[0].data.email, "X@Y");
  });
  it("status and isTither enums", () => {
    const badStatus = previewMemberImportJson('[{"fullName":"A","status":"ativo"}]');
    assert.deepEqual(badStatus.rows[0].issues, [{ field: "status", code: "VALUE" }]);
    const typeStatus = previewMemberImportJson('[{"fullName":"A","status":1}]');
    assert.deepEqual(typeStatus.rows[0].issues, [{ field: "status", code: "TYPE" }]);
    const badBool = previewMemberImportJson('[{"fullName":"A","isTither":"true"}]');
    assert.deepEqual(badBool.rows[0].issues, [{ field: "isTither", code: "TYPE" }]);
    const numBool = previewMemberImportJson('[{"fullName":"A","isTither":1}]');
    assert.deepEqual(numBool.rows[0].issues, [{ field: "isTither", code: "TYPE" }]);
  });
});

describe("freshness", () => {
  it("returns fresh containers per call", () => {
    const text = '[{"fullName":"A"},{"fullName":""}]';
    const a = previewMemberImportJson(text);
    const b = previewMemberImportJson(text);
    assert.notEqual(a, b);
    assert.notEqual(a.rows, b.rows);
    assert.notEqual(a.rows[0], b.rows[0]);
    assert.notEqual(a.rows[0].data, b.rows[0].data);
    assert.notEqual(a.rows[1].issues, b.rows[1].issues);
    assert.notEqual(a.rows[1].issues[0], b.rows[1].issues[0]);
    a.rows[0].data.fullName = "MUT";
    assert.equal(b.rows[0].data.fullName, "A");
  });
  it("does not alias input objects", () => {
    const text = '[{"fullName":"A","notes":"n"}]';
    const r = previewMemberImportJson(text);
    assert.equal(r.rows[0].data.notes, "n");
    const r2 = previewMemberImportJson(text);
    assert.notEqual(r.rows[0].data, r2.rows[0].data);
  });
});
