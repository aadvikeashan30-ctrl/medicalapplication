import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiX, FiStar, FiZap, FiShield, FiUsers, FiActivity } from 'react-icons/fi';
import { FaHeartbeat, FaWhatsapp, FaRobot } from 'react-icons/fa';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: { monthly: 499, quarterly: 1299, half: 2499, yearly: 4499 },
    desc: 'For solo practitioners',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    features: [
      { text: 'Unlimited Patients', included: true },
      { text: 'Appointment Management', included: true },
      { text: 'Digital Prescriptions', included: true },
      { text: 'Billing & Invoices', included: true },
      { text: 'Patient Portal (booking link)', included: true },
      { text: 'WhatsApp Reminders', included: false },
      { text: 'AI Clinical Assistant', included: false },
      { text: 'Voice-to-SOAP Notes', included: false },
      { text: 'Expense Tracking', included: false },
      { text: 'Reports & Analytics', included: false },
      { text: 'Multi-staff access', included: false },
      { text: 'Priority Support', included: false }
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 1499, quarterly: 3999, half: 7499, yearly: 13499 },
    desc: 'For growing clinics',
    popular: true,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    features: [
      { text: 'Everything in Basic', included: true },
      { text: 'WhatsApp Reminders', included: true },
      { text: 'AI Clinical Assistant (GPT-4)', included: true },
      { text: 'Voice-to-SOAP Notes', included: true },
      { text: 'AI Symptom Checker (patients)', included: true },
      { text: 'Expense Tracking + P&L', included: true },
      { text: 'Reports & Analytics', included: true },
      { text: 'Follow-up Tracker', included: true },
      { text: 'Lab Test Management', included: true },
      { text: 'Medicine Library', included: true },
      { text: 'Print Templates', included: true },
      { text: 'Email Support', included: true }
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 4999, quarterly: 13499, half: 24999, yearly: 44999 },
    desc: 'For multi-branch hospitals',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Multi-clinic Dashboard', included: true },
      { text: 'Unlimited Staff Accounts', included: true },
      { text: 'Custom Branding (white-label)', included: true },
      { text: 'API Access', included: true },
      { text: 'Teleconsultation (video)', included: true },
      { text: 'Insurance/TPA Module', included: true },
      { text: 'Data Export & Backup', included: true },
      { text: 'Custom Integrations', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: '24/7 Priority Support', included: true },
      { text: 'SLA Guarantee', included: true }
    ]
  }
];

const billingOptions = [
  { value: 'monthly', label: 'Monthly', discount: '' },
  { value: 'quarterly', label: '3 Months', discount: 'Save 13%' },
  { value: 'half', label: '6 Months', discount: 'Save 17%' },
  { value: 'yearly', label: '1 Year', discount: 'Save 25%' }
];

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaHeartbeat className="text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">DocClinic Pro</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/symptom-checker" className="text-sm text-gray-600 hover:text-blue-600 font-medium hidden sm:block">For Patients</Link>
            <Link to="/login" className="btn-primary text-sm !py-2 !px-4">Doctor Login</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 rounded-full px-4 py-1.5 text-xs font-semibold mb-4">
            <FiZap /> Trusted by 1,000+ Doctors
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Pricing</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Choose the plan that fits your clinic. Start free for 30 days, upgrade anytime. No hidden charges.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 rounded-xl p-1.5 gap-1">
            {billingOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBilling(opt.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  billing === opt.value
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
                {opt.discount && <span className="ml-1.5 text-emerald-600 text-xs font-bold">{opt.discount}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map(plan => (
            <div key={plan.id} className={`relative rounded-3xl border-2 p-8 transition-all hover:-translate-y-2 hover:shadow-2xl ${
              plan.popular ? 'border-violet-400 shadow-xl shadow-violet-500/10 scale-[1.02]' : 'border-gray-200 hover:border-blue-200'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <FiStar className="text-yellow-300" /> MOST POPULAR
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg mb-4`}>
                {plan.id === 'basic' && <FiUsers className="text-white text-xl" />}
                {plan.id === 'pro' && <FaRobot className="text-white text-xl" />}
                {plan.id === 'enterprise' && <FiShield className="text-white text-xl" />}
              </div>

              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>

              <div className="mt-6 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">₹{plan.price[billing].toLocaleString('en-IN')}</span>
                  <span className="text-gray-500">/{billing === 'monthly' ? 'mo' : billing === 'quarterly' ? '3mo' : billing === 'half' ? '6mo' : 'yr'}</span>
                </div>
                {billing !== 'monthly' && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    ₹{Math.round(plan.price[billing] / (billing === 'quarterly' ? 3 : billing === 'half' ? 6 : 12)).toLocaleString('en-IN')}/mo effective
                  </p>
                )}
              </div>

              <Link
                to="/register"
                className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                Start Free Trial
              </Link>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <FiCheck className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <FiX className="text-gray-300 flex-shrink-0" />
                    )}
                    <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Trust */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Why Doctors Choose DocClinic Pro</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: FaRobot, title: 'AI-Powered', desc: 'GPT-4 clinical assistant built-in' },
              { icon: FaWhatsapp, title: 'WhatsApp Native', desc: 'Automated reminders & prescription sharing' },
              { icon: FiActivity, title: 'Patient Portal', desc: 'Patients book online, check symptoms via AI' },
              { icon: FiShield, title: 'Data Secure', desc: 'Encrypted, HIPAA-ready infrastructure' }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <item.icon className="text-blue-600 text-2xl mb-3 mx-auto" />
                <h4 className="font-bold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
