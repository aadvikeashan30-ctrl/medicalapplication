/**
 * 30-second Prescription tools — /api/rx-tools
 *
 * Speed layer on top of prescriptions:
 *  - favourite medicines (with default dose/frequency) for one-tap add
 *  - diagnosis -> medicine-set "protocols" (quick templates)
 *  - autocomplete that ranks by how often the doctor uses each item
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const RxFavorite = require('../models/RxFavorite');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/** List favourites/protocols, most-used first. GET /api/rx-tools?type=medicine|protocol */
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const query = { doctorId: req.user._id, isActive: true };
    if (req.query.type) query.type = req.query.type;
    const favorites = await RxFavorite.find(query).sort({ usageCount: -1, updatedAt: -1 }).limit(200);
    res.json(favorites);
  })
);

/**
 * Autocomplete for the prescribing screen.
 * GET /api/rx-tools/autocomplete?q=par&type=medicine
 */
router.get(
  '/autocomplete',
  auth,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'medicine';
    const query = { doctorId: req.user._id, isActive: true, type };
    if (q) {
      query.$or = [
        { 'medicines.name': { $regex: q, $options: 'i' } },
        { label: { $regex: q, $options: 'i' } },
        { diagnosis: { $regex: q, $options: 'i' } },
        { shortcut: { $regex: `^${q}`, $options: 'i' } }
      ];
    }
    const results = await RxFavorite.find(query).sort({ usageCount: -1 }).limit(10);
    res.json(results);
  })
);

/** Create a favourite or protocol. */
router.post(
  '/',
  auth,
  [
    body('type').isIn(['medicine', 'protocol']).withMessage('type must be medicine or protocol'),
    body('medicines').isArray({ min: 1 }).withMessage('At least one medicine is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    }
    const fav = await RxFavorite.create({ ...req.body, doctorId: req.user._id });
    res.status(201).json(fav);
  })
);

/** Apply a favourite/protocol — increments usage so ranking improves over time. */
router.post(
  '/:id/apply',
  auth,
  asyncHandler(async (req, res) => {
    const fav = await RxFavorite.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      { $inc: { usageCount: 1 } },
      { new: true }
    );
    if (!fav) return res.status(404).json({ message: 'Favorite not found' });
    res.json({
      diagnosis: fav.diagnosis || '',
      advice: fav.advice || '',
      followUpDays: fav.followUpDays || null,
      tests: fav.tests || [],
      medicines: fav.medicines || []
    });
  })
);

router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    delete updates.doctorId;
    const fav = await RxFavorite.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!fav) return res.status(404).json({ message: 'Favorite not found' });
    res.json(fav);
  })
);

router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const fav = await RxFavorite.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!fav) return res.status(404).json({ message: 'Favorite not found' });
    res.json({ message: 'Favorite deleted' });
  })
);

module.exports = router;
