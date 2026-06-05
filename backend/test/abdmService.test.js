const test = require('node:test');
const assert = require('node:assert');
const abdm = require('../src/services/abdmService');

test('normalizeAbhaNumber strips separators and validates length', () => {
  assert.strictEqual(abdm.normalizeAbhaNumber('12-3456-7890-1234'), '12345678901234');
  assert.strictEqual(abdm.normalizeAbhaNumber('12 3456 7890 1234'), '12345678901234');
  assert.strictEqual(abdm.normalizeAbhaNumber('123'), null);
  assert.strictEqual(abdm.normalizeAbhaNumber('abcd'), null);
});

test('isValidAbhaNumber', () => {
  assert.ok(abdm.isValidAbhaNumber('12345678901234'));
  assert.ok(!abdm.isValidAbhaNumber('1234'));
});

test('formatAbhaNumber', () => {
  assert.strictEqual(abdm.formatAbhaNumber('12345678901234'), '12-3456-7890-1234');
  assert.strictEqual(abdm.formatAbhaNumber('bad'), null);
});

test('isValidAbhaAddress', () => {
  assert.ok(abdm.isValidAbhaAddress('asha.kumar@sbx'));
  assert.ok(abdm.isValidAbhaAddress('asha123@abdm'));
  assert.ok(!abdm.isValidAbhaAddress('a@x')); // too short / suffix too short
  assert.ok(!abdm.isValidAbhaAddress('1asha@abdm')); // must start with a letter
});

test('maskAbhaNumber keeps last 4', () => {
  assert.strictEqual(abdm.maskAbhaNumber('12345678901234'), 'XX-XXXX-XXXX-1234');
  assert.strictEqual(abdm.maskAbhaNumber('bad'), '');
});

test('generateDemoAbha returns a valid-looking profile', () => {
  const p = abdm.generateDemoAbha('Asha Kumar');
  assert.ok(abdm.isValidAbhaNumber(p.abhaNumber));
  assert.ok(abdm.isValidAbhaAddress(p.abhaAddress));
  assert.strictEqual(p.source, 'demo');
});

test('buildConsentRequest produces an artefact with defaults', () => {
  const c = abdm.buildConsentRequest({ abhaAddress: 'asha@sbx' });
  assert.strictEqual(c.status, 'REQUESTED');
  assert.ok(c.consentId);
  assert.ok(Array.isArray(c.hiTypes));
  assert.ok(c.permission.dateRange.from);
  assert.ok(c.permission.dataEraseAt);
});

test('validateCareContextLink requires identifiers', () => {
  const bad = abdm.validateCareContextLink({});
  assert.ok(!bad.ok);
  assert.ok(bad.errors.length >= 1);
  const good = abdm.validateCareContextLink({
    abhaAddress: 'asha@sbx',
    careContextReference: 'visit-1',
    display: 'OPD Visit 5 Jun'
  });
  assert.ok(good.ok);
});
