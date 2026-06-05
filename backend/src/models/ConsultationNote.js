const mongoose = require('mongoose');
const { nextSeq } = require('./Counter');

/**
 * ConsultationNote — output of the Ambient AI Scribe.
 * Stores the raw transcript plus the AI/rule-based structured SOAP note and a
 * draft prescription that the doctor reviews and approves.
 */
const consultationNoteSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    noteNo: { type: String, unique: true, index: true }, // NOTE-00001

    transcript: { type: String, default: '' },
    language: { type: String, default: 'en' },

    soap: {
      subjective: { type: String, default: '' },
      objective: { type: String, default: '' },
      assessment: { type: String, default: '' },
      plan: { type: String, default: '' }
    },
    vitals: {
      bp: String,
      pulse: Number,
      temperature: Number,
      spo2: Number,
      weight: Number
    },
    diagnosis: { type: String, default: '' },
    draftMedicines: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        timing: String,
        notes: String
      }
    ],
    advice: { type: String, default: '' },
    followUpDays: { type: Number, default: null },

    source: { type: String, enum: ['ai', 'rule-based', 'manual'], default: 'rule-based' },
    aiProvider: { type: String, default: 'demo' },
    status: { type: String, enum: ['draft', 'reviewed', 'approved', 'discarded'], default: 'draft', index: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }, // set once converted
    durationSeconds: { type: Number, default: 0 } // time-to-document metric
  },
  { timestamps: true }
);

consultationNoteSchema.pre('save', async function (next) {
  if (this.noteNo) return next();
  try {
    const seq = await nextSeq(`note:${this.doctorId}`);
    this.noteNo = `NOTE-${String(seq).padStart(5, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('ConsultationNote', consultationNoteSchema);
