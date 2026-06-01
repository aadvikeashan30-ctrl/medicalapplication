import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiActivity, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { setSession } from '../utils/auth';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setSession(data.token, data.user);
      toast.success(`Welcome back, Dr. ${data.user.name}!`);
      navigate('/');
    } catch (error) {
      const isNetworkOrServerError = !error.response || error.response.status >= 500;
      const isDemoCredentials = form.email === 'demo@docclinic.com' && form.password === 'demo1234';

      if (isNetworkOrServerError && isDemoCredentials) {
        const demoUser = {
          _id: 'demo-doctor-001', id: 'demo-doctor-001',
          name: 'Demo Doctor', email: 'demo@docclinic.com',
          phone: '9000000000', role: 'doctor', specialty: 'general',
          qualification: 'MBBS, MD', clinicName: 'DocClinic Demo Centre',
          clinicCity: 'Mumbai', consultationFee: 500, plan: 'pro', isActive: true
        };
        setSession('demo-token-' + Date.now(), demoUser);
        toast.success(`Welcome back, Dr. ${demoUser.name}! (Demo Mode)`);
        navigate('/');
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-950 overflow-hidden">
      {/* Left Panel - Animated Gradient Background */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-16">
        {/* Dynamic gradient that follows mouse */}
        <div
          className="absolute inset-0 transition-all duration-[2000ms] ease-out"
          style={{
            background: `
              radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
              radial-gradient(circle at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
              linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%)
            `
          }}
        />

        {/* Floating orbs */}
        <div className="orb orb-indigo w-72 h-72 -top-20 -left-20 animate-orb" />
        <div className="orb orb-purple w-56 h-56 bottom-20 right-10 animate-orb" style={{ animationDelay: '-4s' }} />
        <div className="orb orb-cyan w-40 h-40 top-1/3 right-1/4 animate-orb" style={{ animationDelay: '-8s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center glow-indigo" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <FiActivity className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">DocClinic</h1>
              <p className="text-[11px] text-indigo-300 font-medium tracking-[0.2em] uppercase">Pro Healthcare</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-[1.15] mb-6">
            The Future of
            <br />
            <span className="gradient-text">Clinic Management</span>
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed mb-12 max-w-md">
            AI-powered platform trusted by 10,000+ Indian doctors. Manage patients, billing, prescriptions — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            <div className="glass-pill">
              <FiShield className="text-emerald-400" />
              <span>Bank-grade Security</span>
            </div>
            <div className="glass-pill">
              <FiZap className="text-amber-400" />
              <span>AI Assistant</span>
            </div>
            <div className="glass-pill">
              <FiActivity className="text-cyan-400" />
              <span>GST Compliant</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/5 pt-8">
            <div>
              <p className="text-2xl font-bold text-white">10K+</p>
              <p className="text-xs text-gray-500 mt-0.5">Active Doctors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">50L+</p>
              <p className="text-xs text-gray-500 mt-0.5">Appointments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">₹200Cr</p>
              <p className="text-xs text-gray-500 mt-0.5">Revenue Processed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-50" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <FiActivity className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">DocClinic Pro</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to your clinic dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <div className="relative group">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
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
              <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-11 pr-11"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/20" />
                <span className="text-sm text-gray-500">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <FiArrowRight />
                </span>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl border border-indigo-500/20" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Demo Access</p>
            </div>
            <p className="text-sm text-gray-400 font-mono">demo@docclinic.com / demo1234</p>
          </div>

          <p className="text-center mt-8 text-sm text-gray-500">
            New to DocClinic?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
              Start Free Trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
