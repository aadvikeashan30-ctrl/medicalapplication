const test = require('node:test');
const assert = require('node:assert');
const crypto = require('../src/services/cryptoService');

test('encrypt then decrypt round-trips', () => {
  const secret = '14-9999-8888-7777'; // e.g. ABHA number
  const enc = crypto.encrypt(secret);
  assert.ok(crypto.isEncrypted(enc));
  assert.notStrictEqual(enc, secret);
  assert.strictEqual(crypto.decrypt(enc), secret);
});

test('encrypt is idempotent and tolerant of empties', () => {
  assert.strictEqual(crypto.encrypt(''), '');
  assert.strictEqual(crypto.encrypt(null), null);
  const enc = crypto.encrypt('hello');
  // encrypting an already-encrypted value returns it unchanged
  assert.strictEqual(crypto.encrypt(enc), enc);
});

test('decrypt passes through non-encrypted values', () => {
  assert.strictEqual(crypto.decrypt('plaintext'), 'plaintext');
  assert.strictEqual(crypto.decrypt(''), '');
});

test('two encryptions of same value differ (random IV) but both decrypt', () => {
  const a = crypto.encrypt('same');
  const b = crypto.encrypt('same');
  assert.notStrictEqual(a, b);
  assert.strictEqual(crypto.decrypt(a), 'same');
  assert.strictEqual(crypto.decrypt(b), 'same');
});

test('tampered payload fails authentication', () => {
  const enc = crypto.encrypt('sensitive');
  const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A');
  assert.throws(() => crypto.decrypt(tampered));
});

test('encryptFields / decryptFields work on objects without mutation', () => {
  const obj = { name: 'Asha', abha: '11112222333344', other: 'x' };
  const enc = crypto.encryptFields(obj, ['abha']);
  assert.ok(crypto.isEncrypted(enc.abha));
  assert.strictEqual(enc.name, 'Asha');
  assert.strictEqual(obj.abha, '11112222333344'); // original untouched
  const dec = crypto.decryptFields(enc, ['abha']);
  assert.strictEqual(dec.abha, '11112222333344');
});

test('mask hides all but the last N chars', () => {
  assert.strictEqual(crypto.mask('123456', 4), '**3456');
  assert.strictEqual(crypto.mask('ab', 4), '**');
  assert.strictEqual(crypto.mask(''), '');
});

test('hash is stable and hex', () => {
  const h1 = crypto.hash('abc');
  const h2 = crypto.hash('abc');
  assert.strictEqual(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});
