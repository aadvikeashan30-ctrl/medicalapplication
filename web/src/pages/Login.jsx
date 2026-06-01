import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaStethoscope, FaHeartbeat, FaUserMd, FaCapsules } from 'react-icons/fa';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiActivity, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { setSession } from '../utils/auth';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setSession(data.token, data.user);
      toast.success(`Welcome back, Dr. ${data.user.name}!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setAnimStep(s => (s + 1) % 4), 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: FiActivity, text: 'AI-Powered Diagnosis & Prescriptions', color: 'text-emerald-300' },
    { icon: FiShield, text: 'HIPAA-Ready Patient Data Security', color: 'text-blue-300' },
    { icon: FiZap, text: 'WhatsApp Reminders & Voice Notes', color: 'text-amber-300' },
    { icon: FaHeartbeat, text: 'Real-time Analytics & Reports', color: 'text-pink-300' }
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 floating-orb" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/15 rounded-full translate-y-1/2 -translate-x-1/2 floating-orb" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-cyan-400/10 rounded-full floating-orb" style={{ animationDelay: '4s' }} />

        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/10 rotate-3d-hover">
              <FaHeartbeat className="text-white text-xl" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">DocClinic Pro</span>
              <p className="text-[10px] text-blue-300 tracking-widest uppercase">AI-Powered Healthcare</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            The Future of<br />Clinic Management<br />
            <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Is Here</span>
          </h2>
          <p className="text-blue-200 text-lg max-w-md leading-relaxed">
            AI diagnosis, digital prescriptions, WhatsApp integration, voice notes — everything a modern doctor needs in one platform.
          </p>
        </div>

        {/* Animated feature carousel */}
        <div className="relative z-10 space-y-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                animStep === idx ? 'bg-white/15 backdrop-blur-sm scale-105 shadow-lg' : 'opacity-70'
              }`}
            >
              <div className={`w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center ${animStep === idx ? 'animate-pulse' : ''}`}>
                <feat.icon className={`${feat.color}`} />
              </div>
              <span className="text-blue-100 text-sm font-medium">{feat.text}</span>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-4 pt-4 border-t border-white/10">
            <div className="flex -space-x-2">
              {[FaUserMd, FaCapsules, FaStethoscope].map((Icon, i) => (
                <div key={i} className="w-8 h-8 bg-white/20 backdrop-blur rounded-full border-2 border-white/30 flex items-center justify-center">
                  <Icon className="text-white text-xs" />
                </div>
              ))}
            </div>
            <span className="text-blue-200 text-sm">Trusted by <strong className="text-white">1,000+</strong> doctors across India</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <FaHeartbeat className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">DocClinic Pro</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
          <p className="text-gray-500 mb-8">Sign in to manage your clinic</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-11"
                  placeholder="doctor@clinic.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-11 pr-11"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-center text-base">
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Demo Credentials</p>
            <p className="text-xs text-blue-600 dark:text-blue-300 font-mono">demo@docclinic.com / demo1234</p>
          </div>

          <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Start Free Trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
