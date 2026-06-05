/**
 * abdmService — Ayushman Bharat Digital Mission (ABDM / ABHA) helpers.
 *
 * Provides validation, masking, demo ABHA generation, and consent-artefact
 * construction so the platform is ABDM-ready. When real ABDM gateway
 * credentials are configured (ABDM_CLIENT_ID / ABDM_CLIENT_SECRET) the route
 * layer can call the live sandbox/production APIs; otherwise these helpers
 * provide a deterministic demo flow so the feature works out of the box.
 *
 * Pure-ish module: depends only on Node's built-in `crypto`.
 *
 * References (concepts only):
 *   - ABHA number: 14 digits, displayed as XX-XXXX-XXXX-XXXX
 *   - ABHA address: human-friendly handle, e.g. name@sbx / name@abdm
 */

const crypto = require('crypto');

function isConfigured() {
  return Boolean(process.env.ABDM_CLIENT_ID && process.env.ABDM_CLIENT_SECRET);
}

/**
 * Validate a 14-digit ABHA number. Accepts spaces/hyphens as separators.
 * Returns the normalized 14-digit string or null.
 */
function normalizeAbhaNumber(input) {
  if (!input) return null;
  const digits = String(input).replace(/[\s-]/g, '');
  return /^\d{14}$/.test(digits) ? digits : null;
}

function isValidAbhaNumber(input) {
  return normalizeAbhaNumber(input) !== null;
}

/**
 * Format a 14-digit ABHA number as XX-XXXX-XXXX-XXXX.
 */
function formatAbhaNumber(input) {
  const d = normalizeAbhaNumber(input);
  if (!d) return null;
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}-${d.slice(10, 14)}`;
}

/**
 * Validate an ABHA address handle: 1 letter to start, letters/digits/dot/underscore,
 * followed by @suffix. Length 8-40 of the local part per ABDM-style rules.
 */
function isValidAbhaAddress(addr) {
  if (!addr || typeof addr !== 'string') return false;
  return /^[a-zA-Z][a-zA-Z0-9._]{2,39}@[a-zA-Z]{2,10}$/.test(addr.trim());
}

/**
 * Mask an ABHA number for display: XX-XXXX-XXXX-1234.
 */
function maskAbhaNumber(input) {
  const d = normalizeAbhaNumber(input);
  if (!d) return '';
  return `XX-XXXX-XXXX-${d.slice(10, 14)}`;
}

/**
 * Generate a deterministic-looking demo ABHA profile (development/demo only).
 */
function generateDemoAbha(name = 'patient') {
  const rnd = crypto.randomBytes(7).readUIntBE(0, 6).toString().padStart(14, '0').slice(-14);
  const handle = String(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'patient';
  const suffix = crypto.randomBytes(2).toString('hex');
  return {
    abhaNumber: formatAbhaNumber(rnd),
    abhaAddress: `${handle}${suffix}@sbx`,
    status: 'active',
    kycVerified: true,
    source: 'demo',
    createdAt: new Date().toISOString()
  };
}

/**
 * Build a consent request artefact (HIP/HIU style) used to gate record sharing.
 * `purposeCode` examples: CAREMGT (care management), BTG (break the glass).
 */
function buildConsentRequest({ abhaAddress, hiTypes = ['Prescription', 'DiagnosticReport'], purposeCode = 'CAREMGT', fromDate, toDate, expiry, requesterId } = {}) {
  const now = new Date();
  const defaultFrom = fromDate ? new Date(fromDate) : new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const defaultTo = toDate ? new Date(toDate) : now;
  const defaultExpiry = expiry ? new Date(expiry) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return {
    consentId: crypto.randomUUID(),
    status: 'REQUESTED',
    patient: { id: abhaAddress || null },
    purpose: { code: purposeCode },
    hiTypes,
    permission: {
      dateRange: { from: defaultFrom.toISOString(), to: defaultTo.toISOString() },
      dataEraseAt: defaultExpiry.toISOString()
    },
    requester: { id: requesterId || process.env.ABDM_HIP_ID || 'DEMO-HIP' },
    createdAt: now.toISOString()
  };
}

/**
 * Validate inputs for linking a care-context (a clinical record) to an ABHA.
 * Returns { ok, errors[] }.
 */
function validateCareContextLink({ abhaNumber, abhaAddress, careContextReference, display } = {}) {
  const errors = [];
  if (!isValidAbhaNumber(abhaNumber) && !isValidAbhaAddress(abhaAddress)) {
    errors.push('A valid ABHA number or ABHA address is required');
  }
  if (!careContextReference) errors.push('careContextReference is required');
  if (!display) errors.push('display label is required');
  return { ok: errors.length === 0, errors };
}

module.exports = {
  isConfigured,
  normalizeAbhaNumber,
  isValidAbhaNumber,
  formatAbhaNumber,
  isValidAbhaAddress,
  maskAbhaNumber,
  generateDemoAbha,
  buildConsentRequest,
  validateCareContextLink
};
