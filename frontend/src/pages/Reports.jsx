import { useState, useEffect } from 'react';
import { reportsAPI } from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/format';
import { PageLoader, StatCard, EmptyState } from '../components/common';
import { usePrivacy } from '../context/PrivacyContext';
import toast from 'react-hot-toast';
import {
  HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineCash,
  HiOutlineCube, HiOutlineUsers, HiOutlineReceiptTax, HiOutlineCreditCard,
  HiOutlineUserGroup, HiOutlineClock, HiOutlineTruck,
} from 'react-icons/hi';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#EC4899','#6366F1','#14B8A6','#F59E0B','#10B981'];

const tabs = [
  { key: 'sales', label: 'Sales Summary', icon: HiOutlineChartBar },
  { key: 'products', label: 'By Product', icon: HiOutlineCube },
  { key: 'customer', label: 'By Customer', icon: HiOutlineUserGroup },
  { key: 'hour', label: 'By Hour', icon: HiOutlineClock },
  { key: 'pnl', label: 'Profit & Loss', icon: HiOutlineTrendingUp },
  { key: 'inventory', label: 'Inventory', icon: HiOutlineCube },
  { key: 'cashier', label: 'By Cashier', icon: HiOutlineUsers },
  { key: 'purchases', label: 'Purchases', icon: HiOutlineTruck },
  { key: 'tax', label: 'Tax Report', icon: HiOutlineReceiptTax },
  { key: 'receivable', label: 'Receivable', icon: HiOutlineCreditCard },
  { key: 'payable', label: 'Payable', icon: HiOutlineCash },
];

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0,10); });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { maskCurrency: mC, maskNumber: mN } = usePrivacy();

  useEffect(() => { fetchReport(); }, [tab, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setData(null);
    try {
      const params = { startDate, endDate };
      let res;
      switch (tab) {
        case 'sales': res = await reportsAPI.salesSummary(params); break;
        case 'products': res = await reportsAPI.salesByProduct(params); break;
        case 'customer': res = await reportsAPI.salesByCustomer(params); break;
        case 'hour': res = await reportsAPI.salesByHour(params); break;
        case 'pnl': res = await reportsAPI.profitLoss(params); break;
        case 'inventory': res = await reportsAPI.inventory(); break;
        case 'cashier': res = await reportsAPI.salesByCashier(params); break;
        case 'purchases': res = await reportsAPI.purchaseSummary(params); break;
        case 'tax': res = await reportsAPI.tax(params); break;
        case 'receivable': res = await reportsAPI.accountsReceivable(); break;
        case 'payable': res = await reportsAPI.accountsPayable(); break;
        default: return;
      }
      if (res?.data?.success) {
        setData(res.data.data);
      } else {
        toast.error(res?.data?.message || 'Failed to load report');
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold text-slate-800">Reports & Analytics</h1>

      {/* Date Range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field w-auto text-sm" />
          <span className="text-slate-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field w-auto text-sm" />
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'Today', fn: () => { const d = new Date().toISOString().slice(0,10); setStartDate(d); setEndDate(d); } },
            { label: '7 Days', fn: () => { const d = new Date(); d.setDate(d.getDate()-7); setStartDate(d.toISOString().slice(0,10)); setEndDate(new Date().toISOString().slice(0,10)); } },
            { label: '30 Days', fn: () => { const d = new Date(); d.setDate(d.getDate()-30); setStartDate(d.toISOString().slice(0,10)); setEndDate(new Date().toISOString().slice(0,10)); } },
            { label: 'This Month', fn: () => { const d = new Date(); setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10)); setEndDate(d.toISOString().slice(0,10)); } },
          ].map(q => (
            <button key={q.label} onClick={q.fn} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600 transition-all">{q.label}</button>
          ))}
        </div>
      </div>

      {/* Tabs — clear data synchronously when switching so stale data from the previous
          tab (which has a different shape) never reaches the next tab's charts. Without
          this, switching from e.g. Payable (object) to By Product (array) lets the
          first render see the wrong shape and Recharts crashes the page. */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setData(null); setTab(t.key); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-brand-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? <PageLoader /> : !data ? <EmptyState title="No data" /> : (
        <div>
          {/* Sales Summary */}
          {tab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <StatCard title="Total Sales" value={formatCurrency(mC(data.summary?.totalSales || 0))} subtitle={`${mN(data.summary?.salesCount || 0)} sales`} icon={HiOutlineCash} color="blue" />
                <StatCard title="Avg Sale" value={formatCurrency(mC(data.summary?.avgSale || 0))} icon={HiOutlineChartBar} color="purple" />
                <StatCard title="Tax Collected" value={formatCurrency(mC(data.summary?.totalTax || 0))} icon={HiOutlineReceiptTax} color="amber" />
                <StatCard title="Discounts" value={formatCurrency(mC(data.summary?.totalDiscount || 0))} subtitle={`${data.returns || 0} returns, ${data.voids || 0} voids`} icon={HiOutlineTrendingDown} color="red" />
              </div>
              {(!data.summary?.salesCount) ? (
                <EmptyState icon={HiOutlineChartBar} title="No sales in this date range" message="Once sales come in, daily breakdown and payment-method split will show here." />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 card p-5">
                    <h3 className="font-heading font-semibold text-slate-700 mb-3">Daily Sales</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={data.daily?.map(d => ({ date: d._id?.slice(5), total: d.total })) || []}>
                        <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="date" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => formatCurrency(v)} /><Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} fill="url(#sg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card p-5">
                    <h3 className="font-heading font-semibold text-slate-700 mb-3">By Payment</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart><Pie data={data.byPayment?.map(p => ({ name: p._id, value: p.total })) || []} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={3}>
                        {data.byPayment?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie><Tooltip formatter={v => formatCurrency(v)} /><Legend iconType="circle" iconSize={8} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Products */}
          {tab === 'products' && (
            (Array.isArray(data) && data.length === 0)
              ? <EmptyState icon={HiOutlineCube} title="No product sales in this date range" message="Complete a sale to see per-product revenue, cost and profit." />
              : (
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-heading font-semibold text-slate-700 mb-3">Product Performance · Top 15</h3>
                  <ResponsiveContainer width="100%" height={Math.max(300, Math.min(15, data?.length || 0) * 32)}>
                    <BarChart data={(data || []).slice(0, 15)} margin={{ left: 60, right: 16 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis type="number" tickFormatter={v=>`${(v/1000).toFixed(0)}k`} /><YAxis dataKey="productName" type="category" width={140} tick={{fontSize:11}} />
                      <Tooltip formatter={v => formatCurrency(v)} /><Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="totalRevenue" fill="#2563EB" radius={[0,6,6,0]} barSize={14} name="Revenue" />
                      <Bar dataKey="profit" fill="#059669" radius={[0,6,6,0]} barSize={14} name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th className="text-right">Qty Sold</th><th className="text-right">Revenue</th><th className="text-right">Cost</th><th className="text-right">Profit</th><th className="text-right">Margin</th></tr></thead>
                    <tbody>
                      {(data || []).map((p, i) => (
                        <tr key={i}>
                          <td className="font-medium">{p.productName}</td>
                          <td className="text-right font-mono">{formatNumber(p.totalQty)}</td>
                          <td className="text-right font-mono">{formatCurrency(p.totalRevenue)}</td>
                          <td className="text-right font-mono text-slate-500">{formatCurrency(p.totalCost)}</td>
                          <td className="text-right font-mono font-semibold text-emerald-600">{formatCurrency(p.profit)}</td>
                          <td className="text-right font-mono text-sm">{p.totalRevenue > 0 ? ((p.profit / p.totalRevenue) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* By Customer */}
          {tab === 'customer' && (
            (Array.isArray(data) && data.length === 0)
              ? <EmptyState icon={HiOutlineUserGroup} title="No customer sales in this date range" message="Once a sale is tied to a customer, totals and visit counts will appear here." />
              : (
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-heading font-semibold text-slate-700 mb-3">Top Customers · by Spend</h3>
                  <ResponsiveContainer width="100%" height={Math.max(280, Math.min(15, data?.length || 0) * 30)}>
                    <BarChart data={(data || []).slice(0, 15)} margin={{ left: 60, right: 16 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="customerName" type="category" width={140} tick={{fontSize:11}} />
                      <Tooltip formatter={v => formatCurrency(v)} />
                      <Bar dataKey="totalSpent" fill="#7C3AED" radius={[0,6,6,0]} barSize={14} name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Customer</th><th className="text-right">Total Spent</th><th className="text-right">Visits</th><th className="text-right">Avg Sale</th></tr></thead>
                    <tbody>
                      {(data || []).map((c, i) => (
                        <tr key={i}>
                          <td className="font-medium">{c.customerName || 'Walk-in'}</td>
                          <td className="text-right font-mono font-semibold">{formatCurrency(c.totalSpent)}</td>
                          <td className="text-right font-mono">{c.visits}</td>
                          <td className="text-right font-mono text-slate-500">{formatCurrency(c.visits ? c.totalSpent / c.visits : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* By Hour */}
          {tab === 'hour' && (
            (Array.isArray(data) && data.length === 0)
              ? <EmptyState icon={HiOutlineClock} title="No hourly activity in this date range" message="Once sales come in, peak-hour patterns show here so you can plan staffing." />
              : (
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-heading font-semibold text-slate-700 mb-3">Sales by Hour of Day</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(() => {
                      const map = new Map((data || []).map(d => [d.hour, d]));
                      return Array.from({ length: 24 }, (_, h) => ({
                        hour: `${String(h).padStart(2,'0')}:00`,
                        total: map.get(h)?.total || 0,
                        count: map.get(h)?.count || 0,
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="hour" tick={{fontSize:10}} interval={1} />
                      <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v, n) => n === 'total' ? formatCurrency(v) : v} />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="total" fill="#2563EB" radius={[4,4,0,0]} name="Sales (Rs.)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Hour</th><th className="text-right">Sales</th><th className="text-right">Transactions</th><th className="text-right">Avg / Sale</th></tr></thead>
                    <tbody>
                      {(data || []).map((h, i) => (
                        <tr key={i}>
                          <td className="font-mono">{String(h.hour).padStart(2,'0')}:00 – {String((h.hour + 1) % 24).padStart(2,'0')}:00</td>
                          <td className="text-right font-mono font-semibold">{formatCurrency(h.total)}</td>
                          <td className="text-right font-mono">{h.count}</td>
                          <td className="text-right font-mono text-slate-500">{formatCurrency(h.count ? h.total / h.count : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Purchase Summary */}
          {tab === 'purchases' && (
            (!data?.summary?.orderCount)
              ? <EmptyState icon={HiOutlineTruck} title="No purchases in this date range" message="Once you record purchase orders, totals by supplier will appear here." />
              : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                  <StatCard title="Total Purchases" value={formatCurrency(mC(data.summary.totalPurchases || 0))} subtitle={`${mN(data.summary.orderCount || 0)} orders`} icon={HiOutlineTruck} color="blue" />
                  <StatCard title="Paid" value={formatCurrency(mC(data.summary.totalPaid || 0))} icon={HiOutlineCash} color="green" />
                  <StatCard title="Outstanding" value={formatCurrency(mC(data.summary.totalDue || 0))} icon={HiOutlineCreditCard} color="amber" />
                  <StatCard title="Avg / Order" value={formatCurrency(mC(data.summary.orderCount ? data.summary.totalPurchases / data.summary.orderCount : 0))} icon={HiOutlineChartBar} color="purple" />
                </div>
                {(data.bySupplier?.length || 0) > 0 && (
                  <div className="card p-5">
                    <h3 className="font-heading font-semibold text-slate-700 mb-3">By Supplier</h3>
                    <ResponsiveContainer width="100%" height={Math.max(260, Math.min(15, data.bySupplier.length) * 30)}>
                      <BarChart data={data.bySupplier.slice(0, 15)} margin={{ left: 60, right: 16 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis type="number" tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                        <YAxis dataKey="supplierName" type="category" width={140} tick={{fontSize:11}} />
                        <Tooltip formatter={v => formatCurrency(v)} />
                        <Bar dataKey="total" fill="#0891B2" radius={[0,6,6,0]} barSize={14} name="Purchased" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Supplier</th><th className="text-right">Orders</th><th className="text-right">Total Purchased</th></tr></thead>
                    <tbody>
                      {(data.bySupplier || []).map((s, i) => (
                        <tr key={i}>
                          <td className="font-medium">{s.supplierName || 'Unknown'}</td>
                          <td className="text-right font-mono">{s.count}</td>
                          <td className="text-right font-mono font-semibold">{formatCurrency(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* P&L */}
          {tab === 'pnl' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <StatCard title="Revenue" value={formatCurrency(mC(data.totalRevenue))} icon={HiOutlineTrendingUp} color="blue" />
                <StatCard title="COGS" value={formatCurrency(mC(data.totalCOGS))} icon={HiOutlineCube} color="amber" />
                <StatCard title="Gross Profit" value={formatCurrency(mC(data.grossProfit))} subtitle={`Margin: ${data.grossMargin}%`} icon={HiOutlineTrendingUp} color="green" />
                <StatCard title="Net Profit" value={formatCurrency(mC(data.netProfit))} subtitle={`Margin: ${data.netMargin}%`} icon={HiOutlineCash} color={data.netProfit >= 0 ? 'green' : 'red'} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-heading font-semibold text-slate-700 mb-3">P&L Breakdown</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-2 rounded-lg bg-blue-50"><span>Revenue</span><span className="font-mono font-semibold">{formatCurrency(data.totalRevenue)}</span></div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="pl-4">Less: Returns</span><span className="font-mono text-red-500">-{formatCurrency(data.returns)}</span></div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="pl-4">Less: COGS</span><span className="font-mono text-red-500">-{formatCurrency(data.totalCOGS)}</span></div>
                    <div className="flex justify-between p-2 rounded-lg bg-emerald-50 font-semibold"><span>Gross Profit</span><span className="font-mono">{formatCurrency(data.grossProfit)}</span></div>
                    {data.expenseBreakdown?.map((e, i) => (
                      <div key={i} className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="pl-4">Less: {e._id}</span><span className="font-mono text-red-500">-{formatCurrency(e.total)}</span></div>
                    ))}
                    <div className="flex justify-between p-2 rounded-lg bg-slate-50"><span className="pl-4 font-medium">Total Expenses</span><span className="font-mono text-red-600 font-semibold">-{formatCurrency(data.totalExpenses)}</span></div>
                    <div className={`flex justify-between p-3 rounded-xl font-bold text-lg ${data.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      <span>Net Profit</span><span className="font-mono">{formatCurrency(data.netProfit)}</span>
                    </div>
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="font-heading font-semibold text-slate-700 mb-3">Monthly Revenue</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.monthly?.map(m => ({ month: m._id, revenue: m.revenue })) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="month" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => formatCurrency(v)} /><Bar dataKey="revenue" fill="#2563EB" radius={[6,6,0,0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Inventory */}
          {tab === 'inventory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <StatCard title="Total Products" value={formatNumber(mN(data.totalItems))} icon={HiOutlineCube} color="blue" />
                <StatCard title="Stock Value (Cost)" value={formatCurrency(mC(data.totalValueCost))} icon={HiOutlineCash} color="amber" />
                <StatCard title="Stock Value (Sale)" value={formatCurrency(mC(data.totalValueSale))} icon={HiOutlineTrendingUp} color="green" />
                <StatCard title="Low Stock" value={mN(data.lowStockCount)} subtitle={`${data.outOfStockCount} out of stock`} icon={HiOutlineTrendingDown} color="red" />
              </div>
              <div className="table-container bg-white">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Category</th><th className="text-right">Stock</th><th className="text-right">Cost</th><th className="text-right">Sale Price</th><th className="text-right">Stock Value</th></tr></thead>
                  <tbody>
                    {data.products?.map(p => (
                      <tr key={p._id}>
                        <td><p className="font-medium">{p.productName}</p><p className="text-[10px] font-mono text-slate-400">{p.sku}</p></td>
                        <td className="text-sm text-slate-500">{p.category?.name || '-'}</td>
                        <td className="text-right"><span className={`font-mono font-semibold ${p.currentStock <= 0 ? 'text-red-600' : p.currentStock <= p.lowStockThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>{p.currentStock}</span></td>
                        <td className="text-right font-mono text-sm">{formatCurrency(p.costPrice)}</td>
                        <td className="text-right font-mono text-sm">{formatCurrency(p.salePrice)}</td>
                        <td className="text-right font-mono text-sm font-semibold">{formatCurrency(p.currentStock * p.costPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cashier Performance */}
          {tab === 'cashier' && (
            (Array.isArray(data) && data.length === 0)
              ? <EmptyState icon={HiOutlineUsers} title="No cashier activity in this date range" message="Once cashiers complete sales, their totals and averages will appear here." />
              : (
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-heading font-semibold text-slate-700 mb-3">Cashier Performance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data || []} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="cashierName" tick={{fontSize:11}} />
                      <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => formatCurrency(v)} />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="totalSales" fill="#2563EB" radius={[6,6,0,0]} name="Total Sales" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Cashier</th><th className="text-right">Sales</th><th className="text-right">Count</th><th className="text-right">Avg Sale</th></tr></thead>
                    <tbody>
                      {(data || []).map((c, i) => (
                        <tr key={i}><td className="font-medium">{c.cashierName || 'Unknown'}</td><td className="text-right font-mono font-semibold">{formatCurrency(c.totalSales)}</td><td className="text-right font-mono">{c.salesCount}</td><td className="text-right font-mono text-slate-500">{formatCurrency(c.avgSale)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Tax */}
          {tab === 'tax' && (
            <div className="space-y-4">
              <div className="card p-5 text-center"><p className="text-sm text-slate-500">Total Tax Collected</p><p className="text-3xl font-heading font-bold text-brand-600">{formatCurrency(data.totalTaxCollected || 0)}</p></div>
              {(!data.breakdown?.length) ? (
                <EmptyState icon={HiOutlineReceiptTax} title="No tax recorded in this date range" message="Tax is recorded automatically when sales include taxable items." />
              ) : (
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Tax Rate</th><th className="text-right">Taxable Amount</th><th className="text-right">Tax Collected</th><th className="text-right">Items</th></tr></thead>
                    <tbody>
                      {data.breakdown.map((t, i) => (
                        <tr key={i}><td className="font-mono font-semibold">{t.taxRate}%</td><td className="text-right font-mono">{formatCurrency(t.totalTaxable)}</td><td className="text-right font-mono font-semibold text-brand-600">{formatCurrency(t.totalTax)}</td><td className="text-right font-mono">{t.itemCount}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Receivable */}
          {tab === 'receivable' && (
            <div className="space-y-4">
              <div className="card p-5 text-center"><p className="text-sm text-slate-500">Total Receivable</p><p className="text-3xl font-heading font-bold text-red-600">{formatCurrency(data.totalReceivable || 0)}</p><p className="text-sm text-slate-400">{data.count || 0} customers</p></div>
              {(!data.customers?.length) ? (
                <EmptyState icon={HiOutlineCreditCard} title="No outstanding customer balances" message="When customers buy on credit (udhar), their balances will appear here." />
              ) : (
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Customer</th><th>Phone</th><th className="text-right">Outstanding</th><th className="text-right">Credit Limit</th><th>Last Purchase</th></tr></thead>
                    <tbody>
                      {data.customers.map(c => (
                        <tr key={c._id}><td className="font-medium">{c.customerName}</td><td className="font-mono text-sm">{c.phone}</td><td className="text-right font-mono font-semibold text-red-600">{formatCurrency(c.currentBalance)}</td><td className="text-right font-mono text-sm">{formatCurrency(c.creditLimit)}</td><td className="text-sm text-slate-500">{c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString() : '-'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payable */}
          {tab === 'payable' && (
            <div className="space-y-4">
              <div className="card p-5 text-center"><p className="text-sm text-slate-500">Total Payable</p><p className="text-3xl font-heading font-bold text-amber-600">{formatCurrency(data.totalPayable || 0)}</p><p className="text-sm text-slate-400">{data.count || 0} suppliers</p></div>
              {(!data.suppliers?.length) ? (
                <EmptyState icon={HiOutlineCash} title="No outstanding supplier balances" message="When you owe a supplier (unpaid POs), their balances will appear here." />
              ) : (
                <div className="table-container bg-white">
                  <table className="data-table">
                    <thead><tr><th>Supplier</th><th>Company</th><th>Phone</th><th className="text-right">Amount Due</th></tr></thead>
                    <tbody>
                      {data.suppliers.map(s => (
                        <tr key={s._id}><td className="font-medium">{s.supplierName}</td><td className="text-sm text-slate-500">{s.companyName || '-'}</td><td className="font-mono text-sm">{s.phone}</td><td className="text-right font-mono font-semibold text-amber-600">{formatCurrency(s.totalAmountDue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
