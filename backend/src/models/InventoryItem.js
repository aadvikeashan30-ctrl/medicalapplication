const mongoose = require('mongoose');
const { nextSeq } = require('./Counter');

/**
 * Batch sub-document — tracks stock by batch for expiry (FEFO) handling.
 */
const batchSchema = new mongoose.Schema(
  {
    batchNo: { type: String, trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date },
    costPrice: { type: Number, default: 0, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    receivedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

/**
 * InventoryItem — pharmacy/clinic stock master with batch tracking.
 */
const inventoryItemSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    sku: { type: String, index: true }, // INV-00001
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, trim: true },
    category: {
      type: String,
      enum: ['medicine', 'consumable', 'equipment', 'vaccine', 'other'],
      default: 'medicine'
    },
    form: { type: String }, // tablet, syrup, injection, etc.
    strength: { type: String },
    manufacturer: { type: String },
    hsnCode: { type: String }, // for GST
    gstRate: { type: Number, default: 12 }, // %
    unit: { type: String, default: 'unit' }, // strip, bottle, vial
    reorderLevel: { type: Number, default: 10, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 }, // default/last cost
    sellingPrice: { type: Number, default: 0, min: 0 },
    batches: { type: [batchSchema], default: [] },
    // Denormalized total for fast queries; kept in sync on writes.
    totalQuantity: { type: Number, default: 0, min: 0, index: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Recompute denormalized total quantity before save.
inventoryItemSchema.pre('save', async function (next) {
  try {
    this.totalQuantity = (this.batches || []).reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    if (!this.sku) {
      const seq = await nextSeq(`inventory:${this.doctorId}`);
      this.sku = `INV-${String(seq).padStart(5, '0')}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
