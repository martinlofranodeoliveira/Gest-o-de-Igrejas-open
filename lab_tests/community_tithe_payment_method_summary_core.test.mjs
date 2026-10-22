import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_payment_method_summary_core.mjs";

describe("tithe payment method summary core - root validation", () => {
  it("throws TypeError for non-array payloads", () => {
    const bad = [null, undefined, {}, "x", 123, true, { length: 0 }];
    for (const value of bad) {
      assert.throws(() => runFeature(value), (err) => err instanceof TypeError && err.message === "INVALID_TITHE_PAYMENT_METHOD_SUMMARY_ROOT");
    }
  });
  it("throws RangeError when array longer than 1000", () => {
    const big = [];
    for (let i = 0; i < 1001; i = i + 1) {
      big.push({ paymentMethod: "PIX" });
    }
    assert.throws(() => runFeature(big), (err) => err instanceof RangeError && err.message === "TITHE_PAYMENT_METHOD_SUMMARY_LIMIT");
    assert.strictEqual(big.length, 1001);
  });
  it("accepts exactly 1000 rows", () => {
    const ok = [];
    for (let i = 0; i < 1000; i = i + 1) {
      ok.push({ paymentMethod: "PIX" });
    }
    const out = runFeature(ok);
    assert.strictEqual(out.rowCount, 1000);
    assert.strictEqual(out.pixCount, 1000);
    assert.strictEqual(out.validRowCount, 1000);
  });
});

describe("empty and shape", () => {
  it("empty array returns all zeros with exact keys", () => {
    const out = runFeature([]);
    assert.deepStrictEqual(out, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      pixCount: 0,
      especieCount: 0,
      cartaoCount: 0,
      transferenciaCount: 0,
      paymentMissingCount: 0,
      paymentUnknownCount: 0
    });
    assert.deepStrictEqual(Object.keys(out).sort(), ["cartaoCount", "especieCount", "invalidRowCount", "paymentMissingCount", "paymentUnknownCount", "pixCount", "rowCount", "transferenciaCount", "validRowCount"]);
  });
  it("returned object holds rowCount and payment invariants", () => {
    const out = runFeature([{ paymentMethod: "PIX" }, null, {}, { paymentMethod: "Boleto" }]);
    assert.strictEqual(out.rowCount, out.validRowCount + out.invalidRowCount);
    assert.strictEqual(out.pixCount + out.especieCount + out.cartaoCount + out.transferenciaCount + out.paymentMissingCount + out.paymentUnknownCount, out.validRowCount);
    assert.deepStrictEqual(Object.keys(out).sort(), ["cartaoCount", "especieCount", "invalidRowCount", "paymentMissingCount", "paymentUnknownCount", "pixCount", "rowCount", "transferenciaCount", "validRowCount"]);
  });
});

describe("row validity", () => {
  it("null non-object and array rows count once as invalid", () => {
    const out = runFeature([null, 123, "PIX", true, undefined, [1], { paymentMethod: "PIX" }]);
    assert.strictEqual(out.invalidRowCount, 6);
    assert.strictEqual(out.validRowCount, 1);
    assert.strictEqual(out.rowCount, 7);
    assert.strictEqual(out.pixCount, 1);
    assert.strictEqual(out.paymentMissingCount, 0);
    assert.strictEqual(out.paymentUnknownCount, 0);
  });
  it("ignores other own keys without error", () => {
    const out = runFeature([{ id: 1, memberId: 2, memberName: "A", amount: 10, contributionDate: "2024-01-01", status: "x", notes: "n", createdAt: "t", paymentMethod: "Cartão" }]);
    assert.strictEqual(out.validRowCount, 1);
    assert.strictEqual(out.cartaoCount, 1);
    assert.strictEqual(out.paymentMissingCount, 0);
  });
});

describe("payment distribution", () => {
  it("counts exact accented forms only", () => {
    const out = runFeature([
      { paymentMethod: "PIX" },
      { paymentMethod: "Espécie" },
      { paymentMethod: "Cartão" },
      { paymentMethod: "Transferência" }
    ]);
    assert.strictEqual(out.pixCount, 1);
    assert.strictEqual(out.especieCount, 1);
    assert.strictEqual(out.cartaoCount, 1);
    assert.strictEqual(out.transferenciaCount, 1);
    assert.strictEqual(out.paymentMissingCount, 0);
    assert.strictEqual(out.paymentUnknownCount, 0);
  });
  it("missing increments paymentMissingCount", () => {
    const out = runFeature([{}, { id: 1 }]);
    assert.strictEqual(out.validRowCount, 2);
    assert.strictEqual(out.paymentMissingCount, 2);
    assert.strictEqual(out.paymentUnknownCount, 0);
  });
  it("case accent whitespace and non-string values count as unknown", () => {
    const out = runFeature([
      { paymentMethod: "pix" },
      { paymentMethod: "PIX " },
      { paymentMethod: "Especie" },
      { paymentMethod: "Cartao" },
      { paymentMethod: "Transferencia" },
      { paymentMethod: "" },
      { paymentMethod: 123 },
      { paymentMethod: true },
      { paymentMethod: null },
      { paymentMethod: {} },
      { paymentMethod: [] },
      { paymentMethod: "Boleto" }
    ]);
    assert.strictEqual(out.validRowCount, 12);
    assert.strictEqual(out.paymentUnknownCount, 12);
    assert.strictEqual(out.pixCount, 0);
    assert.strictEqual(out.especieCount, 0);
    assert.strictEqual(out.cartaoCount, 0);
    assert.strictEqual(out.transferenciaCount, 0);
    assert.strictEqual(out.paymentMissingCount, 0);
  });
  it("matches contract examples", () => {
    const a = runFeature([{ paymentMethod: "PIX" }, { paymentMethod: "Espécie" }, { paymentMethod: "PIX" }]);
    assert.deepStrictEqual(a, {
      rowCount: 3,
      invalidRowCount: 0,
      validRowCount: 3,
      pixCount: 2,
      especieCount: 1,
      cartaoCount: 0,
      transferenciaCount: 0,
      paymentMissingCount: 0,
      paymentUnknownCount: 0
    });
    const b = runFeature([null, {}, { paymentMethod: "Boleto" }, { paymentMethod: 123 }]);
    assert.deepStrictEqual(b, {
      rowCount: 4,
      invalidRowCount: 1,
      validRowCount: 3,
      pixCount: 0,
      especieCount: 0,
      cartaoCount: 0,
      transferenciaCount: 0,
      paymentMissingCount: 1,
      paymentUnknownCount: 2
    });
  });
});

describe("determinism and purity", () => {
  it("repeat calls give deep-equal fresh allocation with no input mutation", () => {
    const input = [{ paymentMethod: "PIX" }, { paymentMethod: "Cartão" }, null, {}];
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepStrictEqual(first, second);
    assert.notStrictEqual(first, second);
    assert.strictEqual(JSON.stringify(input), before);
  });
  it("discarding result leaves nothing written", () => {
    const input = [{ paymentMethod: "Transferência" }];
    const before = JSON.stringify(input);
    runFeature(input);
    assert.strictEqual(JSON.stringify(input), before);
  });
});
