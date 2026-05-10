import { useState, useEffect } from 'react';
import { bakeryAPI, productAPI } from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { PageLoader, EmptyState, Modal, Pagination, Searchable } from '../components/common';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineExclamationCircle } from 'react-icons/hi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const REASONS = ['expired', 'damaged', 'unsold', 'stale', 'burnt', 'other'];
const REASON_LABELS = { expired: 'Expire Ho Gaya', damaged: 'Toot/Kharab', unsold: 'Bika Nahi', stale: 'Baasi Ho Gaya', burnt: 'Jal Gaya', other: 'Other' };
const COLORS = ['#DC2626', '#D97706', '#7C3AED', '#2563EB', '#059669', '#94A3B8'];

export default function WastageTracker() {
  const [wastages, setWastages] = useState([]);
  const [totals, setTotals] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: 1, reason: 'unsold', notes: '' });

  useEffect(() => { fetchData(); fetchProducts(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await bakeryAPI.getWastages({ page, limit: 20 }); setWastages(res.data.data); setTotals(res.data.totals); setPagination(res.data.pagination); }
    catch {} finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try { const r = await productAPI.getAll({ limit: 500, status: 'active' }); setProducts(r.data.data); } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId) return toast.error('Product select karo');
    setSaving(true);
    try {
      await bakeryAPI.createWastage(form);
      toast.success('Wastage record ho gaya');
      setShowModal(false);
      setForm({ productId: '', quantity: 1, reason: 'unsold', notes: '' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const pieData = totals.byReason?.map(r => ({ name: REASON_LABELS[r._id] || r._id, value: r.loss })) || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">🗑️ Wastage / Expire Tracker</h1>
          <p className="text-slate-500 text-sm">Kitna waste hua, kitna nuqsaan — sab record</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-danger"><HiOutlinePlus className="w-5 h-5" /> Record Wastage</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5 text-center bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <HiOutlineExclamationCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-500">Total Nuqsaan</p>
          <p className="text-3xl font-heading font-bold text-red-700">{formatCurrency(totals.totalLoss || 0)}</p>
          <p className="text-xs text-red-400 mt-1">{totals.totalItems || 0} items wasted</p>
        </div>
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-heading font-semibold text-slate-700 mb-2">Reason Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={60} innerRadius={35} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={v => formatCurrency(v)} /></PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 py-8">No data</p>}
        </div>
      </div>

      {loading ? <PageLoader /> : wastages.length === 0 ? <EmptyState icon={HiOutlineTrash} title="No wastage recorded" /> : (
        <div className="table-container bg-white">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Product</th><th>Reason</th><th className="text-right">Qty</th><th className="text-right">Nuqsaan</th><th>By</th></tr></thead>
            <tbody>
              {wastages.map(w => (
                <tr key={w._id}>
                  <td className="text-sm text-slate-500">{formatDateTime(w.date)}</td>
                  <td className="font-medium">{w.productName}</td>
                  <td><span className="badge badge-danger">{REASON_LABELS[w.reason] || w.reason}</span></td>
                  <td className="text-right font-mono">{w.quantity}</td>
                  <td className="text-right font-mono font-semibold text-red-600">{formatCurrency(w.totalLoss)}</td>
                  <td className="text-sm text-slate-500">{w.recordedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Wastage" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="input-label">Product *</label>
            <Searchable
              value={form.productId}
              onChange={(v) => setForm(f => ({ ...f, productId: v }))}
              options={products.map(p => ({
                value: p._id,
                label: `${p.productName} (Stock: ${p.currentStock})`,
              }))}
              placeholder="Select product (search…)"
            />
          </div>
          <div><label className="input-label">Quantity *</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="input-field font-mono text-lg text-center" min={1} required />
          </div>
          <div><label className="input-label">Reason *</label>
            <select value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} className="input-field">
              {REASONS.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
            </select>
          </div>
          <div><label className="input-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-danger">{saving ? '...' : 'Record Wastage'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
