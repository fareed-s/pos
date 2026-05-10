import { useState, useEffect } from 'react';
import { bakeryAPI } from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { PageLoader, EmptyState, Modal, Pagination } from '../components/common';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineCash } from 'react-icons/hi';

export default function CashHandoverPage() {
  const [handovers, setHandovers] = useState([]);
  const [totalHanded, setTotalHanded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', receivedBy: 'Mukhtar Bhai', notes: '', denomination: { n5000: 0, n1000: 0, n500: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0 } });

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await bakeryAPI.getHandovers({ page, limit: 20 });
      setHandovers(res.data.data); setTotalHanded(res.data.totalHandedOver); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  };

  const denomTotal = form.denomination.n5000 * 5000 + form.denomination.n1000 * 1000 + form.denomination.n500 * 500 + form.denomination.n100 * 100 + form.denomination.n50 * 50 + form.denomination.n20 * 20 + form.denomination.n10 * 10 + form.denomination.coins;

  const handleDenomChange = (key, val) => {
    setForm(f => ({ ...f, denomination: { ...f.denomination, [key]: Number(val) || 0 } }));
  };

  useEffect(() => { if (denomTotal > 0) setForm(f => ({ ...f, amount: denomTotal })); }, [denomTotal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return toast.error('Amount daalo');
    setSaving(true);
    try {
      await bakeryAPI.createHandover({ ...form, amount: Number(form.amount) });
      toast.success('Cash handover recorded!');
      setShowModal(false);
      setForm({ amount: '', receivedBy: 'Mukhtar Bhai', notes: '', denomination: { n5000: 0, n1000: 0, n500: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0 } });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">💰 Cash Jama (Handover)</h1>
          <p className="text-slate-500 text-sm">Din ki sale ka paisa Bhai ko diya — record rakhein</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-success"><HiOutlinePlus className="w-5 h-5" /> Cash Jama Karo</button>
      </div>

      <div className="card p-5 text-center bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <HiOutlineCash className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm text-emerald-500">Total Cash Jama Kiya</p>
        <p className="text-3xl font-heading font-bold text-emerald-700">{formatCurrency(totalHanded)}</p>
      </div>

      {loading ? <PageLoader /> : handovers.length === 0 ? <EmptyState title="No handovers yet" /> : (
        <div className="space-y-2">
          {handovers.map(h => (
            <div key={h._id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold text-slate-800">{h.handedByName}</p>
                <p className="text-xs text-slate-400">{formatDateTime(h.date)} · To: {h.receivedBy}</p>
                {h.notes && <p className="text-xs text-slate-500 mt-1">📝 {h.notes}</p>}
              </div>
              <p className="font-mono font-bold text-xl text-emerald-600">{formatCurrency(h.amount)}</p>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cash Jama Karo" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Denomination Counter */}
          <div>
            <label className="input-label">Noto ki Ginti (Optional)</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'n5000', label: '5000', color: 'text-purple-600' },
                { key: 'n1000', label: '1000', color: 'text-blue-600' },
                { key: 'n500', label: '500', color: 'text-emerald-600' },
                { key: 'n100', label: '100', color: 'text-amber-600' },
                { key: 'n50', label: '50', color: 'text-red-600' },
                { key: 'n20', label: '20', color: 'text-slate-600' },
                { key: 'n10', label: '10', color: 'text-slate-500' },
                { key: 'coins', label: 'Coins', color: 'text-slate-400' },
              ].map(d => (
                <div key={d.key} className="text-center">
                  <label className={`text-[10px] font-bold ${d.color}`}>Rs. {d.label}</label>
                  <input type="number" value={form.denomination[d.key]} onChange={(e) => handleDenomChange(d.key, e.target.value)}
                    className="w-full text-center text-sm font-mono border rounded-lg px-1 py-1.5 mt-0.5" min={0} />
                </div>
              ))}
            </div>
            {denomTotal > 0 && (
              <p className="text-right font-mono font-bold text-lg text-brand-600 mt-2">Ginti Total: {formatCurrency(denomTotal)}</p>
            )}
          </div>

          <div><label className="input-label">Total Amount *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field font-mono text-xl text-center" min={1} required />
          </div>
          <div><label className="input-label">Kisko Diya</label>
            <input value={form.receivedBy} onChange={(e) => setForm(f => ({ ...f, receivedBy: e.target.value }))} className="input-field" />
          </div>
          <div><label className="input-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} placeholder="e.g. Raat ki sale ka paisa" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-success">{saving ? '...' : 'Jama Karo'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
