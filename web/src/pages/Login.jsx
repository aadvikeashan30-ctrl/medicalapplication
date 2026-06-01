import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiUsers, FiCalendar, FiBarChart2 } from 'react-icons/fi';
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
      // If backend is unreachable and using demo credentials, do client-side demo login
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
        toast.error(error.response?.data?.message || 'Login failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FiUsers, title: '10,000+', desc: 'Active Doctors' },
    { icon: FiCalendar, title: '50L+', desc: 'Appointments Managed' },
    { icon: FiBarChart2, title: '₹200Cr+', desc: 'Revenue Processed' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary-900 via-primary-800 to-surface-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/8 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
              <span className="text-white font-bold text-lg">DC</span>
            </div>
            <div>
              <span className="text-xl font-bold text-white">DocClinic Pro</span>
              <p className="text-[10px] text-primary-300 tracking-widest uppercase">Healthcare Platform</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Modern Clinic<br />Management for<br />
            <span className="text-accent-400">Indian Doctors</span>
          </h2>
          <p className="text-primary-200 text-base max-w-sm leading-relaxed">
            Manage patients, appointments, billing, prescriptions, and grow your practice — all in one place.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <f.icon className="text-primary-300 text-lg mx-auto mb-2" />
                <p className="text-white font-bold text-lg">{f.title}</p>
                <p className="text-primary-300 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <FiShield className="text-accent-400" />
            <span className="text-primary-200 text-sm">HIPAA-ready · GST compliant · Bank-grade encryption</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-surface-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">DC</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">DocClinic Pro</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Sign in to your clinic dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-10"
                  placeholder="doctor@clinic.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3.5 bg-gray-50 dark:bg-surface-800 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Demo Access</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">demo@docclinic.com / demo1234</p>
          </div>

          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            New to DocClinic?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
              Start Free Trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
