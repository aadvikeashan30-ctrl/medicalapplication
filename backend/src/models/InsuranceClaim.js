const mongoose = require('mongoose');
const { nextSeq } = require('./Counter');

/**
 * InsuranceClaim — TPA / cashless / reimbursement claim against a patient bill.
 */
const insuranceClaimSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
    claimNumber: { type: String, unique: true, index: true }, // CLM-<INSURER>-000001

    insurerName: { type: String, required: true, trim: true },
    insurerCode: { type: String, trim: true },
    tpaName: { type: String, trim: true },
    policyNumber: { type: String, trim: true },
    // Sensitive identifiers are stored encrypted by the route layer (cryptoService).
    memberId: { type: String, trim: true },

    claimType: { type: String, enum: ['cashless', 'reimbursement'], default: 'cashless' },

    billAmount: { type: Number, default: 0, min: 0 },
    nonPayable: { type: Number, default: 0, min: 0 },
    deductible: { type: Number, default: 0, min: 0 },
    copayPercent: { type: Number, default: 0, min: 0, max: 100 },
    sumInsured: { type: Number, default: null },
    alreadyClaimed: { type: Number, default: 0, min: 0 },

    claimableAmount: { type: Number, default: 0, min: 0 },
    approvedAmount: { type: Number, default: 0, min: 0 },
    patientPayable: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under-review', 'query-raised', 'approved', 'partially-approved', 'rejected', 'settled', 'cancelled'],
      default: 'draft',
      index: true
    },
    statusHistory: [
      {
        from: String,
        to: String,
        note: String,
        at: { type: Date, default: Date.now }
      }
    ],
    documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    remarks: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

insuranceClaimSchema.pre('save', async function (next) {
  if (this.claimNumber) return next();
  try {
    const seq = await nextSeq(`claim:${this.doctorId}`);
    const code = (this.insurerCode || this.insurerName || 'GEN')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) || 'GEN';
    this.claimNumber = `CLM-${code}-${String(seq).padStart(6, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
