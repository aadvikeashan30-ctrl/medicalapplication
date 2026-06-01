import React from 'react';
import { FiCalendar, FiTrendingUp, FiUsers, FiClock } from 'react-icons/fi';

export default function WelcomeHero({ greeting, doctorName, stats }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 lg:p-8 text-white">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/10 rounded-full translate-y-1/2 -translate-x-1/4" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-primary-200 text-sm font-medium">{today}</p>
          <h1 className="text-2xl lg:text-3xl font-bold mt-1">
            {greeting}, Dr. {doctorName}
          </h1>
          <p className="text-primary-200 mt-1.5 text-sm">
            Here's what's happening in your clinic today.
          </p>
        </div>

        {/* Compact stat indicators */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-2 border border-white/10">
            <FiCalendar className="text-accent-300 text-sm" />
            <span className="text-sm font-medium">{stats?.todayAppointments || 0} appointments</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-2 border border-white/10">
            <FiUsers className="text-medical-300 text-sm" />
            <span className="text-sm font-medium">{stats?.totalPatients || 0} patients</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-2 border border-white/10">
            <FiTrendingUp className="text-emerald-300 text-sm" />
            <span className="text-sm font-medium">₹{(stats?.monthRevenue || 0).toLocaleString('en-IN')} this month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
