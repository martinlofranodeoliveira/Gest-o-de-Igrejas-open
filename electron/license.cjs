const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const LICENSE_PRODUCT = 'gestao-de-igrejas';
const LICENSE_TOKEN_PREFIX = 'GDI1';
const PUBLIC_KEY_PATH = path.join(__dirname, 'license-public.pem');

function normalizeMachineFingerprint(value) {
  return String(value || '').replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
}

function formatMachineFingerprint(value) {
  const normalized = normalizeMachineFingerprint(value);
  return normalized.match(/.{1,4}/g)?.join('-') || '';
}

function readCommandOutput(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  }).trim();
}

function readWindowsMachineSeed() {
  const output = readCommandOutput('reg', [
    'query',
    'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
    '/v',
    'MachineGuid',
  ]);
  const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
  return match ? `win32:${match[1].trim()}` : '';
}

function readMacMachineSeed() {
  const output = readCommandOutput('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']);
  const match = output.match(/"IOPlatformUUID"\s=\s"([^"]+)"/);
  return match ? `darwin:${match[1].trim()}` : '';
}

function readLinuxMachineSeed() {
  const candidates = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const value = fs.readFileSync(candidate, 'utf8').trim();
    if (value) {
      return `linux:${value}`;
    }
  }

  return '';
}

function readFallbackMachineSeed() {
  const networkInterfaces = os.networkInterfaces();
  const macs = [];

  for (const items of Object.values(networkInterfaces)) {
    for (const item of items || []) {
      if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
        macs.push(item.mac);
      }
    }
  }

  macs.sort();

  return [
    'fallback',
    os.platform(),
    os.arch(),
    os.hostname(),
    macs.join(','),
  ].join('|');
}

function readStableMachineSeed() {
  try {
    if (process.platform === 'win32') {
      const seed = readWindowsMachineSeed();
      if (seed) {
        return seed;
      }
    }

    if (process.platform === 'darwin') {
      const seed = readMacMachineSeed();
      if (seed) {
        return seed;
      }
    }

    if (process.platform === 'linux') {
      const seed = readLinuxMachineSeed();
      if (seed) {
        return seed;
      }
    }
  } catch (_error) {
    // Falls back to a best-effort fingerprint when platform-specific IDs are unavailable.
  }

  return readFallbackMachineSeed();
}

function getMachineFingerprintRaw() {
  return crypto
    .createHash('sha256')
    .update(readStableMachineSeed())
    .digest('hex')
    .toUpperCase()
    .slice(0, 32);
}

function getMachineFingerprint() {
  return formatMachineFingerprint(getMachineFingerprintRaw());
}

function normalizePayload(payload) {
  return {
    v: 1,
    product: LICENSE_PRODUCT,
    licenseId: String(payload?.licenseId || ''),
    customerName: String(payload?.customerName || ''),
    issuedAt: String(payload?.issuedAt || ''),
    expiresAt: payload?.expiresAt ? String(payload.expiresAt) : null,
    machineFingerprint: payload?.machineFingerprint
      ? normalizeMachineFingerprint(payload.machineFingerprint)
      : null,
    features: Array.isArray(payload?.features)
      ? payload.features.map((feature) => String(feature)).sort()
      : [],
  };
}

function serializePayload(payload) {
  return JSON.stringify(normalizePayload(payload));
}

function parseLicenseToken(licenseKey) {
  if (typeof licenseKey !== 'string' || !licenseKey.trim()) {
    return { valid: false, reason: 'missing-license-key' };
  }

  const parts = licenseKey.trim().split('.');
  if (parts.length !== 3 || parts[0] !== LICENSE_TOKEN_PREFIX) {
    return { valid: false, reason: 'invalid-license-format' };
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const signature = Buffer.from(parts[2], 'base64url');
    return { valid: true, payload, signature };
  } catch (_error) {
    return { valid: false, reason: 'invalid-license-encoding' };
  }
}

function verifyLicenseTokenWithPublicKey(licenseKey, publicKeyPem, options = {}) {
  const parsed = parseLicenseToken(licenseKey);
  if (!parsed.valid) {
    return parsed;
  }

  const normalizedPayload = normalizePayload(parsed.payload);
  const serializedPayload = JSON.stringify(normalizedPayload);

  let signatureIsValid = false;
  try {
    signatureIsValid = crypto.verify(
      null,
      Buffer.from(serializedPayload, 'utf8'),
      publicKeyPem,
      parsed.signature,
    );
  } catch (_error) {
    return { valid: false, reason: 'public-key-error' };
  }

  if (!signatureIsValid) {
    return { valid: false, reason: 'invalid-signature' };
  }

  if (
    !normalizedPayload.licenseId ||
    !normalizedPayload.customerName ||
    !normalizedPayload.issuedAt ||
    normalizedPayload.product !== LICENSE_PRODUCT
  ) {
    return { valid: false, reason: 'invalid-license-payload' };
  }

  if (normalizedPayload.expiresAt) {
    const expiryDate = Date.parse(normalizedPayload.expiresAt);
    if (!Number.isFinite(expiryDate)) {
      return { valid: false, reason: 'invalid-expiry' };
    }

    if (Date.now() > expiryDate) {
      return { valid: false, reason: 'expired-license' };
    }
  }

  const currentFingerprint = normalizeMachineFingerprint(
    options.machineFingerprint || getMachineFingerprintRaw(),
  );
  const expectedFingerprint = normalizeMachineFingerprint(normalizedPayload.machineFingerprint);

  if (expectedFingerprint && expectedFingerprint !== currentFingerprint) {
    return {
      valid: false,
      reason: 'machine-mismatch',
      payload: normalizedPayload,
      currentFingerprint: formatMachineFingerprint(currentFingerprint),
    };
  }

  return {
    valid: true,
    payload: normalizedPayload,
    currentFingerprint: formatMachineFingerprint(currentFingerprint),
  };
}

function loadPublicKeyPem() {
  return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
}

function verifyLicenseToken(licenseKey, options = {}) {
  return verifyLicenseTokenWithPublicKey(licenseKey, loadPublicKeyPem(), options);
}

function createLicenseToken(payload, privateKeyPem) {
  if (!privateKeyPem) {
    throw new Error('Missing private key for license generation.');
  }

  const serializedPayload = serializePayload(payload);
  const signature = crypto.sign(null, Buffer.from(serializedPayload, 'utf8'), privateKeyPem);

  return [
    LICENSE_TOKEN_PREFIX,
    Buffer.from(serializedPayload, 'utf8').toString('base64url'),
    signature.toString('base64url'),
  ].join('.');
}

module.exports = {
  LICENSE_PRODUCT,
  LICENSE_TOKEN_PREFIX,
  PUBLIC_KEY_PATH,
  createLicenseToken,
  formatMachineFingerprint,
  getMachineFingerprint,
  getMachineFingerprintRaw,
  normalizeMachineFingerprint,
  serializePayload,
  verifyLicenseToken,
  verifyLicenseTokenWithPublicKey,
};
