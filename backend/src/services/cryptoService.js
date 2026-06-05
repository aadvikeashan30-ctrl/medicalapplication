/**
 * cryptoService — Field-level encryption for Protected Health Information (PHI).
 *
 * Used by the DPDP Act (India) / HIPAA hardening layer to encrypt sensitive
 * fields at rest (e.g. ABHA numbers, insurance member IDs, sensitive notes).
 *
 * Algorithm: AES-256-GCM (authenticated encryption).
 * Output format (string): "enc:v1:<ivB64>:<tagB64>:<cipherB64>"
 *
 * Key source (in priority order):
 *   1. process.env.PHI_ENCRYPTION_KEY  — 64 hex chars (32 bytes) or any string (hashed to 32 bytes)
 *   2. Derived demo key (NON-PRODUCTION) so the app runs out of the box.
 *
 * Pure module: depends only on Node's built-in `crypto`.
 */

const crypto = require('crypto');

const PREFIX = 'enc:v1';
const ALGO = 'aes-256-gcm';

/**
 * Resolve a stable 32-byte key from the environment.
 * If PHI_ENCRYPTION_KEY is 64 hex chars it is used directly; otherwise any
 * string is run through SHA-256 to derive 32 bytes. Falls back to a clearly
 * labelled demo key when unset (development only).
 */
function getKey() {
  const raw = process.env.PHI_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  const seed = raw || 'docclinic-demo-phi-key-not-for-production';
  return crypto.createHash('sha256').update(seed).digest();
}

function isConfigured() {
  return Boolean(process.env.PHI_ENCRYPTION_KEY);
}

/**
 * Returns true if the value is an encrypted payload produced by this module.
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
}

/**
 * Encrypt a UTF-8 string. Returns the original value untouched if it is empty
 * or already encrypted (idempotent — safe to call on save hooks).
 */
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const text = typeof plaintext === 'string' ? plaintext : String(plaintext);
  if (isEncrypted(text)) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Decrypt a payload produced by encrypt(). Returns the input unchanged if it is
 * not an encrypted payload (so reads are safe on legacy/plaintext data).
 * Throws only when the payload is malformed or authentication fails.
 */
function decrypt(payload) {
  if (!isEncrypted(payload)) return payload;
  const parts = payload.split(':');
  // parts: ['enc','v1', iv, tag, cipher]
  if (parts.length !== 5) {
    throw new Error('Malformed encrypted payload');
  }
  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const ciphertext = Buffer.from(parts[4], 'base64');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Encrypt a set of named fields on a plain object (returns a shallow copy).
 */
function encryptFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const f of fields) {
    if (out[f] !== undefined && out[f] !== null && out[f] !== '') {
      out[f] = encrypt(String(out[f]));
    }
  }
  return out;
}

/**
 * Decrypt a set of named fields on a plain object (returns a shallow copy).
 */
function decryptFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const f of fields) {
    if (isEncrypted(out[f])) {
      out[f] = decrypt(out[f]);
    }
  }
  return out;
}

/**
 * Irreversible masking for display/logging (e.g. show last 4 chars).
 */
function mask(value, visible = 4) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= visible) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - visible)}${s.slice(-visible)}`;
}

/**
 * One-way SHA-256 hash (hex) — useful for tamper-evident audit chaining.
 */
function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = {
  isConfigured,
  isEncrypted,
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  mask,
  hash
};
