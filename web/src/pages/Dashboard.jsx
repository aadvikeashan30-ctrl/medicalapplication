import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiCalendar, FiTrendingUp, FiClock,
  FiAlertCircle, FiUserPlus, FiActivity, FiDollarSign, FiRefreshCw,
  FiArrowUpRight, FiCheckCircle, FiArrowUp, FiArrowDown
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
import AnimatedCounter from '../components/AnimatedCounter';
import ProfitLossWidget from '../components/ProfitLossWidget';
import TodayScheduleWidget from '../components/TodayScheduleWidget';

const greetingForHour = (h) => (h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');

const statusColors = {
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'in-progress': 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  scheduled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  confirmed: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

export default function Dashboard() {
  const user = getUser();
  const [greeting, setGreeting] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => setGreeting(greetingForHour(new Date().getHours())), []);

  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApi('/dashboard/stats');
  const { data: queue, loading: queueLoading, refetch: refetchQueue } = useApi('/appointments/queue/today');
  const { data: analytics } = useApi('/dashboard/analytics');
  const { data: revenue } = useApi('/billing/revenue/summary');

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
      toast.success('Patient called');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const completeAppt = async (id) => {
    try {
      await api.put(`/appointments/${id}`, { status: 'completed' });
      refetchQueue();
      refetchStats();
      toast.success('Appointment completed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const statCards = [
    {
      icon: FiUsers,
      iconBg: 'bg-primary-50 dark:bg-primary-900/20',
      iconColor: 'text-primary-600 dark:text-primary-400',
      label: 'Total Patients',
      value: stats?.totalPatients ?? 0,
      sub: stats?.newPatientsThisMonth ? `+${stats.newPatientsThisMonth} this month` : null,
      subIcon: FiArrowUp,
      subColor: 'text-emerald-600'
    },
    {
      icon: FiCalendar,
      iconBg: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      label: "Today's Appointments",
      value: stats?.todayAppointments ?? 0,
      sub: stats?.todayCompleted ? `${stats.todayCompleted} completed` : null,
      subIcon: FiCheckCircle,
      subColor: 'text-emerald-600'
    },
    {
      icon: FaRupeeSign,
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Monthly Revenue',
      value: stats?.monthRevenue ?? 0,
      isRevenue: true,
      sub: revenue?.today ? `₹${revenue.today.toLocaleString('en-IN')} today` : null,
      subIcon: FiTrendingUp,
      subColor: 'text-emerald-600'
    },
    {
      icon: FiAlertCircle,
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Pending Payments',
      value: stats?.pendingPayments ?? 0,
      sub: 'Requires follow-up',
      subIcon: FiClock,
      subColor: 'text-amber-600'
    }
  ];

  return (
    <div className="animate-fade-up space-y-6">
      {/* Welcome Section */}
      <WelcomeHero greeting={greeting} doctorName={user.name || 'Doctor'} stats={stats} />

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { refetchStats(); refetchQueue(); toast.success('Dashboard refreshed'); }}
          className="btn-ghost text-sm !py-2 !px-3"
        >
          <FiRefreshCw className="text-sm" /> Refresh
        </button>
        <Link to="/patients" className="btn-primary text-sm !py-2 !px-4">
          <FiUserPlus className="text-sm" /> New Patient
        </Link>
        <button
          onClick={sendReminders}
          disabled={sendingReminders}
          className="btn-success text-sm !py-2 !px-4"
        >
          <FaWhatsapp className="text-sm" />
          {sendingReminders ? 'Sending...' : 'Send Reminders'}
        </button>
      </div>

      {/* Error State */}
      {statsError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm flex items-center gap-2">
          <FiAlertCircle /> {statsError}
        </div>
      )}

      {/* Stat Cards */}
      {statsLoading ? (
        <Loader label="Loading dashboard..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((c, idx) => (
            <div
              key={c.label}
              className="stat-card animate-fade-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                  <c.icon className={`text-lg ${c.iconColor}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {c.isRevenue ? (
                    <>₹<AnimatedCounter end={Number(c.value || 0)} /></>
                  ) : (
                    <AnimatedCounter end={c.value} />
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
              </div>
              {c.sub && (
                <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${c.subColor}`}>
                  <c.subIcon className="text-[10px]" />
                  <span>{c.sub}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Queue - Main */}
        <div className="lg:col-span-2 card-flat">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiClock className="text-primary-500" />
              Live Queue
              {queue && queue.length > 0 && (
                <span className="badge badge-primary">{queue.length} waiting</span>
              )}
            </h3>
            <Link to="/appointments" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
              View All <FiArrowUpRight className="text-xs" />
            </Link>
          </div>

          {queueLoading ? (
            <Loader label="Loading queue..." />
          ) : !queue || queue.length === 0 ? (
            <EmptyState
              icon={FiCalendar}
              title="No patients in queue"
              message="Appointments for today will show here as patients arrive."
              action={<Link to="/appointments" className="btn-primary text-sm">Book Appointment</Link>}
            />
          ) : (
            <div className="space-y-2">
              {queue.map((apt, idx) => (
                <div
                  key={apt._id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 animate-slide-in group ${
                    apt.status === 'in-progress'
                      ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      apt.status === 'completed'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : apt.status === 'in-progress'
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {apt.status === 'completed' ? <FiCheckCircle className="text-sm" /> : `#${apt.tokenNumber}`}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{apt.patientId?.name || 'Patient'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{apt.timeSlot} · {apt.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${statusColors[apt.status] || 'badge-info'}`}>
                      {apt.status === 'in-progress' ? 'In Progress' : apt.status?.charAt(0).toUpperCase() + apt.status?.slice(1)}
                    </span>
                    {apt.status === 'scheduled' && (
                      <button
                        onClick={() => startAppt(apt._id)}
                        className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2.5 py-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Call In
                      </button>
                    )}
                    {apt.status === 'in-progress' && (
                      <button
                        onClick={() => completeAppt(apt._id)}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card-flat">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link to="/patients" className="quick-action-btn">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <FiUserPlus className="text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Add Patient</span>
              </Link>
              <Link to="/appointments" className="quick-action-btn">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <FiCalendar className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Book Appt</span>
              </Link>
              <Link to="/prescriptions" className="quick-action-btn">
                <div className="w-9 h-9 rounded-xl bg-medical-50 dark:bg-medical-900/20 flex items-center justify-center">
                  <FiActivity className="text-medical-600 dark:text-medical-400" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Prescribe</span>
              </Link>
              <Link to="/billing" className="quick-action-btn">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <FiDollarSign className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Create Bill</span>
              </Link>
            </div>
          </div>

          {/* Revenue Summary */}
          {revenue && (
            <div className="card-flat">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiDollarSign className="text-emerald-500" /> Revenue
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Today</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">₹{(revenue.today || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">This Week</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">₹{(revenue.week || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">This Month</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">₹{(revenue.month || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All Time</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">₹{(revenue.total || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart & P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-flat">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-primary-500" /> Revenue Trend
          </h3>
          <RevenueChart monthly={analytics?.monthlyRevenue || []} />
        </div>
        <ProfitLossWidget />
      </div>

      {/* Today's Schedule */}
      <TodayScheduleWidget />
    </div>
  );
}
