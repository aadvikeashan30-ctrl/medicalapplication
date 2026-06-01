import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiCalendar, FiTrendingUp, FiClock,
  FiAlertCircle, FiUserPlus, FiActivity, FiDollarSign, FiRefreshCw,
  FiArrowUpRight, FiCheckCircle
} from 'react-icons/fi';
import { FaWhatsapp, FaRupeeSign } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import RevenueChart from '../components/RevenueChart';
import WelcomeHero from '../components/WelcomeHero';
import ThreeDCard from '../components/ThreeDCard';
import AnimatedCounter from '../components/AnimatedCounter';
import HealthMetricsWidget from '../components/HealthMetricsWidget';
import AppointmentCalendar from '../components/AppointmentCalendar';
import PatientTimeline from '../components/PatientTimeline';
import ProfitLossWidget from '../components/ProfitLossWidget';
import TodayScheduleWidget from '../components/TodayScheduleWidget';

const greetingForHour = (h) => (h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');

const statusColors = {
  completed: 'bg-emerald-100 text-emerald-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  scheduled: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-red-100 text-red-700'
};

// Demo timeline events
const demoTimeline = [
  { type: 'appointment', title: 'Consultation - Ravi Kumar', description: 'Follow-up for hypertension management', date: 'Today, 10:30 AM', doctor: 'You' },
  { type: 'prescription', title: 'Prescription Issued', description: 'Amlodipine 5mg, Metformin 500mg for Priya S.', date: 'Today, 9:15 AM', doctor: 'You' },
  { type: 'billing', title: 'Payment Received - ₹2,500', description: 'Consultation + Lab tests from Amit Patel', date: 'Yesterday, 5:30 PM' },
  { type: 'labtest', title: 'Lab Results Available', description: 'CBC & Lipid Profile for Sunita K.', date: 'Yesterday, 3:00 PM' },
  { type: 'checkup', title: 'Health Checkup Complete', description: 'Annual physical exam for Mohan R.', date: '2 days ago', doctor: 'You' }
];

export default function Dashboard() {
  const user = getUser();
  const [greeting, setGreeting] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => setGreeting(greetingForHour(new Date().getHours())), []);

  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApi('/dashboard/stats');
  const { data: queue, loading: queueLoading, refetch: refetchQueue } = useApi('/appointments/queue/today');
  const { data: analytics } = useApi('/dashboard/analytics');

  const formatINR = (n) => `₹${(Number(n || 0)).toLocaleString('en-IN')}`;

  const sendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data } = await api.post('/whatsapp/run-reminders');
      toast.success(`Sent ${data.sent}/${data.processed} reminders`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const startAppt = async (id) => {
    try {
      await api.put(`/appointments/${id}`, { status: 'in-progress' });
      refetchQueue();
      refetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const cards = [
    {
      icon: FiUsers,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      label: 'Total Patients',
      value: stats?.totalPatients ?? 0,
      badge: stats ? `+${stats.newPatientsThisMonth} new` : null,
      badgeClass: 'text-emerald-600 bg-emerald-50'
    },
    {
      icon: FiCalendar,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      label: "Today's Appointments",
      value: stats?.todayAppointments ?? 0,
      badge: stats ? `${stats.todayCompleted} done` : null,
      badgeClass: 'text-blue-600 bg-blue-50'
    },
    {
      icon: FaRupeeSign,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      label: 'This Month Revenue',
      value: stats ? stats.monthRevenue : 0,
      isRevenue: true,
      badge: '+12%',
      badgeClass: 'text-emerald-600 bg-emerald-50'
    },
    {
      icon: FiAlertCircle,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
      label: 'Unpaid Bills',
      value: stats?.pendingPayments ?? 0,
      badge: 'Pending',
      badgeClass: 'text-orange-600 bg-orange-50'
    }
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* 3D Welcome Hero */}
      <WelcomeHero greeting={greeting} doctorName={user.name || 'Doctor'} stats={stats} />

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { refetchStats(); refetchQueue(); }}
            className="btn-secondary flex items-center gap-2 text-sm !py-2 !px-4"
            aria-label="Refresh dashboard"
          >
            <FiRefreshCw className="text-base" /> Refresh
          </button>
          <Link to="/patients" className="btn-primary flex items-center gap-2 text-sm !py-2 !px-4">
            <FiUserPlus className="text-base" /> New Patient
          </Link>
          <button
            onClick={sendReminders}
            disabled={sendingReminders}
            className="btn-success flex items-center gap-2 text-sm !py-2 !px-4"
          >
            <FaWhatsapp className="text-base" />
            {sendingReminders ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {statsError && (
        <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
          Could not load stats: {statsError}
        </div>
      )}

      {/* 3D Stat Cards */}
      {statsLoading ? (
        <Loader label="Loading dashboard..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c) => (
            <ThreeDCard key={c.label} intensity={12}>
              <div className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${c.bgGradient} border border-white/60 shadow-lg`}>
                {/* Decorative circle */}
                <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${c.gradient} opacity-10`} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-lg`}>
                      <c.icon className="text-white text-xl" />
                    </div>
                    {c.badge && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badgeClass} flex items-center gap-1`}>
                        {c.isRevenue && <FiTrendingUp className="text-[10px]" />}
                        {c.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {c.isRevenue ? (
                      <><span className="text-lg">₹</span><AnimatedCounter end={Number(c.value || 0)} /></>
                    ) : (
                      <AnimatedCounter end={c.value} />
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 font-medium">{c.label}</p>
                </div>
              </div>
            </ThreeDCard>
          ))}
        </div>
      )}

      {/* Health Metrics Widget */}
      <HealthMetricsWidget />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Queue */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiClock className="text-blue-600" />
              Today's Patient Queue
            </h3>
            <Link to="/appointments" className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1 transition-colors">
              View All <FiArrowUpRight />
            </Link>
          </div>

          {queueLoading ? (
            <Loader label="Loading queue..." />
          ) : !queue || queue.length === 0 ? (
            <EmptyState
              icon={FiCalendar}
              title="No appointments today"
              message="Once patients book for today, they'll appear here."
              action={<Link to="/appointments" className="btn-primary text-sm">Book Appointment</Link>}
            />
          ) : (
            <div className="space-y-3">
              {queue.map((apt, idx) => (
                <div
                  key={apt._id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md group animate-slide-in ${
                    apt.status === 'in-progress'
                      ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                      : 'border-gray-100 hover:border-blue-100'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                        apt.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : apt.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {apt.status === 'completed' ? <FiCheckCircle /> : `#${apt.tokenNumber}`}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{apt.patientId?.name || 'Patient'}</p>
                      <p className="text-sm text-gray-500">{apt.timeSlot} • {apt.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status] || ''}`}>
                      {apt.status === 'in-progress' ? 'In Progress' : apt.status?.charAt(0).toUpperCase() + apt.status?.slice(1)}
                    </span>
                    {apt.status === 'scheduled' && (
                      <button
                        onClick={() => startAppt(apt._id)}
                        className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all opacity-0 group-hover:opacity-100"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Calendar widget */}
          <AppointmentCalendar />

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/patients" className="quick-action-btn group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                  <FiUserPlus className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Add Patient</span>
              </Link>
              <Link to="/appointments" className="quick-action-btn group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                  <FiCalendar className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Book Appt</span>
              </Link>
              <Link to="/prescriptions" className="quick-action-btn group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                  <FiActivity className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Prescribe</span>
              </Link>
              <Link to="/billing" className="quick-action-btn group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                  <FiDollarSign className="text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Create Bill</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Timeline row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-emerald-600" /> Revenue Trend
          </h3>
          <RevenueChart monthly={analytics?.monthlyRevenue || []} />
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiClock className="text-purple-600" /> Recent Activity
          </h3>
          <div className="max-h-72 overflow-y-auto custom-scroll">
            <PatientTimeline events={demoTimeline} />
          </div>
        </div>
      </div>

      {/* P&L + Schedule Widget row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProfitLossWidget />
        <div className="lg:col-span-2">
          <TodayScheduleWidget />
        </div>
      </div>
    </div>
  );
}
