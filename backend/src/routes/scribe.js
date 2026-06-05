/**
 * Ambient AI Scribe routes — /api/scribe
 *
 * Turns a consultation transcript (captured client-side via the Web Speech API
 * or uploaded) into a structured SOAP note + draft prescription that the doctor
 * reviews and approves. Uses aiService when an AI key is configured, and falls
 * back to the deterministic rule-based scribeFormatter otherwise.
 */
const express = require('express');
const ConsultationNote = require('../models/ConsultationNote');
const Prescription = require('../models/Prescription');
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planLimits');
const { audit } = require('../middleware/audit');
const { asyncHandler } = require('../middleware/errorHandler');
const scribeFormatter = require('../services/scribeFormatter');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

const router = express.Router();

const ALLOWED_TIMINGS = ['before-food', 'after-food', 'empty-stomach', 'bedtime'];

function sanitizeMedicines(medicines = []) {
  return (medicines || [])
    .filter((m) => m && (m.name || '').trim())
    .map((m) => ({
      name: String(m.name).trim(),
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      timing: ALLOWED_TIMINGS.includes(m.timing) ? m.timing : undefined,
      notes: m.notes || ''
    }));
}

/**
 * Generate a structured draft note from a transcript.
 * POST /api/scribe/generate { transcript, patientId?, appointmentId?, language?, durationSeconds? }
 */
router.post(
  '/generate',
  auth,
  requireFeature('ai'),
  asyncHandler(async (req, res) => {
    const { transcript, patientId, appointmentId, language = 'en', durationSeconds = 0 } = req.body;
    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({ message: 'Transcript is required' });
    }

    let structured;
    let source = 'rule-based';
    let aiProvider = 'demo';

    // Prefer AI extraction when available; always fall back to the rule-based parser.
    try {
      if (aiService.getProvider() !== 'demo') {
        const aiOut = await aiService.voiceToPrescription(transcript);
        const base = scribeFormatter.parseTranscript(transcript);
        structured = {
          soap: aiOut.soap || base.soap,
          vitals: aiOut.vitals || base.vitals,
          diagnosis: aiOut.diagnosis || base.diagnosis,
          medicines: (aiOut.medicines && aiOut.medicines.length ? aiOut.medicines : base.medicines),
          advice: aiOut.advice || base.advice,
          followUpDays: aiOut.followUpDays ?? base.followUpDays
        };
        source = 'ai';
        aiProvider = aiService.getProvider();
      } else {
        structured = scribeFormatter.parseTranscript(transcript);
      }
    } catch (err) {
      logger.warn(`Scribe AI extraction failed, using rule-based fallback: ${err.message}`);
      structured = scribeFormatter.parseTranscript(transcript);
    }

    const note = await ConsultationNote.create({
      doctorId: req.user._id,
      patientId: patientId || undefined,
      appointmentId: appointmentId || undefined,
      transcript,
      language,
      soap: structured.soap || {},
      vitals: structured.vitals || {},
      diagnosis: structured.diagnosis || '',
      draftMedicines: sanitizeMedicines(structured.medicines),
      advice: structured.advice || '',
      followUpDays: structured.followUpDays ?? null,
      source,
      aiProvider,
      durationSeconds: Number(durationSeconds) || 0,
      status: 'draft'
    });

    res.status(201).json(note);
  })
);

/** List notes (optionally by patient/status). */
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { patientId, status, page = 1, limit = 20 } = req.query;
    const query = { doctorId: req.user._id };
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;

    const [notes, total] = await Promise.all([
      ConsultationNote.find(query)
        .populate('patientId', 'name patientId phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10)),
      ConsultationNote.countDocuments(query)
    ]);
    res.json({ notes, total, pages: Math.ceil(total / limit), page: parseInt(page, 10) });
  })
);

router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const note = await ConsultationNote.findOne({ _id: req.params.id, doctorId: req.user._id })
      .populate('patientId', 'name patientId phone age gender allergies');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  })
);

/** Edit a draft note (doctor review). */
router.put(
  '/:id',
  auth,
  audit.update('consultation-note'),
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    if (updates.draftMedicines) updates.draftMedicines = sanitizeMedicines(updates.draftMedicines);
    delete updates.doctorId;
    delete updates.noteNo;

    if (updates.status === 'reviewed' || updates.soap || updates.draftMedicines) {
      updates.status = updates.status || 'reviewed';
    }

    const note = await ConsultationNote.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  })
);

/** Approve a note and convert it into a real prescription. */
router.post(
  '/:id/approve',
  auth,
  audit.create('prescription'),
  asyncHandler(async (req, res) => {
    const note = await ConsultationNote.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.prescriptionId) {
      return res.status(409).json({ message: 'Note already converted to a prescription', prescriptionId: note.prescriptionId });
    }
    if (!note.patientId) {
      return res.status(400).json({ message: 'A patient must be linked before approving' });
    }

    const followUpDate = note.followUpDays
      ? new Date(Date.now() + note.followUpDays * 24 * 60 * 60 * 1000)
      : undefined;

    const prescription = await Prescription.create({
      doctorId: req.user._id,
      patientId: note.patientId,
      appointmentId: note.appointmentId,
      diagnosis: note.diagnosis,
      medicines: sanitizeMedicines(note.draftMedicines),
      advice: note.advice,
      followUpDate,
      vitals: note.vitals
    });

    note.status = 'approved';
    note.prescriptionId = prescription._id;
    await note.save();

    res.status(201).json({ message: 'Approved and prescription created', prescription, noteId: note._id });
  })
);

router.delete(
  '/:id',
  auth,
  audit.delete('consultation-note'),
  asyncHandler(async (req, res) => {
    const note = await ConsultationNote.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      { status: 'discarded' },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note discarded' });
  })
);

module.exports = router;
