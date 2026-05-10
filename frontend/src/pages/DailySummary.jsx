import { useState, useEffect } from 'react';
import { bakeryAPI } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { PageLoader, StatCard } from '../components/common';
import { usePrivacy } from '../context/PrivacyContext';
import toast from 'react-hot-toast';
import { HiOutlineCash, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineExclamationCircle, HiOutlineCube, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailySummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { maskCurrency: mC } = usePrivacy();

  useEffect(() => { fetchData(); }, [date]);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await bakeryAPI.getDailySummary({ date }); setData(res.data.data); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const changeDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    if (d <= new Date()) setDate(d.toISOString().slice(0, 10));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-slate-800">📊 Daily Summary</h1>
        <div className="flex items-center justify-center gap-3 mt-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-slate-100"><HiOutlineChevronLeft className="w-5 h-5" /></button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-auto text-center font-semibold" max={new Date().toISOString().slice(0, 10)} />
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-slate-100"><HiOutlineChevronRight className="w-5 h-5" /></button>
        </div>
        <p className="text-slate-400 text-sm mt-1">Din bhar ka poora hisaab</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <StatCard title="Total Sale" value={formatCurrency(mC(data?.sales?.totalSales || 0))} subtitle={`${data?.sales?.salesCount || 0} bills`} icon={HiOutlineCash} color="blue" />
        <StatCard title="Gross Profit" value={formatCurrency(mC(data?.grossProfit || 0))} icon={HiOutlineTrendingUp} color="green" />
        <StatCard title="Expenses" value={formatCurrency(mC(data?.expenses || 0))} icon={HiOutlineTrendingDown} color="red" />
        <StatCard title="Net Profit" value={formatCurrency(mC(data?.netProfit || 0))} icon={HiOutlineTrendingUp} color={data?.netProfit >= 0 ? 'green' : 'red'} />
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Payment Breakdown */}
        <div className="card p-4">
          <h3 className="font-heading font-semibold text-sm text-slate-700 mb-3">Payment Breakdown</h3>
          <div className="space-y-2">
            {data?.payments?.map(p => (
              <div key={p.method} className="flex justify-between text-sm p-2 rounded-lg bg-slate-50">
                <span className="capitalize">{p.method === 'cash' ? '💵 Cash' : p.method === 'card' ? '💳 Card' : p.method === 'credit' ? '📒 Udhar' : p.method}</span>
                <span className="font-mono font-semibold">{formatCurrency(p.amount)}</span>
              </div>
            )) || <p className="text-sm text-slate-400">No sales</p>}
          </div>
        </div>

        {/* Cash Summary */}
        <div className="card p-4">
          <h3 className="font-heading font-semibold text-sm text-slate-700 mb-3">Cash Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded-lg bg-emerald-50"><span>Cash Sales</span><span className="font-mono font-semibold text-emerald-600">{formatCurrency(mC(data?.cashInHand || 0))}</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-blue-50"><span>Udhar Wapsi</span><span className="font-mono font-semibold text-blue-600">{formatCurrency(mC(data?.paymentsReceived || 0))}</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-red-50"><span>Udhar Diya</span><span className="font-mono font-semibold text-red-600">{formatCurrency(mC(data?.creditGiven || 0))}</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-amber-50"><span>Cash Jama Kiya</span><span className="font-mono font-semibold text-amber-600">{formatCurrency(mC(data?.cashHandedOver || 0))}</span></div>
          </div>
        </div>

        {/* Wastage + Production */}
        <div className="card p-4">
          <h3 className="font-heading font-semibold text-sm text-slate-700 mb-3">Wastage & Production</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded-lg bg-red-50"><span>🗑️ Wastage Loss</span><span className="font-mono font-semibold text-red-600">{formatCurrency(data?.wastage?.loss || 0)}</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span>Wasted Items</span><span className="font-mono">{data?.wastage?.items || 0}</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-emerald-50"><span>🏭 Produced Items</span><span className="font-mono font-semibold text-emerald-600">{data?.production?.totalItems || 0}</span></div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span>Production Cost</span><span className="font-mono">{formatCurrency(data?.production?.totalCost || 0)}</span></div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      {data?.topProducts?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-slate-700 mb-3">Top Selling Products Today</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topProducts.map(p => ({ name: p._id?.length > 15 ? p._id.slice(0, 15) + '...' : p._id, revenue: p.revenue, qty: p.qty }))} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={95} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* WhatsApp Share Button */}
      <div className="text-center">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `📊 *${data?.date} - Daily Summary*\n\n` +
            `💰 Total Sale: Rs. ${data?.sales?.totalSales || 0}\n` +
            `📝 Bills: ${data?.sales?.salesCount || 0}\n` +
            `📈 Gross Profit: Rs. ${data?.grossProfit || 0}\n` +
            `💸 Expenses: Rs. ${data?.expenses || 0}\n` +
            `🗑️ Wastage: Rs. ${data?.wastage?.loss || 0}\n` +
            `✅ Net Profit: Rs. ${data?.netProfit || 0}\n` +
            `💵 Cash: Rs. ${data?.cashInHand || 0}\n` +
            `📒 Udhar Diya: Rs. ${data?.creditGiven || 0}\n` +
            `💰 Cash Jama: Rs. ${data?.cashHandedOver || 0}\n\n` +
            `- M Mukhtar Bakers & General Store`
          )}`}
          target="_blank" rel="noopener noreferrer"
          className="btn-success btn-lg inline-flex items-center gap-2"
        >
          📱 WhatsApp pe Bhejo
        </a>
      </div>
    </div>
  );
}
