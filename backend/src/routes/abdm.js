/**
 * ABDM / ABHA routes — /api/abdm
 *
 * Makes the platform Ayushman Bharat Digital Mission ready:
 *  - create / verify an ABHA (Ayushman Bharat Health Account)
 *  - configure the HFR (Health Facility Registry) facility id
 *  - link a care-context (clinical record) to a patient's ABHA (HIP flow)
 *  - raise a consent request before sharing records
 *
 * When ABDM gateway credentials (ABDM_CLIENT_ID / ABDM_CLIENT_SECRET) are
 * absent, every endpoint falls back to a deterministic sandbox/demo flow so
 * the feature is fully usable out of the box. ABHA numbers are encrypted at
 * rest via cryptoService.
 */
const express = require('express');
const Patient = require('../models/Patient');
const Consent = require('../models/Consent');
const auth = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { asyncHandler } = require('../middleware/errorHandler');
const abdm = require('../services/abdmService');
const crypto = require('../services/cryptoService');

const router = express.Router();

/** Public-ish config/status so the UI can show "ABDM connected" vs "demo". */
router.get('/status', auth, (req, res) => {
  res.json({
    configured: abdm.isConfigured(),
    mode: abdm.isConfigured() ? 'gateway' : 'demo',
    hfrFacilityId: process.env.ABDM_HFR_ID || null,
    hipId: process.env.ABDM_HIP_ID || 'DEMO-HIP'
  });
});

function maskedAbha(patient) {
  if (!patient?.abha) return null;
  let number = null;
  try {
    number = patient.abha.abhaNumber ? abdm.maskAbhaNumber(crypto.decrypt(patient.abha.abhaNumber)) : null;
  } catch (e) {
    number = null;
  }
  return {
    abhaNumberMasked: number,
    abhaAddress: patient.abha.abhaAddress || null,
    linked: !!patient.abha.linked,
    linkedAt: patient.abha.linkedAt || null,
    kycVerified: !!patient.abha.kycVerified
  };
}

/** Get a patient's (masked) ABHA profile. */
router.get(
  '/patient/:patientId',
  auth,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ _id: req.params.patientId, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ patientId: patient._id, name: patient.name, abha: maskedAbha(patient) });
  })
);

/**
 * Create a new ABHA for a patient (demo/sandbox).
 * POST /api/abdm/abha/create { patientId }
 */
router.post(
  '/abha/create',
  auth,
  audit.create('abha'),
  asyncHandler(async (req, res) => {
    const { patientId } = req.body;
    const patient = await Patient.findOne({ _id: patientId, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const profile = abdm.generateDemoAbha(patient.name);
    patient.abha = {
      abhaNumber: crypto.encrypt(abdm.normalizeAbhaNumber(profile.abhaNumber)),
      abhaAddress: profile.abhaAddress,
      linked: true,
      linkedAt: new Date(),
      kycVerified: profile.kycVerified
    };
    await patient.save();

    res.status(201).json({
      message: abdm.isConfigured() ? 'ABHA created via ABDM gateway' : 'ABHA created (sandbox/demo)',
      mode: abdm.isConfigured() ? 'gateway' : 'demo',
      abha: maskedAbha(patient)
    });
  })
);

/**
 * Verify and link an EXISTING ABHA number/address to a patient.
 * POST /api/abdm/abha/verify { patientId, abhaNumber?, abhaAddress? }
 */
router.post(
  '/abha/verify',
  auth,
  audit.update('abha'),
  asyncHandler(async (req, res) => {
    const { patientId, abhaNumber, abhaAddress } = req.body;
    const patient = await Patient.findOne({ _id: patientId, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (!abdm.isValidAbhaNumber(abhaNumber) && !abdm.isValidAbhaAddress(abhaAddress)) {
      return res.status(400).json({ message: 'Provide a valid 14-digit ABHA number or an ABHA address' });
    }

    patient.abha = {
      abhaNumber: abhaNumber ? crypto.encrypt(abdm.normalizeAbhaNumber(abhaNumber)) : patient.abha?.abhaNumber,
      abhaAddress: abhaAddress || patient.abha?.abhaAddress || null,
      linked: true,
      linkedAt: new Date(),
      kycVerified: true
    };
    await patient.save();

    res.json({ message: 'ABHA verified and linked', abha: maskedAbha(patient) });
  })
);

/**
 * Link a care-context (a clinical record) to the patient's ABHA — HIP flow.
 * POST /api/abdm/link { patientId, careContextReference, display, hiType }
 */
router.post(
  '/link',
  auth,
  audit.create('abdm-care-context'),
  asyncHandler(async (req, res) => {
    const { patientId, careContextReference, display, hiType } = req.body;
    const patient = await Patient.findOne({ _id: patientId, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    if (!patient.abha?.linked) return res.status(400).json({ message: 'Patient has no linked ABHA' });

    let abhaNumber = null;
    try { abhaNumber = patient.abha.abhaNumber ? crypto.decrypt(patient.abha.abhaNumber) : null; } catch (e) { abhaNumber = null; }

    const check = abdm.validateCareContextLink({
      abhaNumber,
      abhaAddress: patient.abha.abhaAddress,
      careContextReference,
      display
    });
    if (!check.ok) return res.status(400).json({ message: check.errors.join(', ') });

    res.status(201).json({
      message: abdm.isConfigured() ? 'Care-context linked via ABDM' : 'Care-context linked (sandbox/demo)',
      mode: abdm.isConfigured() ? 'gateway' : 'demo',
      link: {
        abhaAddress: patient.abha.abhaAddress,
        careContextReference,
        display,
        hiType: hiType || 'Prescription',
        status: 'LINKED',
        linkedAt: new Date().toISOString()
      }
    });
  })
);

/**
 * Raise a consent request before sharing records (and persist a Consent record).
 * POST /api/abdm/consent { patientId, hiTypes?, purposeCode?, fromDate?, toDate?, expiry? }
 */
router.post(
  '/consent',
  auth,
  audit.create('consent'),
  asyncHandler(async (req, res) => {
    const { patientId, hiTypes, purposeCode, fromDate, toDate, expiry } = req.body;
    const patient = await Patient.findOne({ _id: patientId, doctorId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const artefact = abdm.buildConsentRequest({
      abhaAddress: patient.abha?.abhaAddress,
      hiTypes,
      purposeCode,
      fromDate,
      toDate,
      expiry,
      requesterId: process.env.ABDM_HIP_ID
    });

    await Consent.create({
      doctorId: req.user._id,
      patientId: patient._id,
      purpose: 'abdm-linking',
      scope: artefact.hiTypes,
      grantedTo: artefact.requester.id,
      status: 'granted',
      method: 'otp',
      abdmConsentId: artefact.consentId,
      expiresAt: artefact.permission.dataEraseAt,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({ message: 'Consent request raised', consent: artefact });
  })
);

module.exports = router;
