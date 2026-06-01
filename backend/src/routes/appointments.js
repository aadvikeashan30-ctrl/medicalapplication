const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// List with filters
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { date, status, page = 1, limit = 50 } = req.query;
    const query = { doctorId: req.user._id };

    if (date) {
      const start = new Date(date);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid date' });
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }
    if (status) query.status = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'name phone patientId age gender')
        .sort({ date: 1, tokenNumber: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10)),
      Appointment.countDocuments(query)
    ]);

    res.json({ appointments, total, pages: Math.ceil(total / limit), page: parseInt(page, 10) });
  })
);

// Today's queue (active statuses only)
router.get(
  '/queue/today',
  auth,
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctorId: req.user._id,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    })
      .populate('patientId', 'name phone patientId age gender')
      .sort({ tokenNumber: 1 });

    res.json(appointments);
  })
);

// Create with slot-conflict check
router.post(
  '/',
  auth,
  [
    body('patientId').notEmpty().withMessage('patientId is required'),
    body('date').notEmpty().withMessage('date is required'),
    body('timeSlot').notEmpty().withMessage('timeSlot is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    }

    const apptDate = new Date(req.body.date);
    if (Number.isNaN(apptDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

    const dayStart = new Date(apptDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Conflict: same doctor, same date+timeSlot, not cancelled
    const conflict = await Appointment.findOne({
      doctorId: req.user._id,
      date: { $gte: dayStart, $lt: dayEnd },
      timeSlot: req.body.timeSlot,
      status: { $ne: 'cancelled' }
    });
    if (conflict) {
      return res.status(409).json({ message: 'Time slot already booked' });
    }

    const appointment = await Appointment.create({ ...req.body, doctorId: req.user._id });

    await Patient.findByIdAndUpdate(req.body.patientId, {
      lastVisit: new Date(),
      $inc: { totalVisits: 1 }
    });

    const populated = await appointment.populate('patientId', 'name phone patientId age gender');
    res.status(201).json(populated);
  })
);

// Update
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId', 'name phone patientId age gender');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  })
);

// Delete (hard delete OK; status:cancelled is also supported via PUT)
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const result = await Appointment.findOneAndDelete({ _id: req.params.id, doctorId: req.user._id });
    if (!result) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment cancelled' });
  })
);

module.exports = router;
