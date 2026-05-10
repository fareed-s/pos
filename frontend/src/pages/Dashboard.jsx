import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePrivacy } from '../context/PrivacyContext';
import { dashboardAPI } from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/format';
import { StatCard, PageLoader, EmptyState } from '../components/common';
import {
  HiOutlineCash, HiOutlineTrendingUp, HiOutlineExclamationCircle,
  HiOutlineCreditCard, HiOutlineShoppingCart, HiOutlineUsers, HiOutlineCube
} from 'react-icons/hi';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#EC4899', '#6366F1', '#14B8A6'];

export default function Dashboard() {
  const { user, business } = useAuth();
  // Privacy mode helpers — when ON, summary widget values render at 0.33×.
  // We mask BIG money/count widgets only; charts keep real shape so trends stay readable.
  const { maskCurrency: mC, maskNumber: mN, enabled: privacyOn } = usePrivacy();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await dashboardAPI.getStats();
      setStats(res.data.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  const salesData = stats?.salesTrend?.map(s => ({
    date: s._id?.slice(5),
    sales: s.total,
    count: s.count,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-800">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Here's what's happening with <span className="font-medium text-slate-700">{business?.name}</span> today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(mC(stats?.todaySales?.amount || 0))}
          subtitle={`${mN(stats?.todaySales?.count || 0)} transactions`}
          icon={HiOutlineCash}
          color="blue"
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(mC(stats?.todayProfit || 0))}
          icon={HiOutlineTrendingUp}
          color="green"
        />
        <StatCard
          title="Low Stock Items"
          value={formatNumber(mN(stats?.lowStockCount || 0))}
          subtitle={`${mN(stats?.outOfStockCount || 0)} out of stock`}
          icon={HiOutlineExclamationCircle}
          color={stats?.lowStockCount > 5 ? 'red' : 'amber'}
        />
        <StatCard
          title="Credit Due"
          value={formatCurrency(mC(stats?.creditDue?.total || 0))}
          subtitle={`${mN(stats?.creditDue?.count || 0)} customers`}
          icon={HiOutlineCreditCard}
          color="purple"
        />
      </div>

      {/* Subtle banner only visible to the cashier so they remember the numbers
          on screen are masked — important so they don't act on a fake number. */}
      {privacyOn && (
        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          Privacy mode ON — displayed totals are reduced. Click the eye icon to restore.
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-4">Sales Trend (Last 7 Days)</h3>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No sales data" message="Sales will appear here once you make transactions" />
          )}
        </div>

        {/* Sales by Category */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-4">Sales by Category</h3>
          {stats?.salesByCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.salesByCategory}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {stats.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No data yet" />
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-slate-800 mb-4">Top 10 Products (This Month)</h3>
        {stats?.topProducts?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="totalRevenue" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={20} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No product data yet" />
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="card p-4 text-center">
          <HiOutlineCube className="w-8 h-8 text-brand-500 mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-slate-800">{formatNumber(mN(stats?.totalProducts || 0))}</p>
          <p className="text-sm text-slate-500">Total Products</p>
        </div>
        <div className="card p-4 text-center">
          <HiOutlineUsers className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-slate-800">{formatNumber(mN(stats?.totalCustomers || 0))}</p>
          <p className="text-sm text-slate-500">Customers</p>
        </div>
        <div className="card p-4 text-center">
          <HiOutlineShoppingCart className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-slate-800">{formatNumber(mN(stats?.pendingPOs || 0))}</p>
          <p className="text-sm text-slate-500">Pending Orders</p>
        </div>
        <div className="card p-4 text-center">
          <HiOutlineCash className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-slate-800">{formatCurrency(mC(stats?.todayExpenses || 0))}</p>
          <p className="text-sm text-slate-500">Today's Expenses</p>
        </div>
      </div>
    </div>
  );
}
