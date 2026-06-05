/**
 * i18nService — Multilingual support for patient-facing prescriptions and labels.
 *
 * Pure module (no external dependencies) so it is fully unit-testable and can be
 * shared by the PDF generator, WhatsApp messages, and the web/mobile clients.
 *
 * Supported languages (India-first):
 *   en (English), hi (Hindi), ta (Tamil), te (Telugu),
 *   bn (Bengali), mr (Marathi), kn (Kannada), gu (Gujarati)
 *
 * Frequency codes such as "1-0-1" are universal and are expanded into a
 * human-readable, translated phrase ("Morning & Night").
 */

const LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  bn: 'বাংলা',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  gu: 'ગુજરાતી'
};

const DEFAULT_LANGUAGE = 'en';

// Prescription / clinical label dictionary.
// Keep keys stable; add new languages by extending each entry.
const DICTIONARY = {
  prescription: {
    en: 'Prescription', hi: 'दवा पर्ची', ta: 'மருந்து சீட்டு', te: 'మందుల చీటీ',
    bn: 'প্রেসক্রিপশন', mr: 'औषध चिठ्ठी', kn: 'ಔಷಧಿ ಚೀಟಿ', gu: 'દવા ચિઠ્ઠી'
  },
  patient: {
    en: 'Patient', hi: 'मरीज़', ta: 'நோயாளி', te: 'రోగి',
    bn: 'রোগী', mr: 'रुग्ण', kn: 'ರೋಗಿ', gu: 'દર્દી'
  },
  diagnosis: {
    en: 'Diagnosis', hi: 'निदान', ta: 'நோய் கண்டறிதல்', te: 'రోగ నిర్ధారణ',
    bn: 'রোগ নির্ণয়', mr: 'निदान', kn: 'ರೋಗ ನಿರ್ಣಯ', gu: 'નિદાન'
  },
  medicine: {
    en: 'Medicine', hi: 'दवा', ta: 'மருந்து', te: 'మందు',
    bn: 'ওষুধ', mr: 'औषध', kn: 'ಔಷಧಿ', gu: 'દવા'
  },
  dosage: {
    en: 'Dosage', hi: 'खुराक', ta: 'மருந்தளவு', te: 'మోతాదు',
    bn: 'মাত্রা', mr: 'मात्रा', kn: 'ಪ್ರಮಾಣ', gu: 'માત્રા'
  },
  duration: {
    en: 'Duration', hi: 'अवधि', ta: 'காலம்', te: 'వ్యవధి',
    bn: 'সময়কাল', mr: 'कालावधी', kn: 'ಅವಧಿ', gu: 'સમયગાળો'
  },
  advice: {
    en: 'Advice', hi: 'सलाह', ta: 'அறிவுரை', te: 'సలహా',
    bn: 'পরামর্শ', mr: 'सल्ला', kn: 'ಸಲಹೆ', gu: 'સલાહ'
  },
  followUp: {
    en: 'Follow-up', hi: 'अगली जाँच', ta: 'மறு பரிசோதனை', te: 'తదుపరి సందర్శన',
    bn: 'পরবর্তী সাক্ষাৎ', mr: 'पुढील तपासणी', kn: 'ಮುಂದಿನ ಭೇಟಿ', gu: 'ફોલો-અપ'
  },
  days: {
    en: 'days', hi: 'दिन', ta: 'நாட்கள்', te: 'రోజులు',
    bn: 'দিন', mr: 'दिवस', kn: 'ದಿನಗಳು', gu: 'દિવસ'
  },
  // Timing relative to food
  'after-food': {
    en: 'After food', hi: 'खाने के बाद', ta: 'உணவுக்குப் பிறகு', te: 'భోజనం తర్వాత',
    bn: 'খাবারের পরে', mr: 'जेवणानंतर', kn: 'ಊಟದ ನಂತರ', gu: 'જમ્યા પછી'
  },
  'before-food': {
    en: 'Before food', hi: 'खाने से पहले', ta: 'உணவுக்கு முன்', te: 'భోజనానికి ముందు',
    bn: 'খাবারের আগে', mr: 'जेवणापूर्वी', kn: 'ಊಟಕ್ಕೆ ಮೊದಲು', gu: 'જમ્યા પહેલા'
  },
  'empty-stomach': {
    en: 'Empty stomach', hi: 'खाली पेट', ta: 'வெறும் வயிற்றில்', te: 'ఖాళీ కడుపుతో',
    bn: 'খালি পেটে', mr: 'उपाशी पोटी', kn: 'ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ', gu: 'ખાલી પેટે'
  },
  bedtime: {
    en: 'At bedtime', hi: 'सोते समय', ta: 'தூங்கும் நேரம்', te: 'నిద్రవేళ',
    bn: 'ঘুমানোর সময়', mr: 'झोपण्यापूर्वी', kn: 'ಮಲಗುವ ಮೊದಲು', gu: 'સૂતી વખતે'
  },
  // Frequency slot phrases (morning / afternoon / night)
  morning: {
    en: 'Morning', hi: 'सुबह', ta: 'காலை', te: 'ఉదయం',
    bn: 'সকাল', mr: 'सकाळ', kn: 'ಬೆಳಿಗ್ಗೆ', gu: 'સવાર'
  },
  afternoon: {
    en: 'Afternoon', hi: 'दोपहर', ta: 'மதியம்', te: 'మధ్యాహ్నం',
    bn: 'দুপুর', mr: 'दुपार', kn: 'ಮಧ್ಯಾಹ್ನ', gu: 'બપોર'
  },
  night: {
    en: 'Night', hi: 'रात', ta: 'இரவு', te: 'రాత్రి',
    bn: 'রাত', mr: 'रात्र', kn: 'ರಾತ್ರಿ', gu: 'રાત'
  },
  takeAndnbsp: {
    en: 'Take', hi: 'लें', ta: 'எடுத்துக்கொள்ளவும்', te: 'తీసుకోండి',
    bn: 'নিন', mr: 'घ्या', kn: 'ತೆಗೆದುಕೊಳ್ಳಿ', gu: 'લો'
  }
};

function isSupported(lang) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, lang);
}

function normalizeLang(lang) {
  if (!lang) return DEFAULT_LANGUAGE;
  const short = String(lang).toLowerCase().split('-')[0];
  return isSupported(short) ? short : DEFAULT_LANGUAGE;
}

/**
 * Translate a known label key into the requested language.
 * Falls back to English, then to the key itself.
 */
function t(key, lang = DEFAULT_LANGUAGE) {
  const L = normalizeLang(lang);
  const entry = DICTIONARY[key];
  if (!entry) return key;
  return entry[L] || entry[DEFAULT_LANGUAGE] || key;
}

/**
 * Translate a food-timing token (after-food, before-food, empty-stomach, bedtime).
 */
function translateTiming(timing, lang = DEFAULT_LANGUAGE) {
  if (!timing) return '';
  return t(timing, lang);
}

/**
 * Expand a dosing-frequency code like "1-0-1" or "1-1-1" into a translated phrase.
 * Accepts "morning-afternoon-night" slot codes. Non-standard strings are returned as-is.
 */
function translateFrequency(freq, lang = DEFAULT_LANGUAGE) {
  if (!freq || typeof freq !== 'string') return '';
  const parts = freq.trim().split('-');
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return freq; // unknown format, pass through
  }
  const slots = ['morning', 'afternoon', 'night'];
  const active = [];
  parts.forEach((p, i) => {
    if (Number(p) > 0) active.push(t(slots[i], lang));
  });
  if (active.length === 0) return freq;
  return active.join(' • ');
}

/**
 * Build a fully translated, render-ready prescription object for the patient's language.
 * Does not mutate the input prescription.
 */
function localizePrescription(prescription = {}, lang = DEFAULT_LANGUAGE) {
  const L = normalizeLang(lang);
  const medicines = (prescription.medicines || []).map((m) => ({
    ...m,
    frequencyText: translateFrequency(m.frequency, L),
    timingText: translateTiming(m.timing, L),
    durationText: m.duration ? `${m.duration}` : ''
  }));
  return {
    language: L,
    languageName: LANGUAGES[L],
    labels: {
      prescription: t('prescription', L),
      patient: t('patient', L),
      diagnosis: t('diagnosis', L),
      medicine: t('medicine', L),
      dosage: t('dosage', L),
      duration: t('duration', L),
      advice: t('advice', L),
      followUp: t('followUp', L),
      days: t('days', L)
    },
    diagnosis: prescription.diagnosis || '',
    medicines,
    advice: prescription.advice || ''
  };
}

function listLanguages() {
  return Object.entries(LANGUAGES).map(([code, name]) => ({ code, name }));
}

module.exports = {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  isSupported,
  normalizeLang,
  t,
  translateTiming,
  translateFrequency,
  localizePrescription,
  listLanguages
};
