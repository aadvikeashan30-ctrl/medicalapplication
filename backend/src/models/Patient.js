const mongoose = require('mongoose');
const { nextSeq } = require('./Counter');

// Chronic / ongoing conditions shown as a "problem list" on the patient dashboard.
const problemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icd10: { type: String, trim: true },
    status: { type: String, enum: ['active', 'controlled', 'resolved'], default: 'active' },
    onsetDate: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

// Documents/reports attached to a patient (file uploaded separately via /api/uploads).
const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    fileType: { type: String },
    category: {
      type: String,
      enum: ['lab-report', 'imaging', 'prescription', 'discharge-summary', 'insurance', 'other'],
      default: 'other'
    },
    uploadedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: String, unique: true, index: true }, // Auto-generated: PAT-0001
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    age: { type: Number, min: 0, max: 150 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    bloodGroup: { type: String },
    address: { type: String },
    city: { type: String },
    emergencyContact: { type: String },
    allergies: [{ type: String }],
    medicalHistory: [{ type: String }],
    // Chronic problem list (ongoing conditions) shown on the patient dashboard.
    problems: [problemSchema],
    // Patient documents / uploaded reports.
    documents: [documentSchema],
    // Patient's preferred language for prescriptions/communication (ISO code).
    preferredLanguage: { type: String, default: 'en' },
    // ABDM / ABHA digital health identity. abhaNumber is stored encrypted.
    abha: {
      abhaNumber: { type: String }, // encrypted at rest via cryptoService
      abhaAddress: { type: String },
      linked: { type: Boolean, default: false },
      linkedAt: { type: Date },
      kycVerified: { type: Boolean, default: false }
    },
    // Specialty-specific fields
    dentalChart: { type: Object },
    visionRecord: { type: Object },
    growthChart: [{ type: Object }],
    skinPhotos: [{ type: String }],
    notes: { type: String },
    lastVisit: { type: Date },
    totalVisits: { type: Number, default: 0 },
    totalBilled: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Atomic patient ID generation
patientSchema.pre('save', async function (next) {
  if (this.patientId) return next();
  try {
    const seq = await nextSeq(`patient:${this.doctorId}`);
    this.patientId = `PAT-${String(seq).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Patient', patientSchema);
