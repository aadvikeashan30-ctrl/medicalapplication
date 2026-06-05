/**
 * Multilingual / i18n routes — /api/i18n
 *
 * Powers patient-facing prescriptions in 8 Indian languages. The doctor keeps
 * working in English; patients receive a localized, render-ready prescription.
 */
const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const i18n = require('../services/i18nService');

const router = express.Router();

/** Public: list supported languages (used by web/mobile language pickers). */
router.get('/languages', (req, res) => {
  res.json({ languages: i18n.listLanguages(), default: i18n.DEFAULT_LANGUAGE });
});

/**
 * Localize an arbitrary prescription payload into a target language.
 * POST /api/i18n/localize { prescription, language }
 */
router.post(
  '/localize',
  auth,
  asyncHandler(async (req, res) => {
    const { prescription, language } = req.body;
    if (!prescription) return res.status(400).json({ message: 'prescription is required' });
    res.json(i18n.localizePrescription(prescription, language));
  })
);

/**
 * Fetch an existing prescription and return it localized.
 * GET /api/i18n/prescription/:id?lang=hi
 */
router.get(
  '/prescription/:id',
  auth,
  asyncHandler(async (req, res) => {
    const Prescription = require('../models/Prescription');
    const lang = req.query.lang || i18n.DEFAULT_LANGUAGE;
    const rx = await Prescription.findOne({ _id: req.params.id, doctorId: req.user._id })
      .populate('patientId', 'name patientId preferredLanguage');
    if (!rx) return res.status(404).json({ message: 'Prescription not found' });

    const targetLang = lang || rx.patientId?.preferredLanguage || i18n.DEFAULT_LANGUAGE;
    const localized = i18n.localizePrescription(
      { diagnosis: rx.diagnosis, advice: rx.advice, medicines: rx.medicines },
      targetLang
    );
    res.json({
      prescriptionNo: rx.prescriptionNo,
      patient: rx.patientId ? { name: rx.patientId.name, patientId: rx.patientId.patientId } : null,
      ...localized
    });
  })
);

module.exports = router;
