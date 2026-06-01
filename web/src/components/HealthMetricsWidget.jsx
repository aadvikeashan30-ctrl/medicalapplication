import React from 'react';
import { FiHeart, FiThermometer, FiDroplet, FiWind } from 'react-icons/fi';
import ThreeDCard from './ThreeDCard';

const metrics = [
  {
    icon: FiHeart,
    label: 'Avg Heart Rate',
    value: '72',
    unit: 'bpm',
    trend: '+2%',
    color: 'red',
    gradient: 'from-red-500 to-pink-500',
    bgGradient: 'from-red-50 to-pink-50'
  },
  {
    icon: FiThermometer,
    label: 'Avg Temperature',
    value: '98.4',
    unit: '°F',
    trend: 'Normal',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50'
  },
  {
    icon: FiDroplet,
    label: 'Blood Pressure',
    value: '120/80',
    unit: 'mmHg',
    trend: 'Healthy',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50'
  },
  {
    icon: FiWind,
    label: 'Respiratory',
    value: '16',
    unit: '/min',
    trend: 'Normal',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50'
  }
];

export default function HealthMetricsWidget() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <ThreeDCard key={metric.label} intensity={10} className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${metric.bgGradient} opacity-50`} />
          <div className="relative p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shadow-lg mb-3`}>
              <metric.icon className="text-white text-lg" />
            </div>
            <p className="text-xs text-gray-500 font-medium">{metric.label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
              <span className="text-xs text-gray-400">{metric.unit}</span>
            </div>
            <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {metric.trend}
            </span>
          </div>
        </ThreeDCard>
      ))}
    </div>
  );
}
