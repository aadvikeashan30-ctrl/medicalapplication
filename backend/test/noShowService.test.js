const test = require('node:test');
const assert = require('node:assert');
const ns = require('../src/services/noShowService');

// ---------------------------------------------------------------------------
// historicalNoShowRate
// ---------------------------------------------------------------------------
test('historicalNoShowRate returns 0 with no visit history', () => {
  assert.strictEqual(ns.historicalNoShowRate(0, 0), 0);
  assert.strictEqual(ns.historicalNoShowRate(3, 0), 0); // no total => 0
  assert.strictEqual(ns.historicalNoShowRate(undefined, undefined), 0);
});

test('historicalNoShowRate computes and clamps the ratio', () => {
  assert.strictEqual(ns.historicalNoShowRate(2, 10), 0.2);
  assert.strictEqual(ns.historicalNoShowRate(5, 5), 1);
  assert.strictEqual(ns.historicalNoShowRate(99, 10), 1); // clamped at 1
  assert.strictEqual(ns.historicalNoShowRate(-1, 10), 0); // negatives floored
});

// ---------------------------------------------------------------------------
// leadTimePoints
// ---------------------------------------------------------------------------
test('leadTimePoints buckets by horizon', () => {
  assert.strictEqual(ns.leadTimePoints(0), 0);
  assert.strictEqual(ns.leadTimePoints(2), 0);
  assert.strictEqual(ns.leadTimePoints(3), 6);
  assert.strictEqual(ns.leadTimePoints(7), 6);
  assert.strictEqual(ns.leadTimePoints(8), 12);
  assert.strictEqual(ns.leadTimePoints(21), 12);
  assert.strictEqual(ns.leadTimePoints(22), 18);
  assert.strictEqual(ns.leadTimePoints(-5), 0); // negative => floored to 0 bucket
});

// ---------------------------------------------------------------------------
// parseSlotHour
// ---------------------------------------------------------------------------
test('parseSlotHour handles numbers, 12h and 24h strings', () => {
  assert.strictEqual(ns.parseSlotHour(0), 0);
  assert.strictEqual(ns.parseSlotHour(14), 14);
  assert.strictEqual(ns.parseSlotHour('10:00 AM'), 10);
  assert.strictEqual(ns.parseSlotHour('12:00 AM'), 0); // midnight
  assert.strictEqual(ns.parseSlotHour('12:00 PM'), 12); // noon
  assert.strictEqual(ns.parseSlotHour('5:30 PM'), 17);
  assert.strictEqual(ns.parseSlotHour('17:00'), 17);
  assert.strictEqual(ns.parseSlotHour('8 am'), 8);
});

test('parseSlotHour returns null for junk', () => {
  assert.strictEqual(ns.parseSlotHour('not a time'), null);
  assert.strictEqual(ns.parseSlotHour(null), null);
  assert.strictEqual(ns.parseSlotHour({}), null);
  assert.strictEqual(ns.parseSlotHour('99:00'), null);
});

// ---------------------------------------------------------------------------
// riskScore
// ---------------------------------------------------------------------------
test('riskScore: confirmed, established, reliable patient is low risk', () => {
  const r = ns.riskScore({
    priorNoShows: 0,
    totalPriorVisits: 12,
    confirmed: true,
    leadTimeDays: 1,
    slot: '11:00 AM',
    age: 40
  });
  // confirmed bonus drives score to/near 0
  assert.strictEqual(r.score, 0);
  assert.strictEqual(r.band, 'low');
  assert.strictEqual(r.noShowProbability, 0);
  assert.ok(Array.isArray(r.factors));
});

test('riskScore: new, unconfirmed, far-booked, far-away patient is high/critical', () => {
  const r = ns.riskScore({
    isNewPatient: true,
    confirmed: false,
    leadTimeDays: 30,
    slot: '8:00 AM',
    distanceKm: 40,
    hasOutstandingBalance: true,
    age: 22
  });
  // 12 (new) + 14 (unconfirmed) + 18 (lead) + 6 (early) + 8 (distance) + 8 (balance) + 5 (young) = 71
  assert.strictEqual(r.score, 71);
  assert.strictEqual(r.band, 'critical');
  assert.ok(r.noShowProbability > 0.5);
});

test('riskScore: heavy history pushes score up and is clamped at 100', () => {
  const r = ns.riskScore({
    priorNoShows: 10,
    totalPriorVisits: 10, // rate 1.0 => +40
    isNewPatient: false,
    confirmed: false, // +14
    leadTimeDays: 30, // +18
    slot: '18:00', // late +6
    previousReschedules: 5, // capped +15
    distanceKm: 100, // +8
    hasOutstandingBalance: true, // +8
    age: 20 // +5
  });
  // sum well over 100 -> clamped
  assert.strictEqual(r.score, 100);
  assert.strictEqual(r.band, 'critical');
  assert.strictEqual(r.noShowProbability, 1);
});

test('riskScore never goes negative (confirmed bonus cannot underflow)', () => {
  const r = ns.riskScore({
    priorNoShows: 0,
    totalPriorVisits: 50,
    confirmed: true, // -10
    leadTimeDays: 0,
    slot: 12,
    age: 35
  });
  assert.ok(r.score >= 0);
  assert.strictEqual(r.score, 0);
});

test('riskScore: confirming an appointment lowers the score', () => {
  const base = { isNewPatient: true, leadTimeDays: 10, slot: '10:00 AM', age: 30 };
  const unconfirmed = ns.riskScore({ ...base, confirmed: false });
  const confirmed = ns.riskScore({ ...base, confirmed: true });
  assert.ok(confirmed.score < unconfirmed.score);
  // difference = unconfirmed(+14) vs confirmed(-10) = 24 points
  assert.strictEqual(unconfirmed.score - confirmed.score, 24);
});

test('riskScore: reschedule points are capped at 15', () => {
  const r = ns.riskScore({ totalPriorVisits: 5, priorNoShows: 0, confirmed: true, previousReschedules: 99, slot: 12 });
  const factor = r.factors.find((f) => /reschedule/.test(f.label));
  assert.strictEqual(factor.points, 15);
});

test('riskScore: each factor carries an explainable reason', () => {
  const r = ns.riskScore({ isNewPatient: true, confirmed: false, slot: '8:00 AM' });
  const labels = r.factors.map((f) => f.label).join(' | ');
  assert.match(labels, /New patient/);
  assert.match(labels, /not yet confirmed/);
  assert.match(labels, /Early-morning/);
});

test('riskScore handles empty input gracefully', () => {
  const r = ns.riskScore();
  assert.strictEqual(typeof r.score, 'number');
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.ok(['low', 'medium', 'high', 'critical'].includes(r.band));
});

// ---------------------------------------------------------------------------
// riskBand thresholds (boundaries)
// ---------------------------------------------------------------------------
test('riskBand maps scores to bands at exact boundaries', () => {
  assert.strictEqual(ns.riskBand(0), 'low');
  assert.strictEqual(ns.riskBand(19), 'low');
  assert.strictEqual(ns.riskBand(20), 'medium');
  assert.strictEqual(ns.riskBand(44), 'medium');
  assert.strictEqual(ns.riskBand(45), 'high');
  assert.strictEqual(ns.riskBand(69), 'high');
  assert.strictEqual(ns.riskBand(70), 'critical');
  assert.strictEqual(ns.riskBand(100), 'critical');
});

test('riskBand clamps out-of-range input', () => {
  assert.strictEqual(ns.riskBand(-50), 'low');
  assert.strictEqual(ns.riskBand(999), 'critical');
});

// ---------------------------------------------------------------------------
// reminderPlan
// ---------------------------------------------------------------------------
test('reminderPlan scales reminder count with risk band', () => {
  assert.strictEqual(ns.reminderPlan('low').reminders.length, 1);
  assert.strictEqual(ns.reminderPlan('medium').reminders.length, 2);
  assert.strictEqual(ns.reminderPlan('high').reminders.length, 3);
  assert.strictEqual(ns.reminderPlan('critical').reminders.length, 3);
});

test('reminderPlan accepts a numeric score and derives the band', () => {
  const plan = ns.reminderPlan(80);
  assert.strictEqual(plan.band, 'critical');
  assert.ok(plan.escalations.includes('offer-telemedicine'));
});

test('reminderPlan critical requires confirmation and adds escalations', () => {
  const plan = ns.reminderPlan('critical');
  assert.ok(plan.reminders.every((r) => r.requireConfirmation === true));
  assert.ok(plan.escalations.includes('waitlist-standby'));
});

test('reminderPlan low band needs no confirmation and no escalations', () => {
  const plan = ns.reminderPlan('low');
  assert.strictEqual(plan.reminders[0].requireConfirmation, false);
  assert.deepStrictEqual(plan.escalations, []);
});

test('reminderPlan respects the available channels list', () => {
  const plan = ns.reminderPlan('critical', { channels: ['sms'] });
  assert.ok(plan.reminders.every((r) => r.channel === 'sms'));
});

// ---------------------------------------------------------------------------
// recommendOverbooking
// ---------------------------------------------------------------------------
test('recommendOverbooking returns 0 for an empty slot', () => {
  const r = ns.recommendOverbooking([]);
  assert.strictEqual(r.slotSize, 0);
  assert.strictEqual(r.expectedNoShows, 0);
  assert.strictEqual(r.recommendedOverbook, 0);
});

test('recommendOverbooking returns 0 when nobody is at risk', () => {
  const r = ns.recommendOverbooking([0, 0, 0, 0, 0]);
  assert.strictEqual(r.recommendedOverbook, 0);
});

test('recommendOverbooking backfills expected no-shows within the cap', () => {
  // 10 appts each 50% no-show => expected 5; safety 0.8 => 4; cap 20% of 10 = 2 => 2
  const probs = new Array(10).fill(0.5);
  const r = ns.recommendOverbooking(probs);
  assert.strictEqual(r.expectedNoShows, 5);
  assert.strictEqual(r.recommendedOverbook, 2); // hard cap applied
});

test('recommendOverbooking respects a custom safety factor and cap', () => {
  const probs = new Array(10).fill(0.5); // expected 5
  const r = ns.recommendOverbooking(probs, { safetyFactor: 0.4, maxOverbookRatio: 1 });
  // 5 * 0.4 = 2 (floored), cap = 10 => 2
  assert.strictEqual(r.recommendedOverbook, 2);
});

test('recommendOverbooking accepts appointment objects (computes probabilities)', () => {
  const appts = [
    { isNewPatient: true, confirmed: false, leadTimeDays: 30, slot: '8:00 AM', hasOutstandingBalance: true, distanceKm: 40, age: 22 },
    { isNewPatient: true, confirmed: false, leadTimeDays: 30, slot: '8:00 AM', hasOutstandingBalance: true, distanceKm: 40, age: 22 },
    { confirmed: true, totalPriorVisits: 10, priorNoShows: 0, slot: 12 }
  ];
  const r = ns.recommendOverbooking(appts, { maxOverbookRatio: 1 });
  assert.ok(r.expectedNoShows > 1);
  assert.ok(r.recommendedOverbook >= 1);
});

// ---------------------------------------------------------------------------
// analyzeDay
// ---------------------------------------------------------------------------
test('analyzeDay aggregates attendance, loss and band counts', () => {
  const appointments = [
    // low risk, confirmed, reliable
    { id: 'a1', patientName: 'Asha', slot: '10:00 AM', fee: 500, confirmed: true, totalPriorVisits: 8, priorNoShows: 0, age: 45 },
    // critical risk
    { id: 'a2', patientName: 'Ravi', slot: '8:00 AM', fee: 500, isNewPatient: true, confirmed: false, leadTimeDays: 30, distanceKm: 40, hasOutstandingBalance: true, age: 22 }
  ];
  const result = ns.analyzeDay(appointments);

  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.bandCounts.low, 1);
  assert.strictEqual(result.bandCounts.critical, 1);
  // attendance + no-shows == total
  assert.strictEqual(round2(result.expectedAttendance + result.expectedNoShows), 2);
  assert.ok(result.predictedRevenueLoss > 0);
  // high-risk list contains the critical appt, sorted desc by score
  assert.strictEqual(result.highRisk.length, 1);
  assert.strictEqual(result.highRisk[0].id, 'a2');
  // each scored appt carries a reminder plan
  assert.ok(result.appointments[0].reminderPlan.reminders.length >= 1);

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
});

test('analyzeDay handles an empty schedule', () => {
  const result = ns.analyzeDay([]);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.expectedAttendance, 0);
  assert.strictEqual(result.expectedNoShows, 0);
  assert.strictEqual(result.predictedRevenueLoss, 0);
  assert.deepStrictEqual(result.highRisk, []);
  assert.strictEqual(result.overbooking.recommendedOverbook, 0);
});

test('analyzeDay sorts high-risk appointments by descending score', () => {
  const appointments = [
    { id: 'mid', slot: '10:00 AM', confirmed: false, isNewPatient: true, leadTimeDays: 10, distanceKm: 40 },
    { id: 'top', slot: '8:00 AM', confirmed: false, isNewPatient: true, leadTimeDays: 30, distanceKm: 40, hasOutstandingBalance: true, age: 20, previousReschedules: 3 }
  ];
  const result = ns.analyzeDay(appointments);
  assert.ok(result.highRisk.length >= 1);
  for (let i = 1; i < result.highRisk.length; i++) {
    assert.ok(result.highRisk[i - 1].score >= result.highRisk[i].score);
  }
});
