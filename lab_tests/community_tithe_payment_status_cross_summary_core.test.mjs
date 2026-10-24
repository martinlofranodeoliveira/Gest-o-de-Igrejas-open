import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/lib/community/tithe_payment_status_cross_summary_core.mjs";

const EXPECTED_KEYS = [
  "rowCount",
  "invalidRowCount",
  "validRowCount",
  "pixConfirmadoCount",
  "pixPendenteCount",
  "pixOtherCount",
  "especieConfirmadoCount",
  "especiePendenteCount",
  "especieOtherCount",
  "cartaoConfirmadoCount",
  "cartaoPendenteCount",
  "cartaoOtherCount",
  "transferenciaConfirmadoCount",
  "transferenciaPendenteCount",
  "transferenciaOtherCount",
  "otherConfirmadoCount",
  "otherPendenteCount",
  "otherOtherCount"
];

const CROSS_KEYS = [
  "pixConfirmadoCount",
  "pixPendenteCount",
  "pixOtherCount",
  "especieConfirmadoCount",
  "especiePendenteCount",
  "especieOtherCount",
  "cartaoConfirmadoCount",
  "cartaoPendenteCount",
  "cartaoOtherCount",
  "transferenciaConfirmadoCount",
  "transferenciaPendenteCount",
  "transferenciaOtherCount",
  "otherConfirmadoCount",
  "otherPendenteCount",
  "otherOtherCount"
];

function checkInvariants(result) {
  assert.deepStrictEqual(Object.keys(result).sort(), [...EXPECTED_KEYS].sort());
  for (const key of EXPECTED_KEYS) {
    assert.strictEqual(typeof result[key], "number");
    assert.ok(Number.isFinite(result[key]));
    assert.ok(Number.isSafeInteger(result[key]));
    assert.ok(result[key] >= 0);
  }
  assert.strictEqual(result.rowCount, result.validRowCount + result.invalidRowCount);
  let sum = 0;
  for (const key of CROSS_KEYS) {
    sum += result[key];
  }
  assert.strictEqual(result.validRowCount, sum);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), result);
}

describe("tithe payment status cross summary core contract", () => {
  it("rejects non-array payload and oversized payload", () => {
    assert.throws(() => runFeature(null), { name: "TypeError", message: "INVALID_TITHE_PAYMENT_STATUS_CROSS_ROOT" });
    assert.throws(() => runFeature(undefined), { name: "TypeError", message: "INVALID_TITHE_PAYMENT_STATUS_CROSS_ROOT" });
    assert.throws(() => runFeature({}), { name: "TypeError", message: "INVALID_TITHE_PAYMENT_STATUS_CROSS_ROOT" });
    assert.throws(() => runFeature("PIX"), { name: "TypeError", message: "INVALID_TITHE_PAYMENT_STATUS_CROSS_ROOT" });
    assert.throws(() => runFeature(42), { name: "TypeError", message: "INVALID_TITHE_PAYMENT_STATUS_CROSS_ROOT" });
    const big = [];
    for (let i = 0; i < 1001; i += 1) {
      big.push(null);
    }
    assert.throws(() => runFeature(big), { name: "RangeError", message: "TITHE_PAYMENT_STATUS_CROSS_LIMIT" });
  });

  it("returns zeros for empty array with no extra keys", () => {
    const result = runFeature([]);
    assert.deepStrictEqual(result, {
      rowCount: 0,
      invalidRowCount: 0,
      validRowCount: 0,
      pixConfirmadoCount: 0,
      pixPendenteCount: 0,
      pixOtherCount: 0,
      especieConfirmadoCount: 0,
      especiePendenteCount: 0,
      especieOtherCount: 0,
      cartaoConfirmadoCount: 0,
      cartaoPendenteCount: 0,
      cartaoOtherCount: 0,
      transferenciaConfirmadoCount: 0,
      transferenciaPendenteCount: 0,
      transferenciaOtherCount: 0,
      otherConfirmadoCount: 0,
      otherPendenteCount: 0,
      otherOtherCount: 0
    });
    checkInvariants(result);
  });

  it("matches documented examples exactly", () => {
    const first = runFeature([
      { paymentMethod: "PIX", status: "Confirmado" },
      { paymentMethod: "PIX", status: "Pendente" },
      { paymentMethod: "Espécie", status: "Confirmado" }
    ]);
    assert.strictEqual(first.rowCount, 3);
    assert.strictEqual(first.validRowCount, 3);
    assert.strictEqual(first.invalidRowCount, 0);
    assert.strictEqual(first.pixConfirmadoCount, 1);
    assert.strictEqual(first.pixPendenteCount, 1);
    assert.strictEqual(first.especieConfirmadoCount, 1);
    checkInvariants(first);
    const second = runFeature([null, { paymentMethod: "", status: "X" }, { memberName: "Sintetico" }]);
    assert.strictEqual(second.rowCount, 3);
    assert.strictEqual(second.invalidRowCount, 1);
    assert.strictEqual(second.validRowCount, 2);
    assert.strictEqual(second.otherOtherCount, 2);
    checkInvariants(second);
  });

  it("increments each of the fifteen cross cells once", () => {
    const payload = [
      { paymentMethod: "PIX", status: "Confirmado" },
      { paymentMethod: "PIX", status: "Pendente" },
      { paymentMethod: "PIX", status: "Cancelado" },
      { paymentMethod: "Espécie", status: "Confirmado" },
      { paymentMethod: "Espécie", status: "Pendente" },
      { paymentMethod: "Espécie", status: "Expirado" },
      { paymentMethod: "Cartão", status: "Confirmado" },
      { paymentMethod: "Cartão", status: "Pendente" },
      { paymentMethod: "Cartão" },
      { paymentMethod: "Transferência", status: "Confirmado" },
      { paymentMethod: "Transferência", status: "Pendente" },
      { paymentMethod: "Transferência", status: "" },
      { paymentMethod: "Boleto", status: "Confirmado" },
      { paymentMethod: "pix", status: "Pendente" },
      {}
    ];
    const result = runFeature(payload);
    assert.strictEqual(result.rowCount, 15);
    assert.strictEqual(result.validRowCount, 15);
    assert.strictEqual(result.invalidRowCount, 0);
    assert.strictEqual(result.pixConfirmadoCount, 1);
    assert.strictEqual(result.pixPendenteCount, 1);
    assert.strictEqual(result.pixOtherCount, 1);
    assert.strictEqual(result.especieConfirmadoCount, 1);
    assert.strictEqual(result.especiePendenteCount, 1);
    assert.strictEqual(result.especieOtherCount, 1);
    assert.strictEqual(result.cartaoConfirmadoCount, 1);
    assert.strictEqual(result.cartaoPendenteCount, 1);
    assert.strictEqual(result.cartaoOtherCount, 1);
    assert.strictEqual(result.transferenciaConfirmadoCount, 1);
    assert.strictEqual(result.transferenciaPendenteCount, 1);
    assert.strictEqual(result.transferenciaOtherCount, 1);
    assert.strictEqual(result.otherConfirmadoCount, 1);
    assert.strictEqual(result.otherPendenteCount, 1);
    assert.strictEqual(result.otherOtherCount, 1);
    checkInvariants(result);
  });

  it("sends missing empty unknown and non-string values to other cells", () => {
    const payload = [
      {},
      { paymentMethod: "", status: "" },
      { paymentMethod: 123, status: 456 },
      { paymentMethod: null, status: null },
      { paymentMethod: "PIX " },
      { paymentMethod: "pix", status: "confirmado" },
      { paymentMethod: "PIX", status: "confirmado" },
      { status: "Confirmado" },
      { paymentMethod: "PIX" }
    ];
    const result = runFeature(payload);
    assert.strictEqual(result.validRowCount, 9);
    assert.strictEqual(result.invalidRowCount, 0);
    assert.strictEqual(result.otherOtherCount, 6);
    assert.strictEqual(result.otherConfirmadoCount, 1);
    assert.strictEqual(result.pixOtherCount, 2);
    assert.strictEqual(result.pixConfirmadoCount, 0);
    checkInvariants(result);
  });

  it("treats null non-object and array rows as invalid and ignores extra keys without mutation", () => {
    const rowA = { paymentMethod: "PIX", status: "Confirmado", id: 1, memberId: 2, memberName: "A", amount: 10, contributionDate: "2024-01-01", notes: "x", createdAt: "y" };
    const rowB = { paymentMethod: "Cartão", status: "Pendente", extra: "keep" };
    const payload = [null, undefined, 7, "PIX", true, ["PIX"], rowA, rowB];
    const before = JSON.stringify(payload);
    const beforeRowA = JSON.stringify(rowA);
    const beforeRowB = JSON.stringify(rowB);
    const result = runFeature(payload);
    assert.strictEqual(result.rowCount, 8);
    assert.strictEqual(result.invalidRowCount, 6);
    assert.strictEqual(result.validRowCount, 2);
    assert.strictEqual(result.pixConfirmadoCount, 1);
    assert.strictEqual(result.cartaoPendenteCount, 1);
    checkInvariants(result);
    assert.strictEqual(JSON.stringify(payload), before);
    assert.strictEqual(JSON.stringify(rowA), beforeRowA);
    assert.strictEqual(JSON.stringify(rowB), beforeRowB);
    const again = runFeature(payload);
    assert.deepStrictEqual(again, result);
  });

  it("is deterministic fresh and leaves nothing written when discarded", () => {
    const payload = [
      { paymentMethod: "Transferência", status: "Confirmado" },
      { paymentMethod: "Espécie", status: "Pendente" }
    ];
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepStrictEqual(first, second);
    assert.notStrictEqual(first, second);
    checkInvariants(first);
    checkInvariants(second);
    runFeature(payload);
    const empty = runFeature([]);
    assert.strictEqual(empty.rowCount, 0);
    assert.strictEqual(empty.otherOtherCount, 0);
    payload.push({ paymentMethod: "PIX", status: "Confirmado" });
    const third = runFeature(payload);
    assert.strictEqual(third.rowCount, 3);
    assert.strictEqual(first.rowCount, 2);
  });
});
