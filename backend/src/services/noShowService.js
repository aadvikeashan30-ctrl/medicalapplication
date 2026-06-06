/**
 * noShowService — Predictive no-show detection & smart scheduling engine.
 *
 * The market differentiator: instead of blasting identical reminders to every
 * patient, this engine scores each appointment's no-show risk from explainable
 * signals, then recommends a *risk-targeted* reminder cadence and *smart
 * overbooking* so clinics recover revenue lost to empty slots.
 *
 * Design goals:
 *   - Deterministic & explainable (every point of risk has a human-readable
 *     reason) — clinicians trust what they can see.
 *   - Pure module (no DB / network / AI key required) — fully unit-testable
 *     and works in demo mode. The route layer feeds it data from Mongo.
 *
 * Scoring is an additive, capped model (0-100). See FACTOR_WEIGHTS below.
 */

const RISK_BANDS = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
});

// Band thresholds (lower-inclusive). score < 20 => low, etc.
const BAND_THRESHOLDS = Object.freeze([
  { min: 70, band: RISK_BANDS.CRITICAL },
  { min: 45, band: RISK_BANDS.HIGH },
  { min: 20, band: RISK_BANDS.MEDIUM },
  { min: 0, band: RISK_BANDS.LOW }
]);

// Documented, tunable weights. Total possible before clamp is intentionally
// > 100 so multiple compounding risks reliably push into the critical band.
const FACTOR_WEIGHTS = Object.freeze({
  history: 40, // scaled by historical no-show rate (0..1)
  newPatient: 12, // no track record
  unconfirmed: 14, // patient has not confirmed
  confirmedBonus: -10, // patient explicitly confirmed
  leadShort: 0, // <= 2 days
  leadWeek: 6, // 3-7 days
  leadFortnight: 12, // 8-21 days
  leadLong: 18, // > 21 days
  earlySlot: 6, // before 09:00
  lateSlot: 6, // 17:00 or later
  reschedulePerEvent: 5, // capped
  rescheduleCap: 15,
  longDistance: 8, // > 25 km
  outstandingBalance: 8, // unpaid prior dues
  youngAdult: 5 // age < 25 (statistically higher no-show)
});

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round(n) {
  return Math.round(Number(n) || 0);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Historical no-show rate for a patient.
 * @returns {number} 0..1 (0 when there is no visit history)
 */
function historicalNoShowRate(priorNoShows = 0, totalPriorVisits = 0) {
  const total = Math.max(0, Number(totalPriorVisits) || 0);
  const misses = Math.max(0, Number(priorNoShows) || 0);
  if (total <= 0) return 0;
  return clamp(misses / total, 0, 1);
}

/**
 * Lead-time contribution (longer waits between booking and the visit raise
 * the chance the patient forgets or plans change).
 */
function leadTimePoints(leadTimeDays = 0) {
  const d = Math.max(0, Number(leadTimeDays) || 0);
  if (d <= 2) return FACTOR_WEIGHTS.leadShort;
  if (d <= 7) return FACTOR_WEIGHTS.leadWeek;
  if (d <= 21) return FACTOR_WEIGHTS.leadFortnight;
  return FACTOR_WEIGHTS.leadLong;
}

/**
 * Parse an hour-of-day from either a number (0-23) or a slot string like
 * "10:00 AM" / "5:30 PM" / "17:00". Returns null when unparseable.
 */
function parseSlotHour(slot) {
  if (slot === 0) return 0;
  if (typeof slot === 'number' && Number.isFinite(slot)) return clamp(Math.floor(slot), 0, 23);
  if (typeof slot !== 'string') return null;
  const m = slot.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const meridiem = m[3] ? m[3].toLowerCase() : null;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return hour;
}

/**
 * Score a single appointment's no-show risk.
 *
 * @param {object} appt
 * @param {number} [appt.priorNoShows]
 * @param {number} [appt.totalPriorVisits]
 * @param {boolean} [appt.isNewPatient]
 * @param {boolean} [appt.confirmed]
 * @param {number} [appt.leadTimeDays]
 * @param {(number|string)} [appt.slot]            hour or "10:00 AM"
 * @param {number} [appt.previousReschedules]
 * @param {number} [appt.distanceKm]
 * @param {boolean} [appt.hasOutstandingBalance]
 * @param {number} [appt.age]
 * @returns {{ score:number, band:string, noShowProbability:number, factors:Array<{label:string,points:number}>, recommendation:string }}
 */
function riskScore(appt = {}) {
  const factors = [];
  let score = 0;

  const add = (points, label) => {
    if (!points) return;
    score += points;
    factors.push({ label, points: round(points) });
  };

  // 1. Historical behaviour (strongest, evidence-based signal).
  const rate = historicalNoShowRate(appt.priorNoShows, appt.totalPriorVisits);
  if (rate > 0) {
    const pts = round(rate * FACTOR_WEIGHTS.history);
    add(pts, `Past no-show rate ${Math.round(rate * 100)}% (${appt.priorNoShows}/${appt.totalPriorVisits})`);
  }

  // 2. New patient (no history to lean on).
  if (appt.isNewPatient) add(FACTOR_WEIGHTS.newPatient, 'New patient — no attendance history');

  // 3. Confirmation status.
  if (appt.confirmed === true) add(FACTOR_WEIGHTS.confirmedBonus, 'Patient confirmed the appointment');
  else add(FACTOR_WEIGHTS.unconfirmed, 'Appointment not yet confirmed');

  // 4. Lead time.
  const leadPts = leadTimePoints(appt.leadTimeDays);
  if (leadPts) add(leadPts, `Booked ${Math.round(appt.leadTimeDays)} day(s) ahead`);

  // 5. Slot timing.
  const hour = parseSlotHour(appt.slot);
  if (hour !== null) {
    if (hour < 9) add(FACTOR_WEIGHTS.earlySlot, 'Early-morning slot');
    else if (hour >= 17) add(FACTOR_WEIGHTS.lateSlot, 'Late-evening slot');
  }

  // 6. Prior reschedules.
  const reschedules = Math.max(0, Number(appt.previousReschedules) || 0);
  if (reschedules > 0) {
    const pts = Math.min(reschedules * FACTOR_WEIGHTS.reschedulePerEvent, FACTOR_WEIGHTS.rescheduleCap);
    add(pts, `${reschedules} previous reschedule(s)`);
  }

  // 7. Distance.
  if ((Number(appt.distanceKm) || 0) > 25) add(FACTOR_WEIGHTS.longDistance, 'Travels > 25 km to clinic');

  // 8. Outstanding balance.
  if (appt.hasOutstandingBalance) add(FACTOR_WEIGHTS.outstandingBalance, 'Has outstanding unpaid balance');

  // 9. Young adult.
  const age = Number(appt.age);
  if (Number.isFinite(age) && age > 0 && age < 25) add(FACTOR_WEIGHTS.youngAdult, 'Patient under 25');

  score = round(clamp(score, 0, 100));
  const band = riskBand(score);

  return {
    score,
    band,
    noShowProbability: round2(score / 100),
    factors,
    recommendation: bandRecommendation(band)
  };
}

/**
 * Map a numeric score to a risk band.
 */
function riskBand(score) {
  const s = clamp(Number(score) || 0, 0, 100);
  for (const { min, band } of BAND_THRESHOLDS) {
    if (s >= min) return band;
  }
  return RISK_BANDS.LOW;
}

function bandRecommendation(band) {
  switch (band) {
    case RISK_BANDS.CRITICAL:
      return 'High chance of no-show: require confirmation, call the patient, offer a telemedicine alternative, and keep a waitlist standby.';
    case RISK_BANDS.HIGH:
      return 'Send multiple reminders across channels and request explicit confirmation.';
    case RISK_BANDS.MEDIUM:
      return 'Send a reminder the day before and 24h prior.';
    default:
      return 'A single standard reminder is sufficient.';
  }
}

/**
 * Risk-targeted reminder cadence. The unique selling point: effort scales with
 * risk instead of one-size-fits-all blasting.
 *
 * @param {(number|string)} scoreOrBand   numeric score or a band string
 * @param {object} [opts]
 * @param {string[]} [opts.channels]       available channels, e.g. ['whatsapp','sms','call']
 * @returns {{ band:string, reminders:Array<{hoursBefore:number,channel:string,requireConfirmation:boolean}>, escalations:string[] }}
 */
function reminderPlan(scoreOrBand, opts = {}) {
  const band = typeof scoreOrBand === 'string' ? scoreOrBand : riskBand(scoreOrBand);
  const available = Array.isArray(opts.channels) && opts.channels.length ? opts.channels : ['whatsapp', 'sms', 'call'];
  const pick = (preferred) => available.find((c) => c === preferred) || available[0];

  const wa = pick('whatsapp');
  const sms = pick('sms');
  const call = pick('call');

  let reminders = [];
  let escalations = [];

  switch (band) {
    case RISK_BANDS.CRITICAL:
      reminders = [
        { hoursBefore: 72, channel: wa, requireConfirmation: true },
        { hoursBefore: 24, channel: sms, requireConfirmation: true },
        { hoursBefore: 3, channel: call, requireConfirmation: true }
      ];
      escalations = ['offer-telemedicine', 'waitlist-standby', 'flag-for-front-desk-call'];
      break;
    case RISK_BANDS.HIGH:
      reminders = [
        { hoursBefore: 72, channel: wa, requireConfirmation: true },
        { hoursBefore: 24, channel: sms, requireConfirmation: true },
        { hoursBefore: 3, channel: wa, requireConfirmation: false }
      ];
      escalations = ['request-confirmation'];
      break;
    case RISK_BANDS.MEDIUM:
      reminders = [
        { hoursBefore: 48, channel: wa, requireConfirmation: false },
        { hoursBefore: 24, channel: wa, requireConfirmation: false }
      ];
      break;
    default:
      reminders = [{ hoursBefore: 24, channel: wa, requireConfirmation: false }];
  }

  return { band, reminders, escalations };
}

/**
 * Smart overbooking recommendation for a set of appointments sharing capacity
 * (e.g. one time-slot or one session). Returns how many extra bookings can be
 * safely added to absorb expected no-shows without over-flooding the slot.
 *
 * @param {Array<object|number>} appts  appointment objects or pre-computed probabilities
 * @param {object} [opts]
 * @param {number} [opts.safetyFactor=0.8]  fraction of expected no-shows to backfill (0..1)
 * @param {number} [opts.maxOverbookRatio=0.2]  hard cap as a fraction of slot size
 * @returns {{ slotSize:number, expectedNoShows:number, recommendedOverbook:number, safetyFactor:number }}
 */
function recommendOverbooking(appts = [], opts = {}) {
  const safetyFactor = clamp(opts.safetyFactor ?? 0.8, 0, 1);
  const maxOverbookRatio = clamp(opts.maxOverbookRatio ?? 0.2, 0, 1);
  const slotSize = appts.length;

  const expectedNoShows = appts.reduce((sum, a) => {
    const prob = typeof a === 'number' ? a : riskScore(a).noShowProbability;
    return sum + clamp(prob, 0, 1);
  }, 0);

  const cap = Math.floor(slotSize * maxOverbookRatio);
  const recommendedOverbook = clamp(Math.floor(expectedNoShows * safetyFactor), 0, cap);

  return {
    slotSize,
    expectedNoShows: round2(expectedNoShows),
    recommendedOverbook,
    safetyFactor
  };
}

/**
 * Analyze a full day's (or session's) appointments: per-appointment risk plus
 * aggregate forecasts a clinic manager actually cares about.
 *
 * @param {Array<object>} appointments  each may carry { fee, ...riskInputs }
 * @param {object} [opts]                forwarded to recommendOverbooking
 * @returns {object}
 */
function analyzeDay(appointments = [], opts = {}) {
  const scored = appointments.map((a) => {
    const risk = riskScore(a);
    const fee = Math.max(0, Number(a.fee) || 0);
    return {
      ...(a.id ? { id: a.id } : {}),
      ...(a.patientName ? { patientName: a.patientName } : {}),
      slot: a.slot ?? null,
      fee,
      score: risk.score,
      band: risk.band,
      noShowProbability: risk.noShowProbability,
      factors: risk.factors,
      reminderPlan: reminderPlan(risk.band, opts),
      recommendation: risk.recommendation
    };
  });

  const total = scored.length;
  const expectedNoShows = round2(scored.reduce((s, a) => s + a.noShowProbability, 0));
  const expectedAttendance = round2(total - expectedNoShows);
  const predictedRevenueLoss = round2(scored.reduce((s, a) => s + a.noShowProbability * a.fee, 0));

  const bandCounts = scored.reduce(
    (acc, a) => {
      acc[a.band] = (acc[a.band] || 0) + 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );

  const highRisk = scored
    .filter((a) => a.band === RISK_BANDS.HIGH || a.band === RISK_BANDS.CRITICAL)
    .sort((a, b) => b.score - a.score);

  const overbooking = recommendOverbooking(
    scored.map((a) => a.noShowProbability),
    opts
  );

  return {
    total,
    expectedAttendance,
    expectedNoShows,
    predictedRevenueLoss,
    bandCounts,
    overbooking,
    highRisk,
    appointments: scored
  };
}

module.exports = {
  RISK_BANDS,
  FACTOR_WEIGHTS,
  historicalNoShowRate,
  leadTimePoints,
  parseSlotHour,
  riskScore,
  riskBand,
  reminderPlan,
  recommendOverbooking,
  analyzeDay
};
