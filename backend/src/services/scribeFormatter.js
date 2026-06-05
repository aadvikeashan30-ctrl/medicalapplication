/**
 * scribeFormatter — Pure, rule-based parser that turns a raw consultation
 * transcript (doctor + patient speech) into a structured clinical note.
 *
 * This is the deterministic fallback for the Ambient AI Scribe: it runs with
 * zero external dependencies so the feature works even without an AI API key,
 * and it is fully unit-testable. When an AI provider IS configured, the route
 * layer uses aiService for higher-quality extraction and uses this as backup.
 *
 * Pure module (no external dependencies).
 */

// Common vitals patterns.
const VITAL_PATTERNS = [
  { key: 'bp', re: /\b(?:bp|blood pressure)\b[^\d]*(\d{2,3}\s*\/\s*\d{2,3})/i, transform: (m) => m.replace(/\s+/g, '') },
  { key: 'pulse', re: /\b(?:pulse|heart rate|hr)\b[^\d]*(\d{2,3})/i, transform: (m) => Number(m) },
  { key: 'temperature', re: /\b(?:temp|temperature|fever)\b[^\d]*(\d{2,3}(?:\.\d)?)/i, transform: (m) => Number(m) },
  { key: 'spo2', re: /\b(?:spo2|oxygen|saturation)\b[^\d]*(\d{2,3})/i, transform: (m) => Number(m) },
  { key: 'weight', re: /\b(?:weight|wt)\b[^\d]*(\d{2,3}(?:\.\d)?)\s*(?:kg)?/i, transform: (m) => Number(m) }
];

// A small dictionary of well-known medicines to detect by name.
const KNOWN_MEDS = [
  'paracetamol', 'amoxicillin', 'azithromycin', 'metformin', 'amlodipine',
  'atorvastatin', 'omeprazole', 'pantoprazole', 'cetirizine', 'ibuprofen',
  'aspirin', 'losartan', 'telmisartan', 'montelukast', 'levocetirizine',
  'dolo', 'augmentin', 'ondansetron', 'ranitidine', 'insulin'
];

const FREQ_WORDS = [
  { re: /\b(?:once|1 time)\b.*\bday\b|\bod\b|\bonce daily\b/i, code: '1-0-0' },
  { re: /\b(?:twice|2 times|bd|bid)\b/i, code: '1-0-1' },
  { re: /\b(?:thrice|three times|tid|tds)\b/i, code: '1-1-1' }
];

function splitSentences(text) {
  return String(text || '')
    .replace(/\n+/g, '. ')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractVitals(text) {
  const vitals = {};
  for (const { key, re, transform } of VITAL_PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) vitals[key] = transform(m[1]);
  }
  return vitals;
}

function extractMedicines(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const med of KNOWN_MEDS) {
    const idx = lower.indexOf(med);
    if (idx === -1) continue;
    // Look at a window after the medicine name for dose/frequency.
    const window = text.slice(idx, idx + 80);
    const doseMatch = window.match(/(\d+\s*(?:mg|ml|mcg|g|iu))/i);
    let frequency = '';
    for (const f of FREQ_WORDS) {
      if (f.re.test(window)) { frequency = f.code; break; }
    }
    const durationMatch = window.match(/(\d+)\s*(days|day|weeks|week)/i);
    found.push({
      name: capitalize(med),
      dosage: doseMatch ? doseMatch[1].replace(/\s+/g, '') : '',
      frequency,
      duration: durationMatch ? `${durationMatch[1]} ${durationMatch[2]}` : '',
      timing: /before food|empty stomach/i.test(window) ? 'before-food' : 'after-food'
    });
  }
  // De-duplicate by name.
  const seen = new Set();
  return found.filter((m) => (seen.has(m.name) ? false : seen.add(m.name)));
}

function extractDiagnosis(text) {
  const m = text.match(/\b(?:diagnos(?:is|ed with)?|impression|assessment|likely|appears to be|suffering from)\b[:\s-]*([^.?!\n]{3,80})/i);
  return m ? m[1].trim() : '';
}

function extractFollowUp(text) {
  const m = text.match(/\bfollow[\s-]?up\b[^\d]*(\d+)\s*(day|days|week|weeks)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /week/i.test(m[2]) ? n * 7 : n;
}

function extractComplaints(text) {
  const m = text.match(/\b(?:complains? of|c\/o|presents? with|reports?|having)\b[:\s-]*([^.?!\n]{3,120})/i);
  return m ? m[1].trim() : '';
}

/**
 * Parse a transcript into a structured clinical note (SOAP + extracted data).
 */
function parseTranscript(transcript) {
  const text = String(transcript || '').trim();
  const sentences = splitSentences(text);
  const vitals = extractVitals(text);
  const medicines = extractMedicines(text);
  const diagnosis = extractDiagnosis(text);
  const followUpDays = extractFollowUp(text);
  const complaints = extractComplaints(text);

  const subjective = complaints || sentences.slice(0, 2).join(' ') || '';
  const objective = Object.keys(vitals).length
    ? `Vitals: ${Object.entries(vitals).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')}.`
    : 'No abnormal findings explicitly documented.';
  const assessment = diagnosis || 'Clinical impression to be confirmed by physician.';
  const planParts = [];
  if (medicines.length) planParts.push(`${medicines.length} medication(s) prescribed.`);
  if (followUpDays) planParts.push(`Follow-up in ${followUpDays} day(s).`);
  const plan = planParts.join(' ') || 'Supportive care; review as advised.';

  return {
    soap: { subjective, objective, assessment, plan },
    vitals,
    diagnosis,
    medicines,
    followUpDays,
    advice: complaints ? '' : '',
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    source: 'rule-based',
    disclaimer: 'Auto-generated draft from transcript. Physician must review and approve before finalizing.'
  };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

module.exports = {
  parseTranscript,
  extractVitals,
  extractMedicines,
  extractDiagnosis,
  extractFollowUp,
  splitSentences
};
