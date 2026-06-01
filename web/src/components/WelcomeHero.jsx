import React from 'react';
import { FiCalendar, FiTrendingUp, FiUsers, FiZap } from 'react-icons/fi';

export default function WelcomeHero({ greeting, doctorName, stats }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8 animate-fade-up">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-gradient" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08), rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.12))',
        backgroundSize: '300% 300%'
      }} />

      {/* Border glow */}
      <div className="absolute inset-0 rounded-2xl" style={{ border: '1px solid rgba(99, 102, 241, 0.15)' }} />

      {/* Floating orbs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full animate-orb" style={{ background: 'rgba(99, 102, 241, 0.08)', filter: 'blur(40px)' }} />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full animate-orb" style={{ background: 'rgba(6, 182, 212, 0.06)', filter: 'blur(40px)', animationDelay: '-6s' }} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-indigo-400 text-sm font-medium flex items-center gap-1.5">
            <FiZap className="text-xs" /> {greeting}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Dr. {doctorName}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2.5">
          <div className="glass-pill">
            <FiCalendar className="text-cyan-400 text-xs" />
            <span className="text-sm">{stats?.todayAppointments || 0} today</span>
          </div>
          <div className="glass-pill">
            <FiUsers className="text-purple-400 text-xs" />
            <span className="text-sm">{stats?.totalPatients || 0} patients</span>
          </div>
          <div className="glass-pill">
            <FiTrendingUp className="text-emerald-400 text-xs" />
            <span className="text-sm">₹{((stats?.monthRevenue || 0) / 1000).toFixed(0)}K revenue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
