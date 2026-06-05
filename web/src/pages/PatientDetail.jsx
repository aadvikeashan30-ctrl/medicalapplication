import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiUser, FiPhone, FiMail, FiCalendar,
  FiFileText, FiDollarSign, FiActivity, FiClock, FiHeart,
  FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiMinus,
  FiUploadCloud, FiExternalLink, FiX, FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useApi } from '../hooks/useApi';
import Loader from '../components/Loader';
import PatientTimeline from '../components/PatientTimeline';
import ThreeDCard from '../components/ThreeDCard';
import FloatingOrb from '../components/FloatingOrb';
import FileUpload from '../components/FileUpload';
import VitalsTrendChart from '../components/VitalsTrendChart';

const emptyVital = {
  recordedAt: new Date().toISOString().slice(0, 10),
  systolic: '', diastolic: '', pulse: '', weight: '', height: '',
  bloodSugar: '', bloodSugarType: 'fasting', spo2: '', temperature: '', notes: ''
};

const emptyProblem = { name: '', icd10: '', status: 'active', onsetDate: '', notes: '' };

const PROBLEM_STATUS = {
  active: { label: 'Active', cls: 'bg-red-50 text-red-700 border-red-200' },
  controlled: { label: 'Controlled', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const DOC_CATEGORIES = ['lab-report', 'imaging', 'prescription', 'discharge-summary', 'insurance', 'other'];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: patient, loading } = useApi(`/patients/${id}`);
  const { data: appointments } = useApi(`/appointments?patientId=${id}&limit=20`);
  const { data: prescriptions } = useApi(`/prescriptions?patientId=${id}&limit=20`);
  const { data: billings } = useApi(`/billing?patientId=${id}&limit=20`);
  const { data: labData } = useApi(`/labtests?patientId=${id}&limit=20`);
  const { data: vitalsData, refetch: refetchVitals } = useApi(`/vitals?patientId=${id}`);
  const { data: problems, refetch: refetchProblems } = useApi(`/patients/${id}/problems`);
  const { data: documents, refetch: refetchDocs } = useApi(`/patients/${id}/documents`);

  const labTests = labData?.tests || [];
  const vitals = vitalsData?.vitals || [];
  const latestVital = vitals.length ? vitals[vitals.length - 1] : null;
  const prevVital = vitals.length > 1 ? vitals[vitals.length - 2] : null;

  // Modals / forms
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalForm, setVitalForm] = useState(emptyVital);
  const [savingVital, setSavingVital] = useState(false);

  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemForm, setProblemForm] = useState(emptyProblem);
  const [editingProblemId, setEditingProblemId] = useState(null);
  const [savingProblem, setSavingProblem] = useState(false);

  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', url: '', fileType: '', category: 'lab-report' });
  const [savingDoc, setSavingDoc] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiUser },
    { id: 'vitals', label: 'Vitals', icon: FiActivity },
    { id: 'problems', label: 'Problems', icon: FiAlertCircle },
    { id: 'history', label: 'Visit History', icon: FiClock },
    { id: 'appointments', label: 'Appointments', icon: FiCalendar },
    { id: 'prescriptions', label: 'Prescriptions', icon: FiFileText },
    { id: 'labtests', label: 'Lab Tests', icon: FiActivity },
    { id: 'documents', label: 'Documents', icon: FiUploadCloud },
    { id: 'billing', label: 'Billing', icon: FiDollarSign }
  ];

  if (loading) return <Loader label="Loading patient..." />;
  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Patient not found</p>
      <Link to="/patients" className="text-blue-600 text-sm mt-2 inline-block">← Back to patients</Link>
    </div>
  );

  const age = patient.age || (patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / 31557600000)
    : '—');

  // ---- Vitals: save / delete ----
  const submitVital = async (e) => {
    e.preventDefault();
    setSavingVital(true);
    try {
      const num = (v) => (v === '' || v == null ? undefined : Number(v));
      await api.post('/vitals', {
        patientId: id,
        recordedAt: vitalForm.recordedAt || undefined,
        systolic: num(vitalForm.systolic),
        diastolic: num(vitalForm.diastolic),
        pulse: num(vitalForm.pulse),
        weight: num(vitalForm.weight),
        height: num(vitalForm.height),
        bloodSugar: num(vitalForm.bloodSugar),
        bloodSugarType: vitalForm.bloodSugar ? vitalForm.bloodSugarType : undefined,
        spo2: num(vitalForm.spo2),
        temperature: num(vitalForm.temperature),
        notes: vitalForm.notes || undefined
      });
      toast.success('Vitals recorded');
      setShowVitalModal(false);
      setVitalForm(emptyVital);
      refetchVitals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record vitals');
    } finally {
      setSavingVital(false);
    }
  };

  const deleteVital = async (vitalId) => {
    if (!window.confirm('Delete this vitals entry?')) return;
    try {
      await api.delete(`/vitals/${vitalId}`);
      toast.success('Entry deleted');
      refetchVitals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---- Problems: save / delete ----
  const openProblemModal = (p = null) => {
    if (p) {
      setEditingProblemId(p._id);
      setProblemForm({
        name: p.name || '', icd10: p.icd10 || '', status: p.status || 'active',
        onsetDate: p.onsetDate ? new Date(p.onsetDate).toISOString().slice(0, 10) : '',
        notes: p.notes || ''
      });
    } else {
      setEditingProblemId(null);
      setProblemForm(emptyProblem);
    }
    setShowProblemModal(true);
  };

  const submitProblem = async (e) => {
    e.preventDefault();
    if (!problemForm.name.trim()) return toast.error('Problem name is required');
    setSavingProblem(true);
    try {
      const payload = { ...problemForm, onsetDate: problemForm.onsetDate || undefined };
      if (editingProblemId) {
        await api.put(`/patients/${id}/problems/${editingProblemId}`, payload);
      } else {
        await api.post(`/patients/${id}/problems`, payload);
      }
      toast.success(editingProblemId ? 'Problem updated' : 'Problem added');
      setShowProblemModal(false);
      setProblemForm(emptyProblem);
      setEditingProblemId(null);
      refetchProblems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save problem');
    } finally {
      setSavingProblem(false);
    }
  };

  const deleteProblem = async (problemId) => {
    if (!window.confirm('Remove this problem from the list?')) return;
    try {
      await api.delete(`/patients/${id}/problems/${problemId}`);
      toast.success('Problem removed');
      refetchProblems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  // ---- Documents: attach / delete ----
  const submitDoc = async (e) => {
    e.preventDefault();
    if (!docForm.url) return toast.error('Please upload a file first');
    if (!docForm.name.trim()) return toast.error('Please name the document');
    setSavingDoc(true);
    try {
      await api.post(`/patients/${id}/documents`, docForm);
      toast.success('Document attached');
      setShowDocModal(false);
      setDocForm({ name: '', url: '', fileType: '', category: 'lab-report' });
      refetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to attach document');
    } finally {
      setSavingDoc(false);
    }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/patients/${id}/documents/${docId}`);
      toast.success('Document deleted');
      refetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---- Summary metric cards (with trend vs previous reading) ----
  const trendFor = (key, lowerIsBetter = true) => {
    if (!latestVital || !prevVital || latestVital[key] == null || prevVital[key] == null) return null;
    const diff = latestVital[key] - prevVital[key];
    if (diff === 0) return { dir: 'flat', good: true };
    const improving = lowerIsBetter ? diff < 0 : diff > 0;
    return { dir: diff > 0 ? 'up' : 'down', good: improving, diff: Math.abs(diff) };
  };

  const TrendBadge = ({ trend }) => {
    if (!trend) return null;
    const Icon = trend.dir === 'up' ? FiTrendingUp : trend.dir === 'down' ? FiTrendingDown : FiMinus;
    const color = trend.dir === 'flat' ? 'text-gray-400' : trend.good ? 'text-emerald-500' : 'text-red-500';
    return <Icon className={`${color} text-sm`} title={trend.diff ? `${trend.diff} vs previous` : ''} />;
  };

  const summaryCards = latestVital ? [
    {
      label: 'Blood Pressure',
      value: latestVital.systolic && latestVital.diastolic ? `${latestVital.systolic}/${latestVital.diastolic}` : '—',
      unit: 'mmHg', trend: trendFor('systolic'), accent: 'from-rose-500 to-red-500'
    },
    {
      label: latestVital.bloodSugarType ? `Sugar (${latestVital.bloodSugarType})` : 'Blood Sugar',
      value: latestVital.bloodSugar ?? '—', unit: 'mg/dL', trend: trendFor('bloodSugar'), accent: 'from-amber-500 to-orange-500'
    },
    { label: 'Weight', value: latestVital.weight ?? '—', unit: 'kg', trend: trendFor('weight'), accent: 'from-blue-500 to-indigo-500' },
    { label: 'BMI', value: latestVital.bmi ?? '—', unit: '', trend: trendFor('bmi'), accent: 'from-violet-500 to-purple-500' },
    { label: 'SpO₂', value: latestVital.spo2 ?? '—', unit: '%', trend: trendFor('spo2', false), accent: 'from-cyan-500 to-teal-500' }
  ] : [];

  // Build timeline events from all data
  const timelineEvents = [
    ...(appointments || []).slice(0, 5).map(a => ({
      type: 'appointment',
      title: `${a.type || 'Consultation'} - ${a.status}`,
      description: a.notes || `Token #${a.tokenNumber}`,
      date: new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      doctor: 'You'
    })),
    ...(prescriptions || []).slice(0, 3).map(p => ({
      type: 'prescription',
      title: `Prescription - ${p.medicines?.length || 0} medicines`,
      description: p.diagnosis || '',
      date: new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    })),
    ...labTests.slice(0, 3).map(l => ({
      type: 'labtest',
      title: l.name,
      description: `Status: ${l.status}`,
      date: new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const activeProblems = (problems || []).filter((p) => p.status !== 'resolved');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button */}
      <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
        <FiArrowLeft /> Back to Patients
      </button>

      {/* Patient Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700 p-8 text-white shadow-2xl">
        <FloatingOrb size={200} color="purple" top="-40px" right="-30px" opacity={0.2} />
        <FloatingOrb size={150} color="cyan" bottom="-20px" left="10%" opacity={0.15} delay={1} />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-bold">
            {patient.name?.charAt(0).toUpperCase()}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold">{patient.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-blue-100 text-sm">
              <span>{patient.gender || '—'} • {age} yrs</span>
              {patient.phone && <span className="flex items-center gap-1"><FiPhone /> {patient.phone}</span>}
              {patient.email && <span className="flex items-center gap-1"><FiMail /> {patient.email}</span>}
            </div>
            {/* Active problem chips inline in header for at-a-glance context */}
            {activeProblems.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {activeProblems.slice(0, 4).map((p) => (
                  <span key={p._id} className="text-[11px] bg-white/15 border border-white/25 rounded-full px-2.5 py-1">
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex gap-3">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xl font-bold">{(appointments || []).length}</p>
              <p className="text-[11px] text-blue-200">Visits</p>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xl font-bold">{(prescriptions || []).length}</p>
              <p className="text-[11px] text-blue-200">Rx</p>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xl font-bold">{labTests.length}</p>
              <p className="text-[11px] text-blue-200">Tests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals summary cards */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {summaryCards.map((c) => (
            <div key={c.label} className="card !p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{c.label}</p>
                <TrendBadge trend={c.trend} />
              </div>
              <p className="mt-1">
                <span className={`text-2xl font-bold bg-gradient-to-r ${c.accent} bg-clip-text text-transparent`}>{c.value}</span>
                {c.unit && c.value !== '—' && <span className="text-xs text-gray-400 ml-1">{c.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon className="text-base" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            {/* Medical Info */}
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiHeart className="text-red-500" /> Medical Info
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Blood Group:</span> <span className="font-medium">{patient.bloodGroup || '—'}</span></div>
                <div><span className="text-gray-500">Allergies:</span> <span className="font-medium">{Array.isArray(patient.allergies) ? (patient.allergies.join(', ') || 'None known') : (patient.allergies || 'None known')}</span></div>
                <div><span className="text-gray-500">Active Problems:</span> <span className="font-medium">{activeProblems.length || '—'}</span></div>
                <div><span className="text-gray-500">Emergency:</span> <span className="font-medium">{patient.emergencyContact || '—'}</span></div>
              </div>
              {patient.notes && (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-800 border border-amber-100">
                  <strong>Notes:</strong> {patient.notes}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiClock className="text-purple-600" /> Recent Activity
              </h3>
              <PatientTimeline events={timelineEvents} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <ThreeDCard intensity={8}>
              <div className="p-5 bg-white rounded-2xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Link to={`/appointments?patientId=${id}`} className="block w-full text-left text-sm px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium">
                    + Book Appointment
                  </Link>
                  <Link to={`/prescriptions?patientId=${id}`} className="block w-full text-left text-sm px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium">
                    + Create Prescription
                  </Link>
                  <button onClick={() => { setActiveTab('vitals'); setShowVitalModal(true); }} className="block w-full text-left text-sm px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors font-medium">
                    + Record Vitals
                  </button>
                  <Link to="/lab-tests" className="block w-full text-left text-sm px-4 py-2.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors font-medium">
                    + Order Lab Test
                  </Link>
                  <Link to="/billing" className="block w-full text-left text-sm px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium">
                    + Create Bill
                  </Link>
                </div>
              </div>
            </ThreeDCard>

            <div className="card">
              <h4 className="font-bold text-gray-900 mb-3">Registration</h4>
              <p className="text-sm text-gray-500">
                Patient ID: <span className="font-mono text-gray-900">{patient.patientId || patient._id?.slice(-6)}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Registered: {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-IN') : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== VITALS ===== */}
      {activeTab === 'vitals' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FiActivity className="text-rose-500" /> Vitals Trends
            </h3>
            <button onClick={() => setShowVitalModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <FiPlus /> Record Vitals
            </button>
          </div>

          {vitals.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              No vitals recorded yet. Click <span className="font-medium text-gray-600">Record Vitals</span> to start tracking trends.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Blood Pressure (mmHg)</h4>
                  <VitalsTrendChart
                    points={vitals} unit="mmHg"
                    series={[
                      { key: 'systolic', label: 'Systolic', color: '#ef4444' },
                      { key: 'diastolic', label: 'Diastolic', color: '#3b82f6' }
                    ]}
                  />
                </div>
                <div className="card">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Blood Sugar (mg/dL)</h4>
                  <VitalsTrendChart points={vitals} unit="mg/dL" series={[{ key: 'bloodSugar', label: 'Blood Sugar', color: '#f59e0b' }]} />
                </div>
                <div className="card">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Weight & BMI</h4>
                  <VitalsTrendChart
                    points={vitals}
                    series={[
                      { key: 'weight', label: 'Weight (kg)', color: '#6366f1' },
                      { key: 'bmi', label: 'BMI', color: '#a855f7' }
                    ]}
                  />
                </div>
                <div className="card">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Pulse & SpO₂</h4>
                  <VitalsTrendChart
                    points={vitals}
                    series={[
                      { key: 'pulse', label: 'Pulse (bpm)', color: '#14b8a6' },
                      { key: 'spo2', label: 'SpO₂ (%)', color: '#06b6d4' }
                    ]}
                  />
                </div>
              </div>

              {/* Recent readings table */}
              <div className="card overflow-x-auto">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Recent Readings</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">BP</th>
                      <th className="py-2 pr-4 font-medium">Pulse</th>
                      <th className="py-2 pr-4 font-medium">Sugar</th>
                      <th className="py-2 pr-4 font-medium">Weight</th>
                      <th className="py-2 pr-4 font-medium">BMI</th>
                      <th className="py-2 pr-4 font-medium">SpO₂</th>
                      <th className="py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...vitals].reverse().map((v) => (
                      <tr key={v._id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 text-gray-600">{new Date(v.recordedAt).toLocaleDateString('en-IN')}</td>
                        <td className="py-2 pr-4">{v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'}</td>
                        <td className="py-2 pr-4">{v.pulse ?? '—'}</td>
                        <td className="py-2 pr-4">{v.bloodSugar ?? '—'}</td>
                        <td className="py-2 pr-4">{v.weight ?? '—'}</td>
                        <td className="py-2 pr-4">{v.bmi ?? '—'}</td>
                        <td className="py-2 pr-4">{v.spo2 ?? '—'}</td>
                        <td className="py-2 text-right">
                          {v._id && !String(v._id).startsWith('vit-d') && (
                            <button onClick={() => deleteVital(v._id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete reading">
                              <FiTrash2 />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== PROBLEMS ===== */}
      {activeTab === 'problems' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FiAlertCircle className="text-amber-500" /> Problem List
            </h3>
            <button onClick={() => openProblemModal()} className="btn-primary flex items-center gap-2 text-sm">
              <FiPlus /> Add Problem
            </button>
          </div>

          {(problems || []).length === 0 ? (
            <div className="card text-center py-12 text-gray-400">No chronic conditions recorded.</div>
          ) : (
            <div className="space-y-3">
              {(problems || []).map((p) => {
                const st = PROBLEM_STATUS[p.status] || PROBLEM_STATUS.active;
                return (
                  <div key={p._id} className="card flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        {p.icd10 && <span className="text-[11px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.icd10}</span>}
                        <span className={`text-[11px] border rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {p.onsetDate ? `Since ${new Date(p.onsetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : 'Onset unknown'}
                        {p.notes ? ` • ${p.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openProblemModal(p)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium">Edit</button>
                      <button onClick={() => deleteProblem(p._id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete problem"><FiTrash2 /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== VISIT HISTORY ===== */}
      {activeTab === 'history' && (
        <div className="card animate-fade-in">
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <FiClock className="text-indigo-500" /> Complete Visit History
          </h3>
          {timelineEvents.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No visit history yet</p>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-200 via-purple-200 to-emerald-200" />
              <div className="space-y-4">
                {timelineEvents.map((event, idx) => {
                  const typeConfig = {
                    appointment: { border: 'border-blue-200', bgLight: 'bg-blue-50', icon: '📋' },
                    prescription: { border: 'border-purple-200', bgLight: 'bg-purple-50', icon: '💊' },
                    billing: { border: 'border-emerald-200', bgLight: 'bg-emerald-50', icon: '💰' },
                    labtest: { border: 'border-rose-200', bgLight: 'bg-rose-50', icon: '🔬' },
                    checkup: { border: 'border-amber-200', bgLight: 'bg-amber-50', icon: '🩺' }
                  };
                  const cfg = typeConfig[event.type] || typeConfig.appointment;
                  return (
                    <div key={idx} className="flex gap-4 animate-slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl ${cfg.bgLight} border ${cfg.border} flex items-center justify-center text-base`}>
                          {cfg.icon}
                        </div>
                      </div>
                      <div className={`flex-1 p-4 rounded-xl border ${cfg.border} ${cfg.bgLight} transition-all hover:shadow-sm`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
                            {event.description && <p className="text-xs text-gray-600 mt-0.5">{event.description}</p>}
                          </div>
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">{event.date}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== APPOINTMENTS ===== */}
      {activeTab === 'appointments' && (
        <div className="space-y-3 animate-fade-in">
          {(appointments || []).length === 0 ? (
            <div className="card text-center py-10 text-gray-400">No appointments found</div>
          ) : (
            (appointments || []).map((apt) => (
              <div key={apt._id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    #{apt.tokenNumber}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{apt.type || 'Consultation'}</p>
                    <p className="text-sm text-gray-500">{new Date(apt.date).toLocaleDateString('en-IN')} • {apt.timeSlot}</p>
                  </div>
                </div>
                <span className={`badge ${apt.status === 'completed' ? 'badge-green' : apt.status === 'in-progress' ? 'badge-blue' : 'badge-amber'}`}>
                  {apt.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== PRESCRIPTIONS ===== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-3 animate-fade-in">
          {(prescriptions || []).length === 0 ? (
            <div className="card text-center py-10 text-gray-400">No prescriptions found</div>
          ) : (
            (prescriptions || []).map((rx) => (
              <div key={rx._id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">
                    {rx.diagnosis || 'Prescription'} — {rx.medicines?.length || 0} medicines
                  </p>
                  <span className="text-xs text-gray-400">{new Date(rx.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                {rx.medicines?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rx.medicines.slice(0, 5).map((m, i) => (
                      <span key={i} className="badge badge-purple">{m.name} {m.strength || ''}</span>
                    ))}
                    {rx.medicines.length > 5 && <span className="badge badge-blue">+{rx.medicines.length - 5} more</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== LAB TESTS ===== */}
      {activeTab === 'labtests' && (
        <div className="space-y-3 animate-fade-in">
          {labTests.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">No lab tests found</div>
          ) : (
            labTests.map((lt) => (
              <div key={lt._id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{lt.name}</p>
                  <p className="text-sm text-gray-500">{lt.category || '—'} • {new Date(lt.createdAt).toLocaleDateString('en-IN')}</p>
                  {lt.resultSummary && <p className="text-xs text-emerald-600 mt-1">{lt.resultSummary}</p>}
                </div>
                <span className={`badge ${lt.status === 'reported' ? 'badge-green' : lt.status === 'ordered' ? 'badge-blue' : 'badge-amber'}`}>
                  {lt.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== DOCUMENTS ===== */}
      {activeTab === 'documents' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FiUploadCloud className="text-blue-500" /> Documents & Reports
            </h3>
            <button onClick={() => setShowDocModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <FiPlus /> Add Document
            </button>
          </div>

          {(documents || []).length === 0 ? (
            <div className="card text-center py-12 text-gray-400">No documents uploaded for this patient.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(documents || []).map((d) => (
                <div key={d._id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <FiFileText />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{d.name}</p>
                      <p className="text-xs text-gray-500">{(d.category || 'other').replace('-', ' ')} • {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-IN') : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" aria-label="Open document"><FiExternalLink /></a>
                    <button onClick={() => deleteDoc(d._id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete document"><FiTrash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== BILLING ===== */}
      {activeTab === 'billing' && (
        <div className="space-y-3 animate-fade-in">
          {(billings || []).length === 0 ? (
            <div className="card text-center py-10 text-gray-400">No billing records found</div>
          ) : (
            (billings || []).map((bill) => (
              <div key={bill._id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Invoice #{bill.invoiceNumber || bill.invoiceNo || bill._id?.slice(-6)}</p>
                  <p className="text-sm text-gray-500">{new Date(bill.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{(bill.totalAmount || 0).toLocaleString('en-IN')}</p>
                  <span className={`badge ${(bill.status || bill.paymentStatus) === 'paid' ? 'badge-green' : 'badge-red'}`}>{bill.status || bill.paymentStatus}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== VITALS MODAL ===== */}
      {showVitalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Record Vitals</h2>
              <button onClick={() => setShowVitalModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close"><FiX className="text-xl" /></button>
            </div>
            <form onSubmit={submitVital} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="input-field" value={vitalForm.recordedAt} onChange={(e) => setVitalForm({ ...vitalForm, recordedAt: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Systolic (mmHg)</label>
                  <input type="number" className="input-field" placeholder="120" value={vitalForm.systolic} onChange={(e) => setVitalForm({ ...vitalForm, systolic: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic (mmHg)</label>
                  <input type="number" className="input-field" placeholder="80" value={vitalForm.diastolic} onChange={(e) => setVitalForm({ ...vitalForm, diastolic: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pulse (bpm)</label>
                  <input type="number" className="input-field" placeholder="72" value={vitalForm.pulse} onChange={(e) => setVitalForm({ ...vitalForm, pulse: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SpO₂ (%)</label>
                  <input type="number" className="input-field" placeholder="98" value={vitalForm.spo2} onChange={(e) => setVitalForm({ ...vitalForm, spo2: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" className="input-field" placeholder="70" value={vitalForm.weight} onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" step="0.1" className="input-field" placeholder="170" value={vitalForm.height} onChange={(e) => setVitalForm({ ...vitalForm, height: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Sugar (mg/dL)</label>
                  <input type="number" className="input-field" placeholder="100" value={vitalForm.bloodSugar} onChange={(e) => setVitalForm({ ...vitalForm, bloodSugar: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sugar Type</label>
                  <select className="input-field" value={vitalForm.bloodSugarType} onChange={(e) => setVitalForm({ ...vitalForm, bloodSugarType: e.target.value })}>
                    <option value="fasting">Fasting</option>
                    <option value="post-prandial">Post-prandial</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                  <input type="number" step="0.1" className="input-field" placeholder="98.6" value={vitalForm.temperature} onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="input-field" placeholder="Optional" value={vitalForm.notes} onChange={(e) => setVitalForm({ ...vitalForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowVitalModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingVital} className="btn-primary flex-1">{savingVital ? 'Saving...' : 'Save Vitals'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PROBLEM MODAL ===== */}
      {showProblemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editingProblemId ? 'Edit Problem' : 'Add Problem'}</h2>
              <button onClick={() => setShowProblemModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close"><FiX className="text-xl" /></button>
            </div>
            <form onSubmit={submitProblem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
                <input className="input-field" placeholder="e.g., Type 2 Diabetes Mellitus" value={problemForm.name} onChange={(e) => setProblemForm({ ...problemForm, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ICD-10</label>
                  <input className="input-field" placeholder="E11.9" value={problemForm.icd10} onChange={(e) => setProblemForm({ ...problemForm, icd10: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="input-field" value={problemForm.status} onChange={(e) => setProblemForm({ ...problemForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="controlled">Controlled</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onset Date</label>
                <input type="date" className="input-field" value={problemForm.onsetDate} onChange={(e) => setProblemForm({ ...problemForm, onsetDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="input-field" placeholder="Optional" value={problemForm.notes} onChange={(e) => setProblemForm({ ...problemForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProblemModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingProblem} className="btn-primary flex-1">{savingProblem ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DOCUMENT MODAL ===== */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Add Document</h2>
              <button onClick={() => setShowDocModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close"><FiX className="text-xl" /></button>
            </div>
            <form onSubmit={submitDoc} className="space-y-4">
              <FileUpload
                label="Upload report / scan (PDF or image)"
                onUpload={(url) => setDocForm((f) => ({ ...f, url, fileType: url?.split('.').pop() }))}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                <input className="input-field" placeholder="e.g., Lipid Profile - May 2025" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="input-field" value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}>
                  {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDocModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingDoc} className="btn-primary flex-1">{savingDoc ? 'Saving...' : 'Attach Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
