import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiX, FiStar, FiZap, FiShield, FiArrowRight, FiPhone } from 'react-icons/fi';

const plans = [
  {
    id: 'basic',
    name: 'Starter',
    price: { monthly: 499, quarterly: 1299, half: 2499, yearly: 4499 },
    desc: 'Solo practitioners starting their digital journey',
    features: [
      { text: 'Unlimited Patients', included: true },
      { text: 'Appointment Scheduling', included: true },
      { text: 'Digital Prescriptions', included: true },
      { text: 'Billing & GST Invoices', included: true },
      { text: 'Patient Portal Link', included: true },
      { text: 'SMS Reminders (50/mo)', included: true },
      { text: 'WhatsApp Integration', included: false },
      { text: 'AI Clinical Assistant', included: false },
      { text: 'Reports & Analytics', included: false },
      { text: 'Multi-staff Access', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Professional',
    price: { monthly: 1499, quarterly: 3999, half: 7499, yearly: 13499 },
    desc: 'Growing clinics that want to maximize efficiency',
    popular: true,
    features: [
      { text: 'Everything in Starter', included: true },
      { text: 'Unlimited WhatsApp Reminders', included: true },
      { text: 'AI Clinical Assistant', included: true },
      { text: 'AI Diagnosis Suggestions', included: true },
      { text: 'Expense Tracking + P&L', included: true },
      { text: 'Advanced Reports', included: true },
      { text: 'Lab Test Management', included: true },
      { text: 'Medicine Library (auto-fill)', included: true },
      { text: 'Follow-up Tracker', included: true },
      { text: 'Custom Print Templates', included: true },
    ]
  },
  {
    id: 'enterprise',
    name: 'Hospital',
    price: { monthly: 4999, quarterly: 13499, half: 24999, yearly: 44999 },
    desc: 'Multi-doctor hospitals & clinic chains',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Unlimited Staff Accounts', included: true },
      { text: 'Multi-branch Dashboard', included: true },
      { text: 'White-label Branding', included: true },
      { text: 'Teleconsultation (Video)', included: true },
      { text: 'Insurance/TPA Module', included: true },
      { text: 'API Access', included: true },
      { text: 'Custom Integrations', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: '99.9% Uptime SLA', included: true },
    ]
  }
];

const billingOptions = [
  { value: 'monthly', label: 'Monthly', discount: '' },
  { value: 'quarterly', label: 'Quarterly', discount: '13% off' },
  { value: 'yearly', label: 'Annual', discount: '25% off' }
];

const testimonials = [
  { name: 'Dr. Rajesh Patel', city: 'Mumbai', text: 'Saved 2 hours daily on paperwork. My staff loves it.', plan: 'Pro' },
  { name: 'Dr. Anita Sharma', city: 'Delhi', text: 'Patient no-shows reduced by 40% with WhatsApp reminders.', plan: 'Pro' },
  { name: 'Apollo Clinic', city: 'Bangalore', text: 'Managing 5 branches from one dashboard changed everything.', plan: 'Hospital' },
];

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950">
      {/* Header */}
      <header className="bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">DC</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">DocClinic Pro</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/home" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 font-medium hidden sm:block">Home</Link>
            <Link to="/login" className="btn-primary text-sm !py-2 !px-4">Sign In</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full px-3.5 py-1.5 text-xs font-semibold mb-4 border border-primary-100 dark:border-primary-800">
            <FiZap className="text-xs" /> 30-Day Free Trial · No Card Required
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Pricing that scales with your practice
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Start free, upgrade when you're ready. Plans designed specifically for Indian clinics & hospitals.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 dark:bg-surface-800 rounded-xl p-1 gap-0.5">
            {billingOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBilling(opt.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  billing === opt.value
                    ? 'bg-white dark:bg-surface-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {opt.label}
                {opt.discount && <span className="ml-1.5 text-accent-600 dark:text-accent-400 text-[11px] font-bold">{opt.discount}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-20">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-7 transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? 'border-primary-300 dark:border-primary-700 shadow-card bg-primary-50/30 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <FiStar className="text-amber-300 text-[10px]" /> RECOMMENDED
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.price[billing].toLocaleString('en-IN')}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/{billing === 'monthly' ? 'mo' : billing === 'quarterly' ? 'qtr' : 'yr'}</span>
                </div>
                {billing !== 'monthly' && (
                  <p className="text-xs text-accent-600 dark:text-accent-400 font-medium mt-1">
                    Save ₹{((plan.price.monthly * (billing === 'quarterly' ? 3 : 12)) - plan.price[billing]).toLocaleString('en-IN')} vs monthly
                  </p>
                )}
              </div>

              <Link
                to="/register"
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all mb-6 ${
                  plan.popular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 text-gray-900 dark:text-white'
                }`}
              >
                Start Free Trial <FiArrowRight className="text-xs" />
              </Link>

              <ul className="space-y-2.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <FiCheck className="text-accent-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <FiX className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="mb-20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Trusted by doctors across India
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="card-flat !p-5">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-3">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.city}</p>
                  </div>
                  <span className="badge badge-primary text-[10px]">{t.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ / Trust */}
        <div className="text-center pb-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><FiShield className="text-accent-500" /> Bank-grade encryption</span>
            <span className="flex items-center gap-1.5"><FiCheck className="text-accent-500" /> GST compliant invoices</span>
            <span className="flex items-center gap-1.5"><FiCheck className="text-accent-500" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><FiPhone className="text-accent-500" /> Indian support team</span>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Need a custom plan for your hospital? <a href="mailto:sales@docclinic.com" className="text-primary-600 font-semibold hover:underline">Contact Sales</a>
          </p>
        </div>
      </div>
    </div>
  );
}
