const assert = require('assert');
const crypto = require('crypto');
const {
  createLicenseToken,
  verifyLicenseTokenWithPublicKey,
} = require('../electron/license.cjs');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
const fingerprint = 'A1B2C3D4E5F60718293A4B5C6D7E8F90';

const validToken = createLicenseToken(
  {
    licenseId: 'lic-test-001',
    customerName: 'Igreja Teste',
    issuedAt: '2026-04-04T00:00:00.000Z',
    machineFingerprint: fingerprint,
    features: ['desktop-offline'],
  },
  privateKeyPem,
);

assert.strictEqual(
  verifyLicenseTokenWithPublicKey(validToken, publicKeyPem, {
    machineFingerprint: fingerprint,
  }).valid,
  true,
);

assert.strictEqual(
  verifyLicenseTokenWithPublicKey(validToken, publicKeyPem, {
    machineFingerprint: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  }).valid,
  false,
);

const expiredToken = createLicenseToken(
  {
    licenseId: 'lic-test-002',
    customerName: 'Igreja Expirada',
    issuedAt: '2026-04-04T00:00:00.000Z',
    expiresAt: '2020-01-01T00:00:00.000Z',
    machineFingerprint: fingerprint,
    features: ['desktop-offline'],
  },
  privateKeyPem,
);

assert.strictEqual(
  verifyLicenseTokenWithPublicKey(expiredToken, publicKeyPem, {
    machineFingerprint: fingerprint,
  }).valid,
  false,
);

console.log('Licensing validation tests passed!');
