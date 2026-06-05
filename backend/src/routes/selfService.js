/**
 * Patient self-service routes — /api/self-service  (PUBLIC, no auth)
 *
 * Complements the existing patient portal (booking, records, payments) with
 * the live queue experience: a patient can track their token position in
 * real time, and a clinic waiting-room screen can show the live token board.
 * Real-time pushes are handled by socketService; these endpoints provide the
 * REST snapshot used on first load and as a polling fallback.
 */
const express = require('express');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const AVG_MINUTES_PER_PATIENT = 15;
const ACTIVE_STATUSES = ['scheduled', 'confirmed', 'in-progress'];

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Live position for one appointment (the appointmentId acts as the token key).
 * GET /api/self-service/queue-position/:appointmentId
 */
router.get(
  '/queue-position/:appointmentId',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointment id' });
    }
    const Appointment = require('../models/Appointment');
    const appt = await Appointment.findById(req.params.appointmentId);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const { start, end } = todayRange();
    const queue = await Appointment.find({
      doctorId: appt.doctorId,
      date: { $gte: start, $lt: end },
      status: { $nin: ['cancelled', 'no-show'] }
    }).sort({ tokenNumber: 1 });

    const completed = queue.filter((a) => a.status === 'completed').length;
    const inProgress = queue.find((a) => a.status === 'in-progress');
    const myIndex = queue.findIndex((a) => a._id.toString() === appt._id.toString());
    const myPosition = myIndex + 1;
    const patientsAhead = Math.max(0, myPosition - completed - (inProgress ? 1 : 0) - 1);

    res.json({
      appointmentId: appt._id,
      myToken: appt.tokenNumber,
      status: appt.status,
      totalToday: queue.length,
      completed,
      currentToken: inProgress?.tokenNumber || null,
      patientsAhead,
      estimatedWaitMinutes: patientsAhead * AVG_MINUTES_PER_PATIENT,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Live token board for a clinic waiting-room display.
 * GET /api/self-service/queue-board/:doctorId
 */
router.get(
  '/queue-board/:doctorId',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.doctorId)) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }
    const Appointment = require('../models/Appointment');
    const { start, end } = todayRange();
    const queue = await Appointment.find({
      doctorId: req.params.doctorId,
      date: { $gte: start, $lt: end },
      status: { $nin: ['cancelled', 'no-show'] }
    })
      .populate('patientId', 'name')
      .sort({ tokenNumber: 1 });

    const inProgress = queue.find((a) => a.status === 'in-progress');
    const firstName = (n) => (n || '').split(' ')[0] || '';

    res.json({
      doctorId: req.params.doctorId,
      nowServing: inProgress
        ? { token: inProgress.tokenNumber, name: firstName(inProgress.patientId?.name) }
        : null,
      waiting: queue
        .filter((a) => ACTIVE_STATUSES.includes(a.status) && a.status !== 'in-progress')
        .map((a) => ({ token: a.tokenNumber, name: firstName(a.patientId?.name) })),
      completed: queue.filter((a) => a.status === 'completed').length,
      totalToday: queue.length,
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router;
