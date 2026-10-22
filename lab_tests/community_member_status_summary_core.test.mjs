import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/member_status_summary_core.mjs";

describe("member status summary core", () => {
  it("returns all zero counts for empty array", () => {
    assert.deepEqual(runFeature([]), {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      ativoCount: 0,
      inativoCount: 0,
      visitanteCount: 0,
      statusMissingCount: 0,
      statusUnknownCount: 0
    });
  });

  it("throws TypeError for non-array payloads", () => {
    const bad = [undefined, null, {}, "x", 123, true];
    for (const value of bad) {
      assert.throws(() => runFeature(value), (err) => {
        assert.ok(err instanceof TypeError);
        assert.equal(err.message, "INVALID_MEMBER_STATUS_SUMMARY_ROOT");
        return true;
      });
    }
  });

  it("throws RangeError when array exceeds 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push({ status: "Ativo" });
    }
    assert.throws(() => runFeature(big), (err) => {
      assert.ok(err instanceof RangeError);
      assert.equal(err.message, "MEMBER_STATUS_SUMMARY_LIMIT");
      return true;
    });
  });

  it("accepts exactly 1000 rows", () => {
    const rows = [];
    for (let i = 0; i < 1000; i += 1) {
      rows.push({ status: "Ativo" });
    }
    const out = runFeature(rows);
    assert.equal(out.rowCount, 1000);
    assert.equal(out.validRowCount, 1000);
    assert.equal(out.ativoCount, 1000);
  });

  it("counts null, non-object and array rows as invalid only", () => {
    const out = runFeature([null, 1, "Ativo", true, undefined, ["x"], { status: "Ativo" }]);
    assert.equal(out.rowCount, 7);
    assert.equal(out.invalidRowCount, 6);
    assert.equal(out.validRowCount, 1);
    assert.equal(out.ativoCount, 1);
    assert.equal(out.inativoCount, 0);
    assert.equal(out.visitanteCount, 0);
    assert.equal(out.statusMissingCount, 0);
    assert.equal(out.statusUnknownCount, 0);
  });

  it("matches first contract example", () => {
    const out = runFeature([{ status: "Ativo" }, { status: "Inativo" }, { status: "Visitante" }]);
    assert.deepEqual(out, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      ativoCount: 1,
      inativoCount: 1,
      visitanteCount: 1,
      statusMissingCount: 0,
      statusUnknownCount: 0
    });
  });

  it("matches mixed missing and unknown example", () => {
    const out = runFeature([null, { fullName: "Sintetico" }, { status: "" }, { status: "Ativo" }, { status: "Desligado" }]);
    assert.deepEqual(out, {
      rowCount: 5,
      invalidRowCount: 1,
      validRowCount: 4,
      ativoCount: 1,
      inativoCount: 0,
      visitanteCount: 0,
      statusMissingCount: 1,
      statusUnknownCount: 2
    });
  });

  it("is case sensitive with no trim and treats null as unknown", () => {
    const out = runFeature([{ status: "Ativo" }, { status: "ativo" }, { status: "Inativo " }, { status: null }]);
    assert.deepEqual(out, {
      rowCount: 4,
      invalidRowCount: 0,
      validRowCount: 4,
      ativoCount: 1,
      inativoCount: 0,
      visitanteCount: 0,
      statusMissingCount: 0,
      statusUnknownCount: 3
    });
  });

  it("treats non-string status values as unknown and keeps bucket invariants", () => {
    const out = runFeature([{ status: 1 }, { status: true }, { status: {} }, { status: ["Ativo"] }, { a: 1 }]);
    assert.equal(out.validRowCount, 5);
    assert.equal(out.statusMissingCount, 1);
    assert.equal(out.statusUnknownCount, 4);
    assert.equal(out.ativoCount + out.inativoCount + out.visitanteCount + out.statusMissingCount + out.statusUnknownCount, out.validRowCount);
    assert.equal(out.rowCount, out.validRowCount + out.invalidRowCount);
  });

  it("ignores other own keys and inherited status", () => {
    const inherited = Object.create({ status: "Ativo" });
    inherited.fullName = "X";
    const out = runFeature([{ id: "1", fullName: "A", email: "a@x.com", phone: "1", address: "r", birthDate: "2000-01-01", baptismDate: "2020-01-01", isTither: true, notes: "n", createdAt: "t", status: "Inativo" }, inherited]);
    assert.equal(out.validRowCount, 2);
    assert.equal(out.inativoCount, 1);
    assert.equal(out.statusMissingCount, 1);
    assert.equal(out.statusUnknownCount, 0);
  });

  it("allocates fresh JSON-compatible result and preserves input", () => {
    const input = [{ status: "Ativo" }, { status: "Visitante" }];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.notEqual(first, second);
    assert.deepEqual(first, second);
    first.ativoCount = 999;
    assert.notEqual(second.ativoCount, 999);
    assert.equal(JSON.stringify(input), before);
    assert.equal(JSON.stringify(first).length > 0, true);
    const keys = Object.keys(second).sort();
    assert.deepEqual(keys, ["ativoCount", "inativoCount", "invalidRowCount", "rowCount", "statusMissingCount", "statusUnknownCount", "validRowCount", "visitanteCount"]);
  });

  it("discarding result writes nothing and stays deterministic", () => {
    const input = [{ status: "Ativo" }];
    runFeature(input);
    const out = runFeature(input);
    assert.equal(out.rowCount, 1);
    assert.equal(out.ativoCount, 1);
    assert.deepEqual(runFeature(input), out);
  });
});
