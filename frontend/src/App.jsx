import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import { PageLoader } from './components/common';
import { applyServiceWorkerUpdate } from './utils/pwa';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import POSTerminal from './pages/POSTerminal';
import SalesHistory from './pages/SalesHistory';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import PriceLookup from './pages/PriceLookup';
import UdharRegister from './pages/UdharRegister';
import WastageTracker from './pages/WastageTracker';
import DailySummary from './pages/DailySummary';
import ProductionLogPage from './pages/ProductionLog';
import CashHandoverPage from './pages/CashHandover';
import BulkPriceUpdate from './pages/BulkPriceUpdate';
import SmartHub from './pages/SmartHub';
import Profile from './pages/Profile';

// Protected Route wrapper
function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;

  return <Sidebar>{children}</Sidebar>;
}

// Guest route (redirect if already logged in)
function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'superadmin' ? '/superadmin' : '/dashboard'} replace />;
  }

  return children;
}

// POS Terminal - Full Screen (no sidebar)
function ProtectedPOS() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <POSTerminal />;
}
// Auth-aware redirect for `/` and unknown paths
function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'superadmin' ? '/superadmin' : '/dashboard'} replace />;
}

function ComingSoon({ title }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl">🚀</span>
        </div>
        <h2 className="text-2xl font-heading font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500">This module will be available in the next phase.</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Guest Routes (public registration disabled — only Super Admin creates users) */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      {/* SuperAdmin Routes */}
      <Route path="/superadmin" element={<ProtectedRoute roles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/businesses" element={<ProtectedRoute roles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/plans" element={<ProtectedRoute roles={['superadmin']}><ComingSoon title="Plan Management" /></ProtectedRoute>} />
      <Route path="/superadmin/settings" element={<ProtectedRoute roles={['superadmin']}><ComingSoon title="Platform Settings" /></ProtectedRoute>} />

      {/* Business Routes */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><Dashboard /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><Products /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute roles={['businessadmin']}><Categories /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={['businessadmin', 'manager']}><Inventory /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute roles={['businessadmin']}><Staff /></ProtectedRoute>} />

      {/* Phase 2+ Placeholder Routes */}
      <Route path="/pos" element={<ProtectedPOS />} />
      <Route path="/sales" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><SalesHistory /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><Customers /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute roles={['businessadmin', 'manager']}><Suppliers /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute roles={['businessadmin', 'manager']}><Purchases /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute roles={['businessadmin', 'manager']}><Expenses /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={['businessadmin', 'manager']}><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['businessadmin']}><SettingsPage /></ProtectedRoute>} />
      <Route path="/activity-logs" element={<ProtectedRoute roles={['businessadmin']}><ActivityLogs /></ProtectedRoute>} />
      <Route path="/price-lookup" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><PriceLookup /></ProtectedRoute>} />
      <Route path="/udhar" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><UdharRegister /></ProtectedRoute>} />
      <Route path="/wastage" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><WastageTracker /></ProtectedRoute>} />
      <Route path="/daily-summary" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><DailySummary /></ProtectedRoute>} />
      <Route path="/production" element={<ProtectedRoute roles={['businessadmin', 'manager']}><ProductionLogPage /></ProtectedRoute>} />
      <Route path="/cash-handover" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><CashHandoverPage /></ProtectedRoute>} />
      <Route path="/bulk-price-update" element={<ProtectedRoute roles={['businessadmin', 'manager']}><BulkPriceUpdate /></ProtectedRoute>} />
      <Route path="/smart-hub" element={<ProtectedRoute roles={['businessadmin', 'manager', 'cashier']}><SmartHub /></ProtectedRoute>} />

      {/* Profile is available to every authenticated role (incl. superadmin) */}
      <Route path="/profile" element={<ProtectedRoute roles={['superadmin', 'businessadmin', 'manager', 'cashier']}><Profile /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

// Listen for the 'pwa-update' event emitted from utils/pwa.js when a new
// service worker version is waiting. Surface a sticky toast with a Reload CTA.
function PwaUpdateWatcher() {
  useEffect(() => {
    const handler = (e) => {
      const worker = e.detail?.worker;
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm">A new version is ready.</span>
            <button
              onClick={() => { applyServiceWorkerUpdate(worker); toast.dismiss(t.id); }}
              className="px-3 py-1 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600"
            >
              Reload
            </button>
          </div>
        ),
        { duration: Infinity, id: 'pwa-update' }
      );
    };
    window.addEventListener('pwa-update', handler);
    return () => window.removeEventListener('pwa-update', handler);
  }, []);
  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <PwaUpdateWatcher />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontFamily: 'DM Sans' },
            success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
            error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </Router>
  );
}
