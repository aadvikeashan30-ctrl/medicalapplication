const test = require('node:test');
const assert = require('node:assert');
const claim = require('../src/services/claimService');

test('isValidStatus', () => {
  assert.ok(claim.isValidStatus('submitted'));
  assert.ok(!claim.isValidStatus('frozen'));
});

test('canTransition enforces the lifecycle', () => {
  assert.ok(claim.canTransition('draft', 'submitted').ok);
  assert.ok(claim.canTransition('under-review', 'approved').ok);
  assert.ok(!claim.canTransition('settled', 'approved').ok);
  assert.ok(!claim.canTransition('draft', 'settled').ok);
  assert.ok(!claim.canTransition('draft', 'draft').ok); // no-op rejected
  assert.ok(!claim.canTransition('bogus', 'submitted').ok);
});

test('computeClaim applies deductible then copay', () => {
  // bill 10000, deductible 1000 -> 9000, copay 10% -> 900 => claimable 8100
  const r = claim.computeClaim({ billAmount: 10000, deductible: 1000, copayPercent: 10 });
  assert.strictEqual(r.claimable, 8100);
  assert.strictEqual(r.patientPayable, 1900);
  assert.strictEqual(r.breakdown.copayAmount, 900);
});

test('computeClaim removes non-payable items first', () => {
  const r = claim.computeClaim({ billAmount: 5000, nonPayable: 500, copayPercent: 0, deductible: 0 });
  assert.strictEqual(r.breakdown.eligibleBase, 4500);
  assert.strictEqual(r.claimable, 4500);
});

test('computeClaim caps at remaining sum insured', () => {
  const r = claim.computeClaim({ billAmount: 100000, sumInsured: 50000, alreadyClaimed: 20000 });
  // remaining cap = 30000
  assert.strictEqual(r.claimable, 30000);
  assert.strictEqual(r.breakdown.sumInsuredCapApplied, true);
});

test('computeClaim never goes negative', () => {
  const r = claim.computeClaim({ billAmount: 500, deductible: 1000 });
  assert.strictEqual(r.claimable, 0);
  assert.strictEqual(r.patientPayable, 500);
});

test('claimNumber formats correctly', () => {
  assert.strictEqual(claim.claimNumber('TPA', 42), 'CLM-TPA-000042');
  assert.strictEqual(claim.claimNumber('star health', 7), 'CLM-STARHE-000007');
  assert.strictEqual(claim.claimNumber('', 1), 'CLM-GEN-000001');
});
