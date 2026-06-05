const mongoose = require('mongoose');

/**
 * RxFavorite — powers the "30-second prescription" UX.
 *
 * Two kinds:
 *  - type 'medicine'  : a single favourite drug the doctor reaches for often
 *                       (with default dose/frequency/duration), surfaced in
 *                       autocomplete and one-tap add.
 *  - type 'protocol'  : a diagnosis -> medicine-set quick template
 *                       (e.g. "Viral fever" expands to 3 medicines + advice).
 *
 * usageCount drives ranking so the most-used items float to the top.
 */
const rxFavoriteSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['medicine', 'protocol'], required: true, index: true },

    // For type 'protocol'
    label: { type: String, trim: true }, // diagnosis / protocol name
    diagnosis: { type: String, trim: true },
    advice: { type: String },
    followUpDays: { type: Number },
    tests: [{ type: String }],

    // For type 'medicine' (single) OR the medicine-set of a protocol.
    medicines: [
      {
        name: { type: String, required: true },
        dosage: String,
        frequency: String,
        duration: String,
        timing: String,
        notes: String
      }
    ],

    shortcut: { type: String, trim: true }, // optional keyboard shortcut e.g. "vf"
    usageCount: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

rxFavoriteSchema.index({ doctorId: 1, type: 1, usageCount: -1 });

module.exports = mongoose.model('RxFavorite', rxFavoriteSchema);
