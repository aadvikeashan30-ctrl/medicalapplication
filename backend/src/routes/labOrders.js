/**
 * Lab Orders routes — /api/lab-orders
 *
 * Order one or more lab tests, track the sample-to-report workflow, attach
 * results, and push the reported result into the patient's HealthTimeline.
 * Optionally runs aiService.analyzeLabReport for an AI interpretation.
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const LabOrder = require('../models/LabOrder');
const HealthTimeline = require('../models/HealthTimeline');
const auth = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

const router = express.Router();

const STATUSES = ['ordered', 'sample-collected', 'in-lab', 'reported', 'cancelled'];

router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { patientId, status, page = 1, limit = 20 } = req.query;
    const query = { doctorId: req.user._id, isActive: true };
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      LabOrder.find(query)
        .populate('patientId', 'name patientId phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10)),
      LabOrder.countDocuments(query)
    ]);
    res.json({ orders, total, pages: Math.ceil(total / limit), page: parseInt(page, 10) });
  })
);

router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const order = await LabOrder.findOne({ _id: req.params.id, doctorId: req.user._id })
      .populate('patientId', 'name patientId phone age gender');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  })
);

/** Create a lab order. */
router.post(
  '/',
  auth,
  audit.create('lab-order'),
  [
    body('patientId').notEmpty().withMessage('patientId is required'),
    body('tests').isArray({ min: 1 }).withMessage('At least one test is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    const order = await LabOrder.create({ ...req.body, doctorId: req.user._id });
    res.status(201).json(order);
  })
);

/** Update status / details (e.g. mark sample-collected). */
router.put(
  '/:id',
  auth,
  audit.update('lab-order'),
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    delete updates.doctorId;
    if (updates.status && !STATUSES.includes(updates.status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${STATUSES.join(', ')}` });
    }
    if (updates.status === 'sample-collected' && !updates.collectedAt) updates.collectedAt = new Date();
    const order = await LabOrder.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  })
);

/**
 * Attach results and mark reported. Pushes a HealthTimeline entry and runs an
 * optional AI interpretation.
 * POST /:id/result { tests:[{name,result:{value,unit,referenceRange,flag}}], reportUrl?, reportSummary? }
 */
router.post(
  '/:id/result',
  auth,
  audit.update('lab-order'),
  asyncHandler(async (req, res) => {
    const order = await LabOrder.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { tests, reportUrl, reportSummary } = req.body;
    if (Array.isArray(tests)) {
      // Merge results into existing tests by name.
      for (const incoming of tests) {
        const t = order.tests.find((x) => x.name === incoming.name);
        if (t && incoming.result) t.result = { ...t.result?.toObject?.(), ...incoming.result };
      }
    }
    if (reportUrl) order.reportUrl = reportUrl;
    if (reportSummary) order.reportSummary = reportSummary;
    order.status = 'reported';
    order.reportedAt = new Date();

    // Optional AI interpretation (safe fallback inside aiService).
    try {
      const ai = await aiService.analyzeLabReport(
        order.tests.map((t) => ({ parameter: t.name, value: t.result?.value, unit: t.result?.unit, range: t.result?.referenceRange })),
        'general'
      );
      order.aiInterpretation = ai;
      if (!order.reportSummary && ai.summary) order.reportSummary = ai.summary;
    } catch (err) {
      logger.warn(`Lab AI interpretation skipped: ${err.message}`);
    }

    await order.save();

    // Push into the patient's health timeline.
    try {
      const abnormal = order.tests.filter((t) => t.result && ['high', 'low', 'critical'].includes(t.result.flag));
      await HealthTimeline.create({
        patientId: order.patientId,
        doctorId: req.user._id,
        eventDate: order.reportedAt,
        eventType: 'lab-test',
        title: `Lab report: ${order.tests.map((t) => t.name).slice(0, 3).join(', ')}${order.tests.length > 3 ? '…' : ''}`,
        description: order.reportSummary || '',
        referenceModel: 'LabOrder',
        referenceId: order._id,
        data: { orderNo: order.orderNo, abnormalCount: abnormal.length },
        importance: abnormal.some((t) => t.result.flag === 'critical') ? 'critical' : abnormal.length ? 'important' : 'routine'
      });
    } catch (err) {
      logger.warn(`Timeline push skipped: ${err.message}`);
    }

    res.json({ message: 'Result recorded and added to timeline', order });
  })
);

router.delete(
  '/:id',
  auth,
  audit.delete('lab-order'),
  asyncHandler(async (req, res) => {
    const order = await LabOrder.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      { status: 'cancelled', isActive: false },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order cancelled' });
  })
);

module.exports = router;
