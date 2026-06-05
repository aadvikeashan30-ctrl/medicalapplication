/**
 * Demo-mode handlers for the new all-in-one features.
 *
 * Mounted in server.js immediately after routes/demo.js and BEFORE the DB
 * guard, so the entire new feature set (Scribe, i18n, ABDM, Pharmacy, Lab
 * Orders, self-service) is fully explorable in the no-database demo. Real DB
 * requests fall through to the actual routes via the same `demoOnly` gate used
 * by routes/demo.js.
 *
 * Pure services (scribeFormatter, i18nService, inventoryService, abdmService)
 * are reused here so the demo returns genuine, computed output — not stubs.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const i18n = require('../services/i18nService');
const scribeFormatter = require('../services/scribeFormatter');
const inv = require('../services/inventoryService');
const abdm = require('../services/abdmService');

const router = express.Router();

// Same gate as routes/demo.js: serve demo data when DB is down or for the demo user.
function demoOnly(req, res, next) {
  if (req.app.locals.dbConnected && mongoose.connection.readyState === 1) {
    try {
      const header = req.header('Authorization') || '';
      const token = header.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const secret = process.env.JWT_SECRET || 'demo-fallback-secret-key-32chars!!';
        const decoded = jwt.verify(token, secret);
        if (decoded.userId === 'demo-doctor-001') return next();
      }
    } catch (e) { /* ignore */ }
    return next('route');
  }
  next();
}

// ---- In-memory demo stores (reset on restart) ----
const store = {
  notes: [],
  favorites: [
    { _id: 'fav-1', type: 'protocol', label: 'Viral Fever', diagnosis: 'Acute viral fever', advice: 'Rest, fluids', followUpDays: 3, usageCount: 42, medicines: [{ name: 'Paracetamol', dosage: '500mg', frequency: '1-1-1', duration: '3 days', timing: 'after-food' }, { name: 'Cetirizine', dosage: '10mg', frequency: '0-0-1', duration: '5 days', timing: 'bedtime' }] },
    { _id: 'fav-2', type: 'protocol', label: 'Type 2 Diabetes (maintenance)', diagnosis: 'Type 2 Diabetes Mellitus', advice: 'Low-sugar diet, walk 30 min', followUpDays: 30, usageCount: 28, medicines: [{ name: 'Metformin', dosage: '500mg', frequency: '1-0-1', duration: '30 days', timing: 'after-food' }] },
    { _id: 'fav-3', type: 'medicine', usageCount: 65, medicines: [{ name: 'Pantoprazole', dosage: '40mg', frequency: '1-0-0', duration: '14 days', timing: 'before-food' }] }
  ],
  inventory: [
    { _id: 'item-1', sku: 'INV-00001', name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'medicine', form: 'tablet', gstRate: 12, reorderLevel: 50, sellingPrice: 2, costPrice: 1, batches: [{ batchNo: 'PC-A1', quantity: 30, expiryDate: '2026-08-01', costPrice: 1, mrp: 2 }], totalQuantity: 30 },
    { _id: 'item-2', sku: 'INV-00002', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'medicine', form: 'capsule', gstRate: 12, reorderLevel: 20, sellingPrice: 6, costPrice: 4, batches: [{ batchNo: 'AM-77', quantity: 200, expiryDate: '2027-03-01', costPrice: 4, mrp: 6 }], totalQuantity: 200 },
    { _id: 'item-3', sku: 'INV-00003', name: 'Surgical Gloves', category: 'consumable', gstRate: 18, reorderLevel: 100, sellingPrice: 8, costPrice: 5, batches: [{ batchNo: 'GL-01', quantity: 60, expiryDate: '2028-01-01', costPrice: 5, mrp: 8 }], totalQuantity: 60 }
  ],
  labOrders: [
    { _id: 'lab-1', orderNo: 'LAB-00001', patientId: { _id: 'pat-1', name: 'Ramesh Kumar', patientId: 'PAT-0001' }, labName: 'In-house', tests: [{ name: 'Complete Blood Count', category: 'Hematology', price: 350, result: { value: '', unit: '', referenceRange: '', flag: '' } }], status: 'ordered', priority: 'routine', totalAmount: 350, createdAt: new Date() }
  ]
};

function withStock(it) {
  return { ...it, stockStatus: inv.stockStatus(it.totalQuantity, it.reorderLevel) };
}

// ==================== SCRIBE ====================
router.post('/scribe/generate', demoOnly, (req, res) => {
  const { transcript = '', patientId, language = 'en' } = req.body;
  if (!transcript.trim()) return res.status(400).json({ message: 'Transcript is required' });
  const parsed = scribeFormatter.parseTranscript(transcript);
  const note = {
    _id: `note-${Date.now()}`,
    noteNo: `NOTE-${String(store.notes.length + 1).padStart(5, '0')}`,
    patientId: patientId || null,
    language,
    transcript,
    soap: parsed.soap,
    vitals: parsed.vitals,
    diagnosis: parsed.diagnosis,
    draftMedicines: parsed.medicines,
    advice: parsed.advice,
    followUpDays: parsed.followUpDays,
    source: 'rule-based',
    aiProvider: 'demo',
    status: 'draft',
    createdAt: new Date()
  };
  store.notes.unshift(note);
  res.status(201).json(note);
});

router.get('/scribe', demoOnly, (req, res) => {
  res.json({ notes: store.notes, total: store.notes.length, pages: 1, page: 1 });
});

router.get('/scribe/:id', demoOnly, (req, res) => {
  const note = store.notes.find((n) => n._id === req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  res.json(note);
});

router.put('/scribe/:id', demoOnly, (req, res) => {
  const note = store.notes.find((n) => n._id === req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  Object.assign(note, req.body, { status: req.body.status || 'reviewed' });
  res.json(note);
});

router.post('/scribe/:id/approve', demoOnly, (req, res) => {
  const note = store.notes.find((n) => n._id === req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.status = 'approved';
  note.prescriptionId = `rx-demo-${Date.now()}`;
  res.status(201).json({
    message: 'Approved and prescription created (demo)',
    prescription: { _id: note.prescriptionId, prescriptionNo: 'RX-DEMO', diagnosis: note.diagnosis, medicines: note.draftMedicines, advice: note.advice },
    noteId: note._id
  });
});

router.delete('/scribe/:id', demoOnly, (req, res) => {
  const note = store.notes.find((n) => n._id === req.params.id);
  if (note) note.status = 'discarded';
  res.json({ message: 'Note discarded' });
});

// ==================== i18n (pure — works without DB) ====================
router.get('/i18n/languages', (req, res) => {
  res.json({ languages: i18n.listLanguages(), default: i18n.DEFAULT_LANGUAGE });
});

router.post('/i18n/localize', demoOnly, (req, res) => {
  const { prescription, language } = req.body;
  if (!prescription) return res.status(400).json({ message: 'prescription is required' });
  res.json(i18n.localizePrescription(prescription, language));
});

router.get('/i18n/prescription/:id', demoOnly, (req, res) => {
  const lang = req.query.lang || 'hi';
  const demoRx = {
    diagnosis: 'Viral fever',
    advice: 'Rest and plenty of fluids',
    medicines: [{ name: 'Paracetamol', dosage: '500mg', frequency: '1-0-1', timing: 'after-food', duration: '3 days' }]
  };
  res.json({ prescriptionNo: 'RX-DEMO', patient: { name: 'Demo Patient', patientId: 'PAT-0001' }, ...i18n.localizePrescription(demoRx, lang) });
});

// ==================== RX TOOLS (30-second Rx) ====================
router.get('/rx-tools', demoOnly, (req, res) => {
  let list = store.favorites;
  if (req.query.type) list = list.filter((f) => f.type === req.query.type);
  res.json([...list].sort((a, b) => b.usageCount - a.usageCount));
});

router.get('/rx-tools/autocomplete', demoOnly, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const type = req.query.type || 'medicine';
  const list = store.favorites
    .filter((f) => f.type === type)
    .filter((f) => !q || (f.label || '').toLowerCase().includes(q) || (f.medicines || []).some((m) => m.name.toLowerCase().includes(q)));
  res.json(list.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10));
});

router.post('/rx-tools', demoOnly, (req, res) => {
  const fav = { _id: `fav-${Date.now()}`, usageCount: 0, isActive: true, ...req.body };
  store.favorites.push(fav);
  res.status(201).json(fav);
});

router.post('/rx-tools/:id/apply', demoOnly, (req, res) => {
  const fav = store.favorites.find((f) => f._id === req.params.id);
  if (!fav) return res.status(404).json({ message: 'Favorite not found' });
  fav.usageCount += 1;
  res.json({ diagnosis: fav.diagnosis || '', advice: fav.advice || '', followUpDays: fav.followUpDays || null, tests: fav.tests || [], medicines: fav.medicines || [] });
});

router.delete('/rx-tools/:id', demoOnly, (req, res) => {
  store.favorites = store.favorites.filter((f) => f._id !== req.params.id);
  res.json({ message: 'Favorite deleted' });
});

// ==================== ABDM / ABHA ====================
router.get('/abdm/status', demoOnly, (req, res) => {
  res.json({ configured: false, mode: 'demo', hfrFacilityId: null, hipId: 'DEMO-HIP' });
});

router.post('/abdm/abha/create', demoOnly, (req, res) => {
  const profile = abdm.generateDemoAbha('Demo Patient');
  res.status(201).json({
    message: 'ABHA created (sandbox/demo)',
    mode: 'demo',
    abha: { abhaNumberMasked: abdm.maskAbhaNumber(profile.abhaNumber), abhaAddress: profile.abhaAddress, linked: true, linkedAt: new Date(), kycVerified: true }
  });
});

router.post('/abdm/abha/verify', demoOnly, (req, res) => {
  const { abhaNumber, abhaAddress } = req.body;
  if (!abdm.isValidAbhaNumber(abhaNumber) && !abdm.isValidAbhaAddress(abhaAddress)) {
    return res.status(400).json({ message: 'Provide a valid 14-digit ABHA number or an ABHA address' });
  }
  res.json({
    message: 'ABHA verified and linked',
    abha: { abhaNumberMasked: abhaNumber ? abdm.maskAbhaNumber(abhaNumber) : null, abhaAddress: abhaAddress || null, linked: true, linkedAt: new Date(), kycVerified: true }
  });
});

router.post('/abdm/consent', demoOnly, (req, res) => {
  res.status(201).json({ message: 'Consent request raised', consent: abdm.buildConsentRequest({ abhaAddress: 'demo@sbx', ...req.body }) });
});

// ==================== PHARMACY / INVENTORY ====================
router.get('/pharmacy', demoOnly, (req, res) => {
  let items = store.inventory;
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(s));
  }
  if (req.query.lowStock === 'true') items = items.filter((i) => inv.stockStatus(i.totalQuantity, i.reorderLevel) !== 'in');
  res.json({ items: items.map(withStock), total: items.length });
});

router.get('/pharmacy/alerts', demoOnly, (req, res) => {
  res.json(inv.buildAlerts(store.inventory));
});

router.get('/pharmacy/valuation', demoOnly, (req, res) => {
  res.json({ valuation: inv.stockValuation(store.inventory), itemCount: store.inventory.length });
});

router.post('/pharmacy', demoOnly, (req, res) => {
  const item = { _id: `item-${Date.now()}`, sku: `INV-${String(store.inventory.length + 1).padStart(5, '0')}`, batches: [], totalQuantity: 0, reorderLevel: 10, gstRate: 12, ...req.body };
  item.totalQuantity = (item.batches || []).reduce((s, b) => s + (Number(b.quantity) || 0), 0);
  store.inventory.push(item);
  res.status(201).json(withStock(item));
});

router.post('/pharmacy/:id/dispense', demoOnly, (req, res) => {
  const item = store.inventory.find((i) => i._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  const qty = Number(req.body.quantity) || 0;
  const plan = inv.dispenseFEFO(item.batches, qty);
  if (plan.shortfall > 0) return res.status(409).json({ message: `Insufficient stock. Available ${plan.dispensed}, requested ${qty}.`, ...plan });
  for (const alloc of plan.allocations) {
    const b = item.batches.find((x) => x.batchNo === alloc.batchNo);
    if (b) b.quantity -= alloc.used;
  }
  item.batches = item.batches.filter((b) => b.quantity > 0);
  item.totalQuantity = item.batches.reduce((s, b) => s + b.quantity, 0);
  res.json({ message: 'Dispensed', dispensed: plan.dispensed, allocations: plan.allocations, remainingStock: item.totalQuantity, billing: inv.gstBreakup((item.sellingPrice || 0) * qty, item.gstRate) });
});

// ==================== LAB ORDERS ====================
router.get('/lab-orders', demoOnly, (req, res) => {
  res.json({ orders: store.labOrders, total: store.labOrders.length, pages: 1, page: 1 });
});

router.post('/lab-orders', demoOnly, (req, res) => {
  const order = {
    _id: `lab-${Date.now()}`,
    orderNo: `LAB-${String(store.labOrders.length + 1).padStart(5, '0')}`,
    status: 'ordered',
    priority: req.body.priority || 'routine',
    totalAmount: (req.body.tests || []).reduce((s, t) => s + (Number(t.price) || 0), 0),
    createdAt: new Date(),
    ...req.body
  };
  store.labOrders.unshift(order);
  res.status(201).json(order);
});

router.post('/lab-orders/:id/result', demoOnly, (req, res) => {
  const order = store.labOrders.find((o) => o._id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (Array.isArray(req.body.tests)) {
    req.body.tests.forEach((incoming) => {
      const t = order.tests.find((x) => x.name === incoming.name);
      if (t && incoming.result) t.result = { ...t.result, ...incoming.result };
    });
  }
  order.status = 'reported';
  order.reportedAt = new Date();
  order.reportSummary = req.body.reportSummary || 'All values within normal range (demo).';
  res.json({ message: 'Result recorded and added to timeline', order });
});

router.put('/lab-orders/:id', demoOnly, (req, res) => {
  const order = store.labOrders.find((o) => o._id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  Object.assign(order, req.body);
  res.json(order);
});

// ==================== SELF-SERVICE (live queue) ====================
router.get('/self-service/queue-board/:doctorId', (req, res) => {
  res.json({
    doctorId: req.params.doctorId,
    nowServing: { token: 3, name: 'Amit' },
    waiting: [{ token: 4, name: 'Sunita' }, { token: 5, name: 'Vikram' }],
    completed: 2,
    totalToday: 5,
    timestamp: new Date().toISOString()
  });
});

router.get('/self-service/queue-position/:appointmentId', (req, res) => {
  res.json({
    appointmentId: req.params.appointmentId,
    myToken: 4,
    status: 'scheduled',
    totalToday: 5,
    completed: 2,
    currentToken: 3,
    patientsAhead: 1,
    estimatedWaitMinutes: 15,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
