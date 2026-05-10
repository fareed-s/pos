import { useState, useEffect } from 'react';
import { bakeryAPI, productAPI } from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { PageLoader, EmptyState, Modal, Pagination, Searchable } from '../components/common';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ProductionLogPage() {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ productId: '', quantity: 1, costPerUnit: 0 });
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchData(); fetchProducts(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await bakeryAPI.getProduction({ page, limit: 20 }); setLogs(res.data.data); setPagination(res.data.pagination); }
    catch {} finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try { const r = await productAPI.getAll({ limit: 500, status: 'active' }); setProducts(r.data.data); } catch {}
  };

  const addItem = () => {
    if (!newItem.productId) return toast.error('Product select karo');
    const p = products.find(pr => pr._id === newItem.productId);
    setItems(prev => [...prev, { ...newItem, productName: p?.productName || '', totalCost: newItem.quantity * newItem.costPerUnit }]);
    setNewItem({ productId: '', quantity: 1, costPerUnit: 0 });
  };

  const handleProductSelect = (id) => {
    const p = products.find(pr => pr._id === id);
    setNewItem(n => ({ ...n, productId: id, costPerUnit: p?.costPrice || 0 }));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return toast.error('Items add karo');
    setSaving(true);
    try {
      await bakeryAPI.createProduction({ items, notes });
      toast.success('Production record ho gayi — stock update ho gaya!');
      setShowModal(false); setItems([]); setNotes('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">🏭 Production Log</h1>
          <p className="text-slate-500 text-sm">Aaj kitna banaya — stock automatic update hoga</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> New Production</button>
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? <EmptyState title="No production logged" /> : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log._id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-heading font-semibold text-slate-800">{formatDateTime(log.date)}</p>
                  <p className="text-xs text-slate-400">By {log.createdByName} · {log.items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-brand-600">{log.totalItemsProduced} units</p>
                  <p className="text-xs text-slate-400">Cost: {formatCurrency(log.totalProductionCost)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {log.items.map((item, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                    {item.productName} × {item.quantity}
                  </span>
                ))}
              </div>
              {log.notes && <p className="text-xs text-slate-400 mt-2">📝 {log.notes}</p>}
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Today's Production" size="lg">
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-[3]">
              <label className="input-label">Product</label>
              <Searchable
                value={newItem.productId}
                onChange={(v) => handleProductSelect(v)}
                options={products.map(p => ({ value: p._id, label: p.productName }))}
                placeholder="Select product (search…)"
              />
            </div>
            <div className="flex-1">
              <label className="input-label">Qty</label>
              <input type="number" value={newItem.quantity} onChange={(e) => setNewItem(n => ({ ...n, quantity: Number(e.target.value) }))} className="input-field font-mono" min={1} />
            </div>
            <div className="flex-1">
              <label className="input-label">Cost/unit</label>
              <input type="number" value={newItem.costPerUnit} onChange={(e) => setNewItem(n => ({ ...n, costPerUnit: Number(e.target.value) }))} className="input-field font-mono" min={0} />
            </div>
            <button onClick={addItem} className="btn-primary btn-sm mb-0.5"><HiOutlinePlus className="w-4 h-4" /></button>
          </div>

          {items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="font-medium text-sm">{item.productName} × {item.quantity}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{formatCurrency(item.totalCost)}</span>
                    <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><HiOutlineTrash className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <div className="text-right font-heading font-bold text-lg text-brand-600">
                Total: {items.reduce((s, i) => s + i.quantity, 0)} items · {formatCurrency(items.reduce((s, i) => s + i.totalCost, 0))}
              </div>
            </div>
          )}

          <div><label className="input-label">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} placeholder="e.g. Subah ki production" /></div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? '...' : 'Save & Update Stock'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
