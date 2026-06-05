const test = require('node:test');
const assert = require('node:assert');
const i18n = require('../src/services/i18nService');

test('isSupported / normalizeLang', () => {
  assert.strictEqual(i18n.isSupported('hi'), true);
  assert.strictEqual(i18n.isSupported('xx'), false);
  assert.strictEqual(i18n.normalizeLang('hi-IN'), 'hi');
  assert.strictEqual(i18n.normalizeLang('xx'), 'en');
  assert.strictEqual(i18n.normalizeLang(undefined), 'en');
});

test('t() translates and falls back', () => {
  assert.strictEqual(i18n.t('medicine', 'en'), 'Medicine');
  assert.strictEqual(i18n.t('medicine', 'hi'), 'दवा');
  // unknown key passes through
  assert.strictEqual(i18n.t('nope', 'hi'), 'nope');
  // unknown lang falls back to English
  assert.strictEqual(i18n.t('medicine', 'zz'), 'Medicine');
});

test('translateTiming', () => {
  assert.strictEqual(i18n.translateTiming('after-food', 'en'), 'After food');
  assert.strictEqual(i18n.translateTiming('after-food', 'hi'), 'खाने के बाद');
  assert.strictEqual(i18n.translateTiming('', 'hi'), '');
});

test('translateFrequency expands dosing codes', () => {
  assert.strictEqual(i18n.translateFrequency('1-0-1', 'en'), 'Morning • Night');
  assert.strictEqual(i18n.translateFrequency('1-1-1', 'en'), 'Morning • Afternoon • Night');
  assert.strictEqual(i18n.translateFrequency('0-0-1', 'en'), 'Night');
  // non-standard passes through
  assert.strictEqual(i18n.translateFrequency('SOS', 'en'), 'SOS');
  assert.strictEqual(i18n.translateFrequency('', 'en'), '');
});

test('localizePrescription produces translated, render-ready object', () => {
  const rx = {
    diagnosis: 'Viral fever',
    advice: 'Rest',
    medicines: [{ name: 'Paracetamol', dosage: '500mg', frequency: '1-0-1', timing: 'after-food', duration: '3 days' }]
  };
  const out = i18n.localizePrescription(rx, 'hi');
  assert.strictEqual(out.language, 'hi');
  assert.strictEqual(out.labels.medicine, 'दवा');
  assert.strictEqual(out.medicines[0].frequencyText, 'सुबह • रात');
  assert.strictEqual(out.medicines[0].timingText, 'खाने के बाद');
  // original input is not mutated
  assert.strictEqual(rx.medicines[0].frequencyText, undefined);
});

test('listLanguages returns all 8 languages', () => {
  const langs = i18n.listLanguages();
  assert.strictEqual(langs.length, 8);
  assert.ok(langs.find((l) => l.code === 'ta'));
});
