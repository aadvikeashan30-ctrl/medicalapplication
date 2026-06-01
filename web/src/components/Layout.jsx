import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome, FiUsers, FiCalendar, FiFileText, FiDollarSign,
  FiSettings, FiLogOut, FiMenu, FiX, FiSearch, FiUser,
  FiMoon, FiSun, FiPackage, FiActivity,
  FiBarChart2, FiCreditCard, FiBell, FiGlobe
} from 'react-icons/fi';
import { FaUserMd } from 'react-icons/fa';
import { clearSession, getUser } from '../utils/auth';
import { useDarkMode } from '../hooks/useDarkMode';
import NotificationCenter from './NotificationCenter';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: FiHome, label: 'Dashboard', end: true },
    ]
  },
  {
    label: 'Clinical',
    items: [
      { path: '/patients', icon: FiUsers, label: 'Patients' },
      { path: '/appointments', icon: FiCalendar, label: 'Appointments' },
      { path: '/prescriptions', icon: FiFileText, label: 'Prescriptions' },
      { path: '/medicines', icon: FiPackage, label: 'Medicines' },
      { path: '/lab-tests', icon: FiActivity, label: 'Lab Tests' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { path: '/billing', icon: FiDollarSign, label: 'Billing' },
      { path: '/expenses', icon: FiCreditCard, label: 'Expenses' },
      { path: '/reports', icon: FiBarChart2, label: 'Reports' },
    ]
  },
  {
    label: 'Engage',
    items: [
      { path: '/follow-ups', icon: FiBell, label: 'Follow-ups' },
      { path: '/patient-portal', icon: FiGlobe, label: 'Patient Portal' },
    ]
  }
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
    setSearch('');
  };

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-out
        sidebar-glass
        ${sidebarOpen ? 'w-64' : 'w-[72px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white font-bold text-sm">DC</span>
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in">
              <h1 className="text-base font-bold text-gray-900 dark:text-white">DocClinic</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Pro</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scroll space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {sidebarOpen && (
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-1.5">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
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
                    <item.icon className="text-lg flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-surface-800">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaUserMd className="text-white text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  Dr. {user.name || 'Doctor'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate capitalize">{user.plan || 'free'} plan</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <FaUserMd className="text-white text-xs" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 mt-2">
            <NavLink
              to="/profile"
              className="sidebar-link flex-1 !py-2 !text-xs"
              onClick={() => setMobileOpen(false)}
            >
              <FiUser className="text-sm" />
              {sidebarOpen && <span>Profile</span>}
            </NavLink>
            <NavLink
              to="/settings"
              className="sidebar-link flex-1 !py-2 !text-xs"
              onClick={() => setMobileOpen(false)}
            >
              <FiSettings className="text-sm" />
              {sidebarOpen && <span>Settings</span>}
            </NavLink>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 mt-1 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium text-xs"
          >
            <FiLogOut className="text-sm" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="header-glass px-4 lg:px-6 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
            >
              <FiMenu className="text-lg" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
            >
              {sidebarOpen ? <FiX className="text-base text-gray-500" /> : <FiMenu className="text-base text-gray-500" />}
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients..."
                className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-gray-700 rounded-lg w-64 focus:w-80 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none text-sm transition-all duration-300"
              />
            </form>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <FiSun className="text-lg text-amber-500" /> : <FiMoon className="text-lg text-gray-500" />}
            </button>
            <NotificationCenter />
            <div className="hidden sm:flex items-center gap-2 pl-3 ml-1.5 border-l border-gray-200 dark:border-gray-700">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.clinicName || 'My Clinic'}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1 justify-end">
                  <span className="status-dot status-online" />
                  {user.plan || 'free'} plan
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scroll bg-mesh dark:bg-mesh-dark">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
