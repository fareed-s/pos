import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { productAPI } from '../../utils/api';
import {
  HiOutlineViewGrid, HiOutlineShoppingCart, HiOutlineCube, HiOutlineTag,
  HiOutlineUsers, HiOutlineTruck, HiOutlineUserGroup, HiOutlineCash,
  HiOutlineChartBar, HiOutlineCog, HiOutlineLogout, HiOutlineMenu,
  HiOutlineX, HiOutlineClipboardList, HiOutlineAdjustments, HiOutlineOfficeBuilding,
  HiOutlineBell, HiOutlineChevronDown, HiOutlineGlobe, HiOutlineSearch, HiOutlineTrash,
  HiOutlineLightBulb, HiOutlineExclamation, HiOutlineEye, HiOutlineEyeOff, HiOutlineSun, HiOutlineMoon,
  HiOutlineUser,
} from 'react-icons/hi';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { getRoleLabel } from '../../utils/format';
import { Avatar } from '../common';
import InstallButton from './InstallButton';

export default function Sidebar({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const { user, business, logout, subscription, daysToExpire, isExpired, isExpiringSoon, viewOnly } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { enabled: privacyOn, toggle: togglePrivacy } = usePrivacy();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  // Close profile + notif dropdowns on outside click + on route change.
  useEffect(() => {
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  useEffect(() => { setProfileOpen(false); setNotifOpen(false); }, [location.pathname]);

  const isSuperAdmin = user?.role === 'superadmin';

  // Pull low-stock products for the bell. SuperAdmin doesn't have a tenant so skip.
  // Refresh every 2 minutes; cheap query, indexed by businessId.
  useEffect(() => {
    if (isSuperAdmin || !user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await productAPI.getLowStock();
        if (!cancelled) setLowStock(res.data?.data || []);
      } catch { /* silent — bell just shows fewer notifs */ }
    };
    load();
    const t = setInterval(load, 120000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isSuperAdmin, user]);

  // Aggregate count for the bell badge: subscription warning (if soon/expired) + low-stock items.
  const subscriptionAlert = isExpired || isExpiringSoon;
  const notifCount = (subscriptionAlert ? 1 : 0) + lowStock.length;

  const adminLinks = [
    { to: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
    { to: '/price-lookup', icon: HiOutlineSearch, label: '🔍 Price Lookup' },
    { to: '/smart-hub', icon: HiOutlineLightBulb, label: '🧠 Smart Hub' },
    { to: '/daily-summary', icon: HiOutlineChartBar, label: '📊 Daily Summary' },
    { to: '/pos', icon: HiOutlineShoppingCart, label: 'POS Terminal' },
    { to: '/sales', icon: HiOutlineClipboardList, label: 'Sales History' },
    { to: '/products', icon: HiOutlineCube, label: 'Products' },
    { to: '/categories', icon: HiOutlineTag, label: 'Categories' },
    { to: '/production', icon: HiOutlineCube, label: '🏭 Production Log' },
    { to: '/wastage', icon: HiOutlineTrash, label: '🗑️ Wastage Tracker' },
    { to: '/inventory', icon: HiOutlineClipboardList, label: 'Inventory' },
    { to: '/udhar', icon: HiOutlineCash, label: '📒 Udhar Register' },
    { to: '/customers', icon: HiOutlineUsers, label: 'Customers' },
    { to: '/suppliers', icon: HiOutlineTruck, label: 'Suppliers' },
    { to: '/purchases', icon: HiOutlineClipboardList, label: 'Purchases' },
    { to: '/bulk-price-update', icon: HiOutlineAdjustments, label: '💲 Bulk Prices' },
    { to: '/staff', icon: HiOutlineUserGroup, label: 'Staff' },
    { to: '/expenses', icon: HiOutlineCash, label: 'Expenses' },
    { to: '/cash-handover', icon: HiOutlineCash, label: '💰 Cash Jama' },
    { to: '/reports', icon: HiOutlineChartBar, label: 'Reports' },
    { to: '/activity-logs', icon: HiOutlineClipboardList, label: 'Activity Log' },
    { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
  ];

  const superAdminLinks = [
    { to: '/superadmin', icon: HiOutlineViewGrid, label: 'Dashboard' },
    { to: '/superadmin/businesses', icon: HiOutlineOfficeBuilding, label: 'Businesses' },
    { to: '/superadmin/plans', icon: HiOutlineAdjustments, label: 'Plans' },
    { to: '/superadmin/settings', icon: HiOutlineCog, label: 'Settings' },
  ];

  const managerLinks = adminLinks.filter(l => !['/staff', '/settings'].includes(l.to));
  const cashierLinks = [
    { to: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
    { to: '/price-lookup', icon: HiOutlineSearch, label: '🔍 Price Lookup' },
    { to: '/smart-hub', icon: HiOutlineLightBulb, label: '🧠 Smart Hub' },
    { to: '/daily-summary', icon: HiOutlineChartBar, label: '📊 Daily Summary' },
    { to: '/pos', icon: HiOutlineShoppingCart, label: 'POS Terminal' },
    { to: '/udhar', icon: HiOutlineCash, label: '📒 Udhar Register' },
    { to: '/wastage', icon: HiOutlineTrash, label: '🗑️ Wastage' },
    { to: '/cash-handover', icon: HiOutlineCash, label: '💰 Cash Jama' },
  ];

  const getLinks = () => {
    if (isSuperAdmin) return superAdminLinks;
    switch (user?.role) {
      case 'businessadmin': return adminLinks;
      case 'manager': return managerLinks;
      case 'cashier': return cashierLinks;
      default: return [];
    }
  };

  const links = getLinks();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <HiOutlineShoppingCart className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-white font-heading font-bold text-base leading-tight">POS System</h1>
              <p className="text-slate-400 text-[11px]">Management Suite</p>
            </div>
          )}
        </div>
      </div>

      {/* Business Info */}
      {!isSuperAdmin && business && !collapsed && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white text-sm font-medium truncate">{business.name}</p>
          <p className="text-slate-400 text-xs truncate">{business.email}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive =
            location.pathname === link.to ||
            (link.to !== '/dashboard' && location.pathname.startsWith(`${link.to}/`));
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="px-3 pb-4 mt-auto">
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title="View profile"
        >
          <Avatar user={user} size="md" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-[11px]">{getRoleLabel(user?.role)}</p>
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full mt-2 text-red-300 hover:bg-red-500/10 hover:text-red-200"
        >
          <HiOutlineLogout className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gradient-to-b from-navy-900 to-navy-950 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-navy-900 to-navy-950">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200">
              <HiOutlineMenu className="w-5 h-5" />
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300">
              <HiOutlineMenu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Install app — full label on sm+, compact icon-only on mobile.
                On platforms where the native prompt isn't available (iOS Safari etc.)
                clicking opens an instructions modal so the link is never a dead end. */}
            <span className="hidden sm:inline-flex"><InstallButton /></span>
            <span className="sm:hidden"><InstallButton compact /></span>

            {/* Privacy / Stealth toggle — discreet eye icon. ON state has a small
                colored ring + amber dot so the cashier always knows the displayed
                summary numbers are reduced (×0.33). Shortcut: Ctrl/Cmd+Shift+P. */}
            <button
              onClick={togglePrivacy}
              className={`relative p-2 rounded-lg transition-colors ${
                privacyOn
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400/60'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300'
              }`}
              title={privacyOn ? 'Privacy mode ON — numbers reduced (Ctrl+Shift+P)' : 'Privacy mode OFF (Ctrl+Shift+P)'}
              aria-label="Toggle privacy mode"
              aria-pressed={privacyOn}
            >
              {privacyOn ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              {privacyOn && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-amber-300 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
            </button>
            {/* Notification bell — aggregates subscription alerts + low stock */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 relative"
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <HiOutlineBell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${isExpired ? 'bg-red-500' : 'bg-amber-500'}`}>
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifications</p>
                    <span className="text-[10px] font-mono text-slate-400">{notifCount}</span>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifCount === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        <HiOutlineBell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        You're all caught up.
                      </div>
                    ) : (
                      <>
                        {/* Subscription expiry */}
                        {isExpired && (
                          <Link
                            to="/dashboard"
                            onClick={() => setNotifOpen(false)}
                            className="flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <HiOutlineExclamation className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Subscription expired</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Your account is in view-only mode. Contact your provider to renew.
                              </p>
                            </div>
                          </Link>
                        )}
                        {!isExpired && isExpiringSoon && (
                          <Link
                            to="/dashboard"
                            onClick={() => setNotifOpen(false)}
                            className="flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          >
                            <HiOutlineExclamation className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                Subscription ends in {daysToExpire} day{daysToExpire === 1 ? '' : 's'}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Plan: {subscription?.plan || '—'}. Renew before expiry to avoid view-only mode.
                              </p>
                            </div>
                          </Link>
                        )}

                        {/* Low stock */}
                        {lowStock.length > 0 && (
                          <>
                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/40 text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                              Low Stock · {lowStock.length}
                            </div>
                            {lowStock.slice(0, 8).map(p => (
                              <Link
                                key={p._id}
                                to="/inventory"
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.productName}</p>
                                  <p className="text-[10px] font-mono text-slate-400">{p.sku}</p>
                                </div>
                                <span className={`text-xs font-mono font-semibold flex-shrink-0 ${p.currentStock <= 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                  {p.currentStock} {p.unit || ''} {p.currentStock <= 0 ? '· OUT' : `/ ${p.lowStockThreshold}`}
                                </span>
                              </Link>
                            ))}
                            {lowStock.length > 8 && (
                              <Link
                                to="/inventory"
                                onClick={() => setNotifOpen(false)}
                                className="block px-4 py-2.5 text-center text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                              >
                                View all {lowStock.length} low-stock items →
                              </Link>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative ml-1" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className={`p-1 rounded-full transition-all ring-2 ring-transparent hover:ring-brand-200 dark:hover:ring-brand-700 ${profileOpen ? 'ring-brand-300 dark:ring-brand-600' : ''}`}
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                <Avatar user={user} size="sm" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-slate-700/60 dark:to-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold">
                          {getRoleLabel(user?.role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <HiOutlineUser className="w-5 h-5 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    {/* Settings is only accessible by businessadmin (App.jsx route guard).
                        Don't show the link to manager/cashier — clicking would silently bounce. */}
                    {user?.role === 'businessadmin' && (
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <HiOutlineCog className="w-5 h-5 text-slate-400" />
                        <span>Settings</span>
                      </Link>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <HiOutlineLogout className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Subscription banner (only for non-superadmin) */}
        {!isSuperAdmin && subscription && (isExpired || isExpiringSoon) && (
          <div className={`px-4 lg:px-6 py-2.5 flex items-center gap-3 text-sm ${
            isExpired
              ? 'bg-red-50 border-b border-red-200 text-red-700'
              : 'bg-amber-50 border-b border-amber-200 text-amber-700'
          }`}>
            {isExpired
              ? <HiOutlineEye className="w-5 h-5 flex-shrink-0" />
              : <HiOutlineExclamation className="w-5 h-5 flex-shrink-0" />}
            <p className="flex-1">
              {isExpired
                ? <><strong>View-Only Mode</strong> — Aap ki subscription expire ho chuki hai. Add / Edit / Delete temporarily blocked. Renew karne ke liye admin se contact karein.</>
                : <>Aap ki subscription <strong>{daysToExpire} din</strong> me expire ho rahi hai. Renew karne ke liye admin se contact karein.</>}
            </p>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto p-4 lg:p-6 ${viewOnly ? 'subscription-view-only' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
