const test = require('node:test');
const assert = require('node:assert');
const scribe = require('../src/services/scribeFormatter');

const SAMPLE = `Patient complains of fever and body ache for 3 days.
On examination BP 130/85, pulse 88, temperature 101.2, SpO2 98.
Likely viral fever. Prescribe Paracetamol 500mg twice a day for 5 days after food.
Follow up in 7 days if symptoms persist.`;

test('extractVitals pulls structured vitals', () => {
  const v = scribe.extractVitals(SAMPLE);
  assert.strictEqual(v.bp, '130/85');
  assert.strictEqual(v.pulse, 88);
  assert.strictEqual(v.temperature, 101.2);
  assert.strictEqual(v.spo2, 98);
});

test('extractMedicines detects name, dose, frequency, duration', () => {
  const meds = scribe.extractMedicines(SAMPLE);
  assert.strictEqual(meds.length, 1);
  assert.strictEqual(meds[0].name, 'Paracetamol');
  assert.strictEqual(meds[0].dosage, '500mg');
  assert.strictEqual(meds[0].frequency, '1-0-1'); // twice a day
  assert.strictEqual(meds[0].duration, '5 days');
});

test('extractDiagnosis', () => {
  assert.match(scribe.extractDiagnosis(SAMPLE), /viral fever/i);
});

test('extractFollowUp returns days (weeks converted)', () => {
  assert.strictEqual(scribe.extractFollowUp(SAMPLE), 7);
  assert.strictEqual(scribe.extractFollowUp('follow up in 2 weeks'), 14);
  assert.strictEqual(scribe.extractFollowUp('no follow up info'), null);
});

test('parseTranscript builds a full SOAP note', () => {
  const note = scribe.parseTranscript(SAMPLE);
  assert.ok(note.soap.subjective.length > 0);
  assert.match(note.soap.objective, /BP/);
  assert.match(note.soap.assessment, /viral fever/i);
  assert.match(note.soap.plan, /medication/i);
  assert.strictEqual(note.medicines.length, 1);
  assert.strictEqual(note.followUpDays, 7);
  assert.strictEqual(note.source, 'rule-based');
  assert.ok(note.disclaimer);
  assert.ok(note.wordCount > 0);
});

test('parseTranscript handles empty input gracefully', () => {
  const note = scribe.parseTranscript('');
  assert.strictEqual(note.wordCount, 0);
  assert.strictEqual(note.medicines.length, 0);
  assert.ok(note.soap);
});
