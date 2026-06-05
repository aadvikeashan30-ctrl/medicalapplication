const express = require('express');
const { body, validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// List patients (search + pagination)
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { doctorId: req.user._id, isActive: true };

    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { phone: { $regex: safe } },
        { patientId: { $regex: safe, $options: 'i' } }
      ];
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10)),
      Patient.countDocuments(query)
    ]);

    res.json({ patients, total, pages: Math.ceil(total / limit), page: parseInt(page, 10) });
  })
);

// Get single
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  })
);

// Create
router.post(
  '/',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    }
    const patient = await Patient.create({ ...req.body, doctorId: req.user._id });
    res.status(201).json(patient);
  })
);

// Update
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    delete updates.doctorId;
    delete updates.patientId;
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  })
);

// Soft delete
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  })
);

// ==================== PROBLEM LIST (chronic conditions) ====================

// List a patient's problems
router.get(
  '/:id/problems',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id }).select('problems');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient.problems || []);
  })
);

// Add a problem
router.post(
  '/:id/problems',
  auth,
  [body('name').trim().notEmpty().withMessage('Problem name is required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    }
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const { name, icd10, status, onsetDate, notes } = req.body;
    patient.problems.push({ name, icd10, status, onsetDate, notes });
    await patient.save();
    res.status(201).json(patient.problems);
  })
);

// Update a problem
router.put(
  '/:id/problems/:problemId',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const problem = patient.problems.id(req.params.problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    ['name', 'icd10', 'status', 'onsetDate', 'notes'].forEach((key) => {
      if (req.body[key] !== undefined) problem[key] = req.body[key];
    });
    await patient.save();
    res.json(patient.problems);
  })
);

// Delete a problem
router.delete(
  '/:id/problems/:problemId',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const problem = patient.problems.id(req.params.problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    patient.problems.pull(req.params.problemId);
    await patient.save();
    res.json(patient.problems);
  })
);

// ==================== DOCUMENTS ====================

// List a patient's documents
router.get(
  '/:id/documents',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id }).select('documents');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient.documents || []);
  })
);

// Attach a document (file already uploaded via /api/uploads → pass the returned url)
router.post(
  '/:id/documents',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Document name is required'),
    body('url').trim().notEmpty().withMessage('File url is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    }
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const { name, url, fileType, category } = req.body;
    patient.documents.push({ name, url, fileType, category });
    await patient.save();
    res.status(201).json(patient.documents);
  })
);

// Delete a document
router.delete(
  '/:id/documents/:docId',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const doc = patient.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    patient.documents.pull(req.params.docId);
    await patient.save();
    res.json(patient.documents);
  })
);

module.exports = router;
