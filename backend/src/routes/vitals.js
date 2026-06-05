const express = require('express');
const { body, validationResult } = require('express-validator');
const Vital = require('../models/Vital');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Ensure the patient belongs to the requesting doctor before touching vitals.
async function assertPatientOwned(patientId, doctorId) {
  const patient = await Patient.findOne({ _id: patientId, doctorId });
  return !!patient;
}

// List vitals for a patient (oldest -> newest so charts read left to right).
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { patientId, limit = 100 } = req.query;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    const vitals = await Vital.find({ patientId, doctorId: req.user._id })
      .sort({ recordedAt: 1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500));

    res.json({ vitals, latest: vitals.length ? vitals[vitals.length - 1] : null });
  })
);

// Record a new vitals entry.
router.post(
  '/',
  auth,
  [body('patientId').notEmpty().withMessage('patientId is required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    }

    const owned = await assertPatientOwned(req.body.patientId, req.user._id);
    if (!owned) return res.status(404).json({ message: 'Patient not found' });

    const vital = await Vital.create({ ...req.body, doctorId: req.user._id });
    res.status(201).json(vital);
  })
);

// Delete a vitals entry.
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const vital = await Vital.findOneAndDelete({ _id: req.params.id, doctorId: req.user._id });
    if (!vital) return res.status(404).json({ message: 'Vitals entry not found' });
    res.json({ message: 'Vitals entry deleted' });
  })
);

module.exports = router;
