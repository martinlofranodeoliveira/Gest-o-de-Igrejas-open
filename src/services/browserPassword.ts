const ITERATIONS = 210_000;

const hex = (bytes: Uint8Array) => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return hex(new Uint8Array(bits));
}

export async function hashBrowserPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${hex(salt)}$${await derive(password, salt)}`;
}

export async function matchesBrowserPassword(password: string, encoded: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length > 128 || typeof encoded !== 'string' ||
      !/^pbkdf2-sha256\$210000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(encoded)) return false;
  const [, , saltHex, expected] = encoded.split('$');
  const salt = new Uint8Array(saltHex.match(/../g)!.map(value => parseInt(value, 16)));
  const actual = await derive(password, salt);
  let different = 0;
  for (let index = 0; index < expected.length; index++) different |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  return different === 0;
}
