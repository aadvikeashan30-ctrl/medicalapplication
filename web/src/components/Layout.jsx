import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome, FiUsers, FiCalendar, FiFileText, FiDollarSign,
  FiSettings, FiLogOut, FiMenu, FiX, FiSearch, FiUser,
  FiMoon, FiSun, FiChevronDown, FiPackage, FiActivity,
  FiBarChart2, FiCreditCard, FiBell, FiGlobe
} from 'react-icons/fi';
import { FaUserMd, FaStethoscope, FaHeartbeat } from 'react-icons/fa';
import { clearSession, getUser } from '../utils/auth';
import { useDarkMode } from '../hooks/useDarkMode';
import AIChat from './AIChat';
import NotificationCenter from './NotificationCenter';

const navItems = [
  { path: '/', icon: FiHome, label: 'Dashboard', end: true },
  { path: '/patients', icon: FiUsers, label: 'Patients' },
  { path: '/appointments', icon: FiCalendar, label: 'Appointments' },
  { path: '/prescriptions', icon: FiFileText, label: 'Prescriptions' },
  { path: '/medicines', icon: FiPackage, label: 'Medicines' },
  { path: '/lab-tests', icon: FiActivity, label: 'Lab Tests' },
  { path: '/billing', icon: FiDollarSign, label: 'Billing' },
  { path: '/expenses', icon: FiCreditCard, label: 'Expenses' },
  { path: '/follow-ups', icon: FiBell, label: 'Follow-ups' },
  { path: '/patient-portal', icon: FiGlobe, label: 'Patient Portal' },
  { path: '/reports', icon: FiBarChart2, label: 'Reports' },
  { path: '/profile', icon: FiUser, label: 'My Profile' },
  { path: '/settings', icon: FiSettings, label: 'Settings' }
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [darkMode, toggleDark] = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/patients?search=${encodeURIComponent(search.trim())}`);
  };

  const getPageTitle = () => {
    const item = navItems.find(n => n.path === location.pathname);
    return item?.label || 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Glassmorphism Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out
        sidebar-glass
        ${sidebarOpen ? 'w-72' : 'w-20'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 rotate-3d-hover">
            <FaHeartbeat className="text-white text-lg" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                DocClinic
              </h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Pro Healthcare</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scroll">
          {sidebarOpen && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">Main Menu</p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
              onClick={() => setMobileOpen(false)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="text-xl flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
              {sidebarOpen && item.path === '/' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card at bottom */}
        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/50 dark:to-gray-700/50 ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <FaUserMd className="text-white text-sm" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Dr. {user.name || 'Doctor'}
                </p>
                <p className="text-[11px] text-gray-500 truncate">{user.specialty || 'General'}</p>
              </div>
            )}
            {sidebarOpen && (
              <FiChevronDown className="text-gray-400 text-sm" />
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 mt-3 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-medium text-sm group"
            aria-label="Logout"
          >
            <FiLogOut className="text-lg group-hover:translate-x-0.5 transition-transform" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <header className="header-glass px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Open menu"
            >
              <FiMenu className="text-xl" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <FiX className="text-lg text-gray-600" /> : <FiMenu className="text-lg text-gray-600" />}
            </button>

            {/* Page title */}
            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{getPageTitle()}</h2>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative hidden lg:block">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients, appointments..."
                className="pl-10 pr-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl w-80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none text-sm backdrop-blur-sm transition-all focus:w-96"
                aria-label="Search"
              />
            </form>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <FiSun className="text-xl text-yellow-500" /> : <FiMoon className="text-xl text-gray-600" />}
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Clinic badge */}
            <div className="hidden sm:flex items-center gap-3 pl-3 ml-2 border-l border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.clinicName || 'My Clinic'}</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {user.plan === 'free' ? 'Free Trial Active' : `${user.plan} Plan`}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 custom-scroll">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant - floating on all pages */}
      <AIChat />
    </div>
  );
}
