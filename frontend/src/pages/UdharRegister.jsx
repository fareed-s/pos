import { useState, useEffect } from 'react';
import { bakeryAPI, customerAPI } from '../utils/api';
import { formatCurrency, formatDateTime, formatDate } from '../utils/format';
import { PageLoader, EmptyState, SearchInput } from '../components/common';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { HiOutlineCash, HiOutlineUsers, HiOutlineCreditCard } from 'react-icons/hi';

export default function UdharRegister() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const res = await bakeryAPI.getUdhar(); setData(res.data.data); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handlePayment = async (customer) => {
    const { value: amount } = await Swal.fire({
      title: `${customer.customerName} se Wapsi`, input: 'number',
      inputLabel: `Udhar baqi: Rs. ${customer.currentBalance}`,
      inputValue: customer.currentBalance, showCancelButton: true,
      inputValidator: (v) => { if (!v || Number(v) <= 0) return 'Amount daalo'; },
    });
    if (amount) {
      try {
        await customerAPI.recordPayment(customer._id, { amount: Number(amount), method: 'cash' });
        toast.success('Payment received!');
        fetchData();
      } catch { toast.error('Failed'); }
    }
  };

  if (loading) return <PageLoader />;

  const q = (search || '').toLowerCase();
  const filtered = data?.customers?.filter(c =>
    (c.customerName || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(search || '')
  ) || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-slate-800">📒 Udhar Register (Khata)</h1>
        <p className="text-slate-500 text-sm mt-1">Sab ka udhar ek jagah — kitna diya, kitna wapas aaya</p>
      </div>

      {/* Total Udhar Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 text-center bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <HiOutlineCreditCard className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-500 font-medium">Total Udhar Baqi</p>
          <p className="text-3xl font-heading font-bold text-red-700">{formatCurrency(data?.totalUdhar || 0)}</p>
        </div>
        <div className="card p-5 text-center">
          <HiOutlineUsers className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Udhar Customers</p>
          <p className="text-3xl font-heading font-bold text-slate-800">{data?.customerCount || 0}</p>
        </div>
        <div className="card p-5 text-center bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <HiOutlineCash className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-emerald-500 font-medium">Aaj ki Wapsi</p>
          <p className="text-3xl font-heading font-bold text-emerald-700">{formatCurrency(data?.recentPayments?.filter(p => {
            const today = new Date(); today.setHours(0,0,0,0);
            return new Date(p.createdAt) >= today;
          }).reduce((s, p) => s + p.amount, 0) || 0)}</p>
        </div>
      </div>

      {/* Customer List */}
      <SearchInput value={search} onChange={setSearch} placeholder="Customer ka naam ya phone..." className="max-w-md mx-auto" />

      <div className="space-y-2">
        {filtered.length === 0 ? <EmptyState title="Koi udhar nahi hai" /> : (
          filtered.map(c => (
            <div key={c._id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 font-bold text-lg">{c.customerName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-heading font-semibold text-slate-800">{c.customerName}</p>
                  <p className="text-xs text-slate-400">{c.phone} · Limit: {formatCurrency(c.creditLimit)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono font-bold text-lg text-red-600">{formatCurrency(c.currentBalance)}</p>
                  <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (c.currentBalance / (c.creditLimit || 1)) * 100)}%` }} />
                  </div>
                </div>
                <button onClick={() => handlePayment(c)} className="btn-success btn-sm">
                  <HiOutlineCash className="w-4 h-4" /> Wapsi
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Credit Sales & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-3">Recent Udhar Sales</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {data?.recentCredit?.slice(0, 15).map(s => {
              const creditAmt = s.payments?.find(p => p.method === 'credit')?.amount || 0;
              return (
                <div key={s._id} className="flex justify-between text-sm p-2 rounded-lg bg-red-50">
                  <div><span className="font-mono text-xs text-brand-600">{s.invoiceNo}</span> · <span>{s.customerName}</span></div>
                  <span className="font-mono font-semibold text-red-600">+{formatCurrency(creditAmt)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-3">Recent Payments Received</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {data?.recentPayments?.slice(0, 15).map(p => (
              <div key={p._id} className="flex justify-between text-sm p-2 rounded-lg bg-emerald-50">
                <div><span>{p.customerId?.customerName || 'Unknown'}</span> · <span className="text-xs text-slate-400">{formatDate(p.createdAt)}</span></div>
                <span className="font-mono font-semibold text-emerald-600">-{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
