const mongoose = require('mongoose');

/**
 * Vital — a single point-in-time vitals measurement for a patient.
 *
 * Unlike HealthRecord (which embeds a vitals snapshot inside a broader record),
 * this is a dedicated time-series collection optimised for plotting trends
 * (BP, weight, blood sugar, SpO2, etc.) on the patient dashboard.
 */
const vitalSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    recordedAt: { type: Date, default: Date.now, index: true },

    // Blood pressure stored as separate numeric fields so each line can be charted.
    systolic: { type: Number, min: 0, max: 400 },
    diastolic: { type: Number, min: 0, max: 300 },

    pulse: { type: Number, min: 0, max: 400 }, // bpm
    temperature: { type: Number, min: 80, max: 115 }, // °F
    weight: { type: Number, min: 0, max: 700 }, // kg
    height: { type: Number, min: 0, max: 300 }, // cm
    bmi: { type: Number, min: 0, max: 200 }, // auto-computed when weight + height present
    spo2: { type: Number, min: 0, max: 100 }, // %
    bloodSugar: { type: Number, min: 0, max: 1500 }, // mg/dL
    respiratoryRate: { type: Number, min: 0, max: 120 }, // breaths/min

    // Optional context for the reading.
    bloodSugarType: { type: String, enum: ['fasting', 'post-prandial', 'random', ''], default: '' },
    notes: { type: String, trim: true },
    source: { type: String, enum: ['clinic', 'patient', 'device'], default: 'clinic' }
  },
  { timestamps: true }
);

vitalSchema.index({ patientId: 1, recordedAt: -1 });

// Auto-compute BMI from weight (kg) and height (cm) when both are present.
vitalSchema.pre('save', function (next) {
  if (this.weight && this.height) {
    const heightM = this.height / 100;
    if (heightM > 0) {
      this.bmi = Math.round((this.weight / (heightM * heightM)) * 10) / 10;
    }
  }
  next();
});

module.exports = mongoose.model('Vital', vitalSchema);
