const mongoose = require('mongoose');
const { nextSeq } = require('./Counter');

/**
 * LabOrder — order one or more lab tests for a patient, track the sample-to-
 * result workflow, and (optionally) link to an external lab/partner.
 * Results feed into the patient's HealthTimeline.
 */
const labOrderSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    orderNo: { type: String, unique: true, index: true }, // LAB-00001

    labName: { type: String, default: 'In-house' },
    labPartnerCode: { type: String }, // for external integrations

    tests: [
      {
        name: { type: String, required: true },
        code: String,
        category: String,
        price: { type: Number, default: 0 },
        result: {
          value: String,
          unit: String,
          referenceRange: String,
          flag: { type: String, enum: ['normal', 'high', 'low', 'critical', ''], default: '' }
        }
      }
    ],

    priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
    status: {
      type: String,
      enum: ['ordered', 'sample-collected', 'in-lab', 'reported', 'cancelled'],
      default: 'ordered',
      index: true
    },
    reportUrl: { type: String },
    reportSummary: { type: String },
    aiInterpretation: { type: Object }, // optional analyzeLabReport() output
    totalAmount: { type: Number, default: 0 },
    collectedAt: { type: Date },
    reportedAt: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

labOrderSchema.pre('save', async function (next) {
  try {
    if (!this.totalAmount) {
      this.totalAmount = (this.tests || []).reduce((s, t) => s + (Number(t.price) || 0), 0);
    }
    if (!this.orderNo) {
      const seq = await nextSeq(`laborder:${this.doctorId}`);
      this.orderNo = `LAB-${String(seq).padStart(5, '0')}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('LabOrder', labOrderSchema);
