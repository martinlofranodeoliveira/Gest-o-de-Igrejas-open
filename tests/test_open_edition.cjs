const assert = require("node:assert/strict");
const { registerOpenEditionLicenseHandlers } = require("../electron/open-edition.cjs");
const handlers = new Map();
registerOpenEditionLicenseHandlers({ handle(name, handler) {
  assert.equal(handlers.has(name), false);
  handlers.set(name, handler);
} });
assert.deepEqual([...handlers.keys()], ["verify-license", "is-activated"]);
assert.equal(handlers.get("is-activated")(), true);
for (const key of [undefined, "", "synthetic-invalid-key"]) {
  assert.equal(handlers.get("verify-license")({}, key), true);
}
console.log("Open edition starts without commercial activation or an operational public key");
