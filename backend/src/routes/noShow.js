/**
 * No-Show Prediction & Smart Scheduling routes — /api/no-show
 *
 * Premium, revenue-protecting feature: score each appointment's no-show risk,
 * get a risk-targeted reminder cadence, and receive smart overbooking advice.
 * Backed by the deterministic, fully unit-tested noShowService (works without
 * any AI key) so results are explainable and reproducible.
 */
const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planLimits');
const { asyncHandler } = require('../middleware/errorHandler');
const noShow = require('../services/noShowService');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Score a single appointment from explicit inputs (stateless).
 * POST /api/no-show/score
 * body: { priorNoShows, totalPriorVisits, isNewPatient, confirmed, leadTimeDays,
 *         slot, previousReschedules, distanceKm, hasOutstandingBalance, age, channels }
 */
router.post(
  '/score',
  auth,
  requireFeature('ai'),
  asyncHandler(async (req, res) => {
    const risk = noShow.riskScore(req.body || {});
    const plan = noShow.reminderPlan(risk.band, { channels: req.body && req.body.channels });
    res.json({ ...risk, reminderPlan: plan });
  })
);

/**
 * Build a reminder cadence for a given score or band.
 * POST /api/no-show/reminder-plan  body: { score?, band?, channels? }
 */
router.post(
  '/reminder-plan',
  auth,
  requireFeature('ai'),
  asyncHandler(async (req, res) => {
    const { score, band, channels } = req.body || {};
    const key = band || (typeof score === 'number' ? score : 0);
    res.json(noShow.reminderPlan(key, { channels }));
  })
);

/**
 * Analyze a full day's schedule for the logged-in doctor: per-appointment risk,
 * expected attendance, predicted revenue loss and overbooking advice.
 * GET /api/no-show/analyze?date=YYYY-MM-DD&safetyFactor=&maxOverbookRatio=
 */
router.get(
  '/analyze',
  auth,
  requireFeature('ai'),
  asyncHandler(async (req, res) => {
    const dateStr = req.query.date;
    const day = dateStr ? new Date(dateStr) : new Date();
    if (Number.isNaN(day.getTime())) {
      return res.status(400).json({ message: 'Invalid date. Use YYYY-MM-DD.' });
    }
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + DAY_MS);

    const opts = {};
    if (req.query.safetyFactor !== undefined) opts.safetyFactor = Number(req.query.safetyFactor);
    if (req.query.maxOverbookRatio !== undefined) opts.maxOverbookRatio = Number(req.query.maxOverbookRatio);

    const appointments = await Appointment.find({
      doctorId: req.user._id,
      date: { $gte: start, $lt: end },
      status: { $nin: ['cancelled', 'completed', 'no-show'] }
    }).populate('patientId', 'name age totalVisits city');

    const patientIds = appointments
      .map((a) => a.patientId && a.patientId._id)
      .filter(Boolean);

    // Per-patient prior no-show counts and outstanding balances (single round-trip each).
    const [noShowAgg, balanceAgg] = await Promise.all([
      patientIds.length
        ? Appointment.aggregate([
            { $match: { doctorId: toObjectId(req.user._id), patientId: { $in: patientIds.map(toObjectId) }, status: 'no-show' } },
            { $group: { _id: '$patientId', count: { $sum: 1 } } }
          ])
        : [],
      patientIds.length
        ? Billing.aggregate([
            {
              $match: {
                doctorId: toObjectId(req.user._id),
                patientId: { $in: patientIds.map(toObjectId) },
                paymentStatus: { $in: ['pending', 'partial'] }
              }
            },
            { $group: { _id: '$patientId', due: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } }
          ])
        : []
    ]);

    const noShowMap = new Map(noShowAgg.map((r) => [String(r._id), r.count]));
    const balanceMap = new Map(balanceAgg.map((r) => [String(r._id), r.due]));

    const inputs = appointments.map((a) => {
      const p = a.patientId || {};
      const pid = p._id ? String(p._id) : null;
      const totalVisits = Number(p.totalVisits) || 0;
      const leadTimeDays = a.createdAt ? Math.max(0, Math.round((a.date - a.createdAt) / DAY_MS)) : 0;
      return {
        id: String(a._id),
        patientName: p.name || 'Unknown',
        slot: a.timeSlot,
        fee: Number(a.consultationFee) || Number(req.user.consultationFee) || 0,
        confirmed: a.status === 'confirmed',
        isNewPatient: totalVisits === 0,
        totalPriorVisits: totalVisits,
        priorNoShows: pid ? noShowMap.get(pid) || 0 : 0,
        hasOutstandingBalance: pid ? (balanceMap.get(pid) || 0) > 0 : false,
        leadTimeDays,
        age: Number(p.age) || undefined
      };
    });

    res.json(noShow.analyzeDay(inputs, opts));
  })
);

function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

module.exports = router;
