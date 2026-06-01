import React from 'react';
import { FiActivity, FiTrendingUp, FiShield } from 'react-icons/fi';
import FloatingOrb from './FloatingOrb';
import MedicalDNA from './MedicalDNA';

export default function WelcomeHero({ greeting, doctorName, stats }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-2xl shadow-blue-900/20">
      {/* Decorative 3D orbs */}
      <FloatingOrb size={300} color="purple" top="-80px" right="-60px" opacity={0.2} delay={0} />
      <FloatingOrb size={200} color="cyan" bottom="-40px" left="-30px" opacity={0.15} delay={1} />
      <FloatingOrb size={150} color="blue" top="40%" left="60%" opacity={0.1} delay={2} />

      {/* DNA helix decoration */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block">
        <MedicalDNA />
      </div>

      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="dot-pattern w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">{greeting}</p>
            <h1 className="text-3xl lg:text-4xl font-bold">
              Dr. {doctorName}
            </h1>
            <p className="text-blue-100 mt-2 max-w-lg">
              Your clinic is running smoothly. Here's your daily overview with real-time insights.
            </p>
          </div>

          {/* Quick 3D stat pills */}
          <div className="flex flex-wrap gap-3">
            <div className="glass-pill">
              <FiActivity className="text-emerald-300" />
              <span>{stats?.todayAppointments || 0} today</span>
            </div>
            <div className="glass-pill">
              <FiTrendingUp className="text-yellow-300" />
              <span>+{stats?.newPatientsThisMonth || 0} new</span>
            </div>
            <div className="glass-pill">
              <FiShield className="text-green-300" />
              <span>All systems OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
