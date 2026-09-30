const te = new TextEncoder();
const td = new TextDecoder();

export const b64 = (u: Uint8Array) => { let s = ''; for (const b of u) s += String.fromCharCode(b); return btoa(s); };
export const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number, bytes: number) {
  const base = await crypto.subtle.importKey('raw', te.encode(secret) as BufferSource, 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, base, bytes * 8));
}

export const aesKey = (raw: Uint8Array) => crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);

// A senha nunca vai para o servidor: metade da derivação vira a senha de login,
// a outra metade vira a chave que cifra a chave do diário.
export async function derive(email: string, password: string) {
  const bits = await pbkdf2(password, te.encode('memoras:v1:' + email.trim().toLowerCase()), 600_000, 64);
  return { auth: b64(bits.slice(0, 32)), kek: await aesKey(bits.slice(32)) };
}

// Aceita a chave digitada com ou sem hifens, prefixo e maiúsculas.
export const normCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(MEMO|PIN)/, '');

export async function kekFromCode(code: string) {
  return aesKey(await pbkdf2(normCode(code), te.encode('memoras:v1:recovery'), 200_000, 32));
}

export async function seal(key: CryptoKey, data: Uint8Array) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv); out.set(ct, 12);
  return b64(out);
}

export async function open(key: CryptoKey, blob: string) {
  const raw = unb64(blob);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) as BufferSource }, key, raw.slice(12) as BufferSource));
}

export const sealText = (key: CryptoKey, text: string) => seal(key, te.encode(text));
export const openText = async (key: CryptoKey, blob: string) => td.decode(await open(key, blob));

// Sem I, O, 0 e 1 para não confundir ao copiar à mão.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(prefix: string, groups: number) {
  const r = randomBytes(groups * 4), parts: string[] = [];
  for (let g = 0; g < groups; g++) parts.push([0, 1, 2, 3].map(i => ALPHABET[r[g * 4 + i] % 32]).join(''));
  return prefix + '-' + parts.join('-');
}

export async function hashSecret(secret: string, salt = b64(randomBytes(16))) {
  return { salt, hash: b64(await pbkdf2(secret, unb64(salt), 120_000, 32)) };
}
export async function verifySecret(secret: string, salt: string, hash: string) {
  return !!hash && (await hashSecret(secret, salt)).hash === hash;
}
