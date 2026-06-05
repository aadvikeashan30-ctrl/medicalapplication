/**
 * Pharmacy / Inventory routes — /api/pharmacy
 *
 * Stock master with batch + expiry tracking, low-stock and expiry alerts,
 * FEFO (First-Expiry-First-Out) dispensing with stock deduction, GST-aware
 * billing helper, and stock valuation. Pure calculations live in
 * inventoryService (unit-tested).
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const InventoryItem = require('../models/InventoryItem');
const auth = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { asyncHandler } = require('../middleware/errorHandler');
const inv = require('../services/inventoryService');

const router = express.Router();

/** List items (search by name, optional lowStock filter). */
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { search, lowStock, category, page = 1, limit = 50 } = req.query;
    const query = { doctorId: req.user._id, isActive: true };
    if (category) query.category = category;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];

    let items = await InventoryItem.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(parseInt(limit, 10));
    if (lowStock === 'true') {
      items = items.filter((it) => inv.stockStatus(it.totalQuantity, it.reorderLevel) !== 'in');
    }
    const withStatus = items.map((it) => ({
      ...it.toObject(),
      stockStatus: inv.stockStatus(it.totalQuantity, it.reorderLevel)
    }));
    res.json({ items: withStatus, total: withStatus.length });
  })
);

/** Aggregate alerts: low stock, expiring soon, expired. */
router.get(
  '/alerts',
  auth,
  asyncHandler(async (req, res) => {
    const items = await InventoryItem.find({ doctorId: req.user._id, isActive: true });
    res.json(inv.buildAlerts(items.map((i) => i.toObject())));
  })
);

/** Total stock valuation at cost price. */
router.get(
  '/valuation',
  auth,
  asyncHandler(async (req, res) => {
    const items = await InventoryItem.find({ doctorId: req.user._id, isActive: true });
    res.json({ valuation: inv.stockValuation(items.map((i) => i.toObject())), itemCount: items.length });
  })
);

router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ ...item.toObject(), stockStatus: inv.stockStatus(item.totalQuantity, item.reorderLevel) });
  })
);

/** Create an inventory item. */
router.post(
  '/',
  auth,
  audit.create('inventory-item'),
  [body('name').trim().notEmpty().withMessage('Name is required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map((e) => e.msg).join(', ') });
    const item = await InventoryItem.create({ ...req.body, doctorId: req.user._id });
    res.status(201).json(item);
  })
);

/** Update item master fields. */
router.put(
  '/:id',
  auth,
  audit.update('inventory-item'),
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    delete updates.doctorId;
    const item = await InventoryItem.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    Object.assign(item, updates);
    await item.save(); // recomputes totalQuantity
    res.json(item);
  })
);

/** Stock-in: add a batch. POST /:id/batches { batchNo, quantity, expiryDate, costPrice, mrp } */
router.post(
  '/:id/batches',
  auth,
  audit.update('inventory-item'),
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const { batchNo, quantity, expiryDate, costPrice, mrp } = req.body;
    if (!quantity || Number(quantity) <= 0) return res.status(400).json({ message: 'A positive quantity is required' });
    item.batches.push({ batchNo, quantity: Number(quantity), expiryDate, costPrice, mrp });
    await item.save();
    res.status(201).json(item);
  })
);

/**
 * Dispense stock using FEFO. POST /:id/dispense { quantity }
 * Deducts from the batches nearest to expiry; reports any shortfall.
 */
router.post(
  '/:id/dispense',
  auth,
  audit.update('inventory-dispense'),
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const qty = Number(req.body.quantity) || 0;
    if (qty <= 0) return res.status(400).json({ message: 'A positive quantity is required' });

    const plan = inv.dispenseFEFO(item.batches.map((b) => b.toObject ? b.toObject() : b), qty);
    if (plan.shortfall > 0) {
      return res.status(409).json({
        message: `Insufficient stock. Available ${plan.dispensed}, requested ${qty}.`,
        ...plan
      });
    }

    // Apply allocations to the real batch documents (match by batchNo + expiry).
    for (const alloc of plan.allocations) {
      const batch = item.batches.find(
        (b) => (b.batchNo || null) === (alloc.batchNo || null) &&
          String(b.expiryDate || '') === String(alloc.expiryDate || '')
      );
      if (batch) batch.quantity = Math.max(0, (Number(batch.quantity) || 0) - alloc.used);
    }
    // Drop emptied batches.
    item.batches = item.batches.filter((b) => (Number(b.quantity) || 0) > 0);
    await item.save();

    const gst = inv.gstBreakup((item.sellingPrice || 0) * qty, item.gstRate);
    res.json({
      message: 'Dispensed',
      dispensed: plan.dispensed,
      allocations: plan.allocations,
      remainingStock: item.totalQuantity,
      billing: gst
    });
  })
);

router.delete(
  '/:id',
  auth,
  audit.delete('inventory-item'),
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, doctorId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item removed' });
  })
);

module.exports = router;
