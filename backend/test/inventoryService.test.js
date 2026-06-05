const test = require('node:test');
const assert = require('node:assert');
const inv = require('../src/services/inventoryService');

test('totalQuantity sums batches', () => {
  assert.strictEqual(inv.totalQuantity([{ quantity: 10 }, { quantity: 5 }]), 15);
  assert.strictEqual(inv.totalQuantity([]), 0);
});

test('stockStatus thresholds', () => {
  assert.strictEqual(inv.stockStatus(0, 10), 'out');
  assert.strictEqual(inv.stockStatus(5, 10), 'low');
  assert.strictEqual(inv.stockStatus(10, 10), 'low'); // equal to reorder => low
  assert.strictEqual(inv.stockStatus(50, 10), 'in');
});

test('expiryStatus classifies dates', () => {
  const now = new Date('2026-06-05');
  assert.strictEqual(inv.expiryStatus('2026-01-01', now), 'expired');
  assert.strictEqual(inv.expiryStatus('2026-07-01', now), 'expiring-soon'); // within 90d
  assert.strictEqual(inv.expiryStatus('2027-01-01', now), 'ok');
});

test('daysUntilExpiry', () => {
  const now = new Date('2026-06-05');
  assert.strictEqual(inv.daysUntilExpiry('2026-06-15', now), 10);
  assert.strictEqual(inv.daysUntilExpiry('2026-06-01', now), -4);
});

test('dispenseFEFO consumes earliest-expiry first and skips expired', () => {
  const now = new Date('2026-06-05');
  const batches = [
    { batchNo: 'A', quantity: 5, expiryDate: '2027-01-01' },
    { batchNo: 'B', quantity: 4, expiryDate: '2026-08-01' }, // earliest valid
    { batchNo: 'C', quantity: 100, expiryDate: '2026-01-01' } // expired -> skipped
  ];
  const plan = inv.dispenseFEFO(batches, 7, now);
  assert.strictEqual(plan.dispensed, 7);
  assert.strictEqual(plan.shortfall, 0);
  // B (4) consumed first, then A (3)
  assert.strictEqual(plan.allocations[0].batchNo, 'B');
  assert.strictEqual(plan.allocations[0].used, 4);
  assert.strictEqual(plan.allocations[1].batchNo, 'A');
  assert.strictEqual(plan.allocations[1].used, 3);
});

test('dispenseFEFO reports shortfall when not enough stock', () => {
  const batches = [{ batchNo: 'A', quantity: 2, expiryDate: '2030-01-01' }];
  const plan = inv.dispenseFEFO(batches, 5);
  assert.strictEqual(plan.dispensed, 2);
  assert.strictEqual(plan.shortfall, 3);
});

test('gstBreakup intra-state splits CGST+SGST', () => {
  const b = inv.gstBreakup(1000, 12, false);
  assert.strictEqual(b.cgst, 60);
  assert.strictEqual(b.sgst, 60);
  assert.strictEqual(b.igst, 0);
  assert.strictEqual(b.taxTotal, 120);
  assert.strictEqual(b.total, 1120);
});

test('gstBreakup inter-state uses IGST', () => {
  const b = inv.gstBreakup(1000, 18, true);
  assert.strictEqual(b.igst, 180);
  assert.strictEqual(b.cgst, 0);
  assert.strictEqual(b.total, 1180);
});

test('stockValuation multiplies qty by cost', () => {
  const items = [
    { costPrice: 10, batches: [{ quantity: 5 }, { quantity: 5 }] },
    { costPrice: 2, quantity: 100 }
  ];
  assert.strictEqual(inv.stockValuation(items), 300);
});

test('buildAlerts flags low stock, expiring and expired', () => {
  const now = new Date('2026-06-05');
  const items = [
    { name: 'Paracetamol', reorderLevel: 10, batches: [{ batchNo: 'X', quantity: 5, expiryDate: '2026-07-01' }] },
    { name: 'Amoxicillin', reorderLevel: 5, batches: [{ batchNo: 'Y', quantity: 50, expiryDate: '2026-01-01' }] }
  ];
  const alerts = inv.buildAlerts(items, now);
  assert.strictEqual(alerts.lowStock.length, 1); // Paracetamol qty 5 <= 10
  assert.strictEqual(alerts.expiringSoon.length, 1); // batch X
  assert.strictEqual(alerts.expired.length, 1); // batch Y
});
