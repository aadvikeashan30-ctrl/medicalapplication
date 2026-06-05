/**
 * inventoryService — Pure stock/pharmacy calculations.
 *
 * Powers the Pharmacy / Inventory module: stock status, expiry tracking,
 * FEFO (First-Expiry-First-Out) dispensing, GST breakup and stock valuation.
 *
 * Pure module (no external dependencies) — fully unit-testable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRY_WINDOW_DAYS = 90;

/**
 * Sum quantity across all (non-expired optional) batches.
 */
function totalQuantity(batches = []) {
  return batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
}

/**
 * Stock status given current quantity and a reorder level.
 *  - 'out'  : quantity <= 0
 *  - 'low'  : quantity <= reorderLevel
 *  - 'in'   : otherwise
 */
function stockStatus(quantity, reorderLevel = 10) {
  const q = Number(quantity) || 0;
  if (q <= 0) return 'out';
  if (q <= (Number(reorderLevel) || 0)) return 'low';
  return 'in';
}

/**
 * Days until expiry (negative if already expired).
 */
function daysUntilExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) return Infinity;
  const exp = new Date(expiryDate).getTime();
  const ref = new Date(now).getTime();
  return Math.floor((exp - ref) / MS_PER_DAY);
}

/**
 * Expiry status for a batch.
 *  - 'expired'        : past expiry
 *  - 'expiring-soon'  : within `windowDays`
 *  - 'ok'             : beyond the window
 */
function expiryStatus(expiryDate, now = new Date(), windowDays = DEFAULT_EXPIRY_WINDOW_DAYS) {
  const d = daysUntilExpiry(expiryDate, now);
  if (d < 0) return 'expired';
  if (d <= windowDays) return 'expiring-soon';
  return 'ok';
}

/**
 * FEFO dispense plan: consume from batches nearest to expiry first, skipping
 * already-expired batches. Does not mutate input.
 *
 * @returns {{ allocations: Array<{batchNo,used,expiryDate}>, dispensed:number, shortfall:number }}
 */
function dispenseFEFO(batches = [], requestedQty = 0, now = new Date()) {
  const need = Math.max(0, Number(requestedQty) || 0);
  // Only usable (non-expired) batches, sorted by earliest expiry.
  const usable = batches
    .filter((b) => expiryStatus(b.expiryDate, now) !== 'expired')
    .slice()
    .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));

  let remaining = need;
  const allocations = [];
  for (const b of usable) {
    if (remaining <= 0) break;
    const avail = Number(b.quantity) || 0;
    if (avail <= 0) continue;
    const used = Math.min(avail, remaining);
    allocations.push({ batchNo: b.batchNo || null, used, expiryDate: b.expiryDate || null });
    remaining -= used;
  }
  return {
    allocations,
    dispensed: need - remaining,
    shortfall: remaining
  };
}

/**
 * GST breakup. Intra-state splits into CGST + SGST; inter-state uses IGST.
 * `amount` is treated as the taxable (pre-tax) base.
 */
function gstBreakup(amount, gstRate = 12, interState = false) {
  const base = Math.max(0, Number(amount) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);
  const taxTotal = round2((base * rate) / 100);
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (interState) {
    igst = taxTotal;
  } else {
    cgst = round2(taxTotal / 2);
    sgst = round2(taxTotal - cgst);
  }
  return {
    base: round2(base),
    gstRate: rate,
    cgst,
    sgst,
    igst,
    taxTotal,
    total: round2(base + taxTotal)
  };
}

/**
 * Total valuation of stock at purchase (cost) price.
 */
function stockValuation(items = []) {
  return round2(
    items.reduce((sum, it) => {
      const qty = it.batches ? totalQuantity(it.batches) : Number(it.quantity) || 0;
      const cost = Number(it.costPrice) || 0;
      return sum + qty * cost;
    }, 0)
  );
}

/**
 * Aggregate alerts across an item list: which need reorder, which are expiring.
 */
function buildAlerts(items = [], now = new Date()) {
  const lowStock = [];
  const expiringSoon = [];
  const expired = [];
  for (const it of items) {
    const qty = it.batches ? totalQuantity(it.batches) : Number(it.quantity) || 0;
    if (stockStatus(qty, it.reorderLevel) !== 'in') {
      lowStock.push({ name: it.name, quantity: qty, reorderLevel: it.reorderLevel || 0 });
    }
    for (const b of it.batches || []) {
      const st = expiryStatus(b.expiryDate, now);
      if (st === 'expired') expired.push({ name: it.name, batchNo: b.batchNo, expiryDate: b.expiryDate });
      else if (st === 'expiring-soon') expiringSoon.push({ name: it.name, batchNo: b.batchNo, expiryDate: b.expiryDate });
    }
  }
  return { lowStock, expiringSoon, expired };
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  totalQuantity,
  stockStatus,
  daysUntilExpiry,
  expiryStatus,
  dispenseFEFO,
  gstBreakup,
  stockValuation,
  buildAlerts,
  DEFAULT_EXPIRY_WINDOW_DAYS
};
