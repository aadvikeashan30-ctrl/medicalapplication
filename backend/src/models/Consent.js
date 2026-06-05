const mongoose = require('mongoose');

/**
 * Consent — granular, auditable patient consent records for the DPDP Act
 * (India) / HIPAA hardening layer. Each record captures what the patient
 * agreed to, when, for how long, and supports revocation.
 */
const consentSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

    purpose: {
      type: String,
      enum: ['treatment', 'data-sharing', 'abdm-linking', 'research', 'marketing', 'teleconsult', 'insurance'],
      required: true,
      index: true
    },
    scope: [{ type: String }], // e.g. ['Prescription','DiagnosticReport']
    grantedTo: { type: String }, // entity the data may be shared with
    status: { type: String, enum: ['granted', 'revoked', 'expired'], default: 'granted', index: true },

    method: { type: String, enum: ['otp', 'signature', 'verbal-recorded', 'written'], default: 'otp' },
    abdmConsentId: { type: String }, // links to an ABDM consent artefact if applicable

    grantedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
    revokedReason: { type: String },

    ip: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

consentSchema.methods.isCurrentlyValid = function () {
  if (this.status !== 'granted') return false;
  if (this.expiresAt && new Date(this.expiresAt) < new Date()) return false;
  return true;
};

module.exports = mongoose.model('Consent', consentSchema);
