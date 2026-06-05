/**
 * claimService — Pure insurance / TPA / cashless claim calculations and workflow.
 *
 * Powers the Insurance Claims module: claim amount computation (copay,
 * deductible, sum-insured caps), claim-number formatting, and validated
 * status transitions.
 *
 * Pure module (no external dependencies) — fully unit-testable.
 */

// Allowed claim lifecycle and the transitions permitted from each state.
const STATUS_FLOW = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under-review', 'cancelled'],
  'under-review': ['approved', 'partially-approved', 'rejected', 'query-raised'],
  'query-raised': ['under-review', 'cancelled'],
  approved: ['settled'],
  'partially-approved': ['settled', 'rejected'],
  rejected: ['submitted'], // allow resubmission after fixing
  settled: [],
  cancelled: []
};

const STATUSES = Object.keys(STATUS_FLOW);

function isValidStatus(status) {
  return STATUSES.includes(status);
}

/**
 * Validate a status transition. Returns { ok:boolean, reason?:string }.
 */
function canTransition(from, to) {
  if (!isValidStatus(from)) return { ok: false, reason: `Unknown current status: ${from}` };
  if (!isValidStatus(to)) return { ok: false, reason: `Unknown target status: ${to}` };
  if (from === to) return { ok: false, reason: 'Status unchanged' };
  if (!STATUS_FLOW[from].includes(to)) {
    return { ok: false, reason: `Cannot move from ${from} to ${to}` };
  }
  return { ok: true };
}

/**
 * Compute the claimable amount for a bill against a policy.
 *
 * @param {object} p
 * @param {number} p.billAmount        Total hospital/clinic bill
 * @param {number} [p.copayPercent=0]  Patient co-pay percentage (0-100)
 * @param {number} [p.deductible=0]    Fixed deductible borne by patient
 * @param {number} [p.sumInsured]      Policy cap (optional)
 * @param {number} [p.alreadyClaimed=0] Amount already claimed this policy year
 * @param {number} [p.nonPayable=0]    Non-payable items (consumables etc.)
 * @returns {{ claimable:number, patientPayable:number, breakdown:object }}
 */
function computeClaim(p = {}) {
  const bill = nonNeg(p.billAmount);
  const copayPercent = clamp(nonNeg(p.copayPercent), 0, 100);
  const deductible = nonNeg(p.deductible);
  const nonPayable = nonNeg(p.nonPayable);
  const alreadyClaimed = nonNeg(p.alreadyClaimed);

  // Eligible base after removing non-payable items.
  const eligibleBase = Math.max(0, bill - nonPayable);

  // Apply deductible then copay.
  const afterDeductible = Math.max(0, eligibleBase - deductible);
  const copayAmount = round2((afterDeductible * copayPercent) / 100);
  let claimable = round2(afterDeductible - copayAmount);

  // Apply remaining sum-insured cap if provided.
  let capApplied = false;
  if (p.sumInsured !== undefined && p.sumInsured !== null) {
    const remaining = Math.max(0, nonNeg(p.sumInsured) - alreadyClaimed);
    if (claimable > remaining) {
      claimable = round2(remaining);
      capApplied = true;
    }
  }

  const patientPayable = round2(bill - claimable);

  return {
    claimable,
    patientPayable,
    breakdown: {
      billAmount: round2(bill),
      nonPayable: round2(nonPayable),
      eligibleBase: round2(eligibleBase),
      deductible: round2(deductible),
      copayPercent,
      copayAmount,
      sumInsuredCapApplied: capApplied
    }
  };
}

/**
 * Format a claim number, e.g. claimNumber('TPA', 42) -> "CLM-TPA-000042".
 */
function claimNumber(insurerCode, seq) {
  const code = String(insurerCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'GEN';
  const n = String(Math.max(0, Number(seq) || 0)).padStart(6, '0');
  return `CLM-${code}-${n}`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function nonNeg(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  STATUS_FLOW,
  STATUSES,
  isValidStatus,
  canTransition,
  computeClaim,
  claimNumber
};
