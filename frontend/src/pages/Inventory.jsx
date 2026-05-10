import { useState, useEffect } from 'react';
import { productAPI } from '../utils/api';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader } from '../components/common';
import { usePrivacy } from '../context/PrivacyContext';
import toast from 'react-hot-toast';
import { HiOutlineAdjustments, HiOutlineExclamationCircle, HiOutlinePlusCircle, HiOutlineMinusCircle, HiOutlineClipboardList } from 'react-icons/hi';

export default function Inventory() {
  const { maskCurrency: mC, maskNumber: mN } = usePrivacy();
  const [tab, setTab] = useState('stock'); // stock | low | adjustments
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'add', quantity: 1, reason: 'count_correction', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [tab, page, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'stock') {
        const res = await productAPI.getAll({ page, limit: 20, search, status: 'active' });
        setProducts(res.data.data);
        setPagination(res.data.pagination);
      } else if (tab === 'low') {
        const res = await productAPI.getLowStock();
        setLowStock(res.data.data);
      } else {
        const res = await productAPI.getStockAdjustments({ page, limit: 20 });
        setAdjustments(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const openAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustForm({ type: 'add', quantity: 1, reason: 'count_correction', notes: '' });
    setShowAdjust(true);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await productAPI.adjustStock({ productId: selectedProduct._id, ...adjustForm, quantity: Number(adjustForm.quantity) });
      toast.success('Stock adjusted');
      setShowAdjust(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const tabs = [
    { key: 'stock', label: 'All Stock', icon: HiOutlineClipboardList },
    { key: 'low', label: 'Low Stock', icon: HiOutlineExclamationCircle },
    { key: 'adjustments', label: 'Adjustments', icon: HiOutlineAdjustments },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold text-slate-800">Inventory Management</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.key === 'low' && lowStock.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{lowStock.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products..." className="max-w-md" />
          {loading ? <PageLoader /> : products.length === 0 ? <EmptyState title="No products" /> : (
            <div className="table-container bg-white">
              <table className="data-table">
                <thead><tr><th>Product</th><th>SKU</th><th className="text-right">Stock</th><th className="text-right">Low Alert</th><th className="text-right">Reorder At</th><th className="text-right">Stock Value</th><th>Unit</th><th className="text-right">Action</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id}>
                      <td className="font-medium">{p.productName}</td>
                      <td><span className="font-mono text-xs">{p.sku}</span></td>
                      <td className="text-right">
                        <span className={`font-mono font-semibold ${p.currentStock <= 0 ? 'text-red-600' : p.currentStock <= p.lowStockThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>{mN(p.currentStock)}</span>
                      </td>
                      <td className="text-right text-sm text-slate-500">{p.lowStockThreshold}</td>
                      <td className="text-right text-sm text-slate-500">{p.reorderLevel}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(mC(p.currentStock * p.costPrice))}</td>
                      <td className="text-sm text-slate-500">{p.unit}</td>
                      <td className="text-right">
                        <button onClick={() => openAdjust(p)} className="btn-secondary btn-sm"><HiOutlineAdjustments className="w-4 h-4" /> Adjust</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />
        </>
      )}

      {tab === 'low' && (
        loading ? <PageLoader /> : lowStock.length === 0 ? <EmptyState icon={HiOutlineExclamationCircle} title="All stocked up!" message="No products below low stock threshold" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map(p => (
              <div key={p._id} className={`card p-4 border-l-4 ${p.currentStock <= 0 ? 'border-l-red-500' : 'border-l-amber-500'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{p.productName}</p>
                    <p className="text-xs font-mono text-slate-400">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-mono font-bold ${p.currentStock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.currentStock}</p>
                    <p className="text-[10px] text-slate-400">of {p.lowStockThreshold} min</p>
                  </div>
                </div>
                <button onClick={() => openAdjust(p)} className="btn-primary btn-sm w-full mt-3"><HiOutlinePlusCircle className="w-4 h-4" /> Add Stock</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'adjustments' && (
        loading ? <PageLoader /> : adjustments.length === 0 ? <EmptyState title="No adjustments yet" /> : (
          <>
            <div className="table-container bg-white">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Product</th><th>Type</th><th className="text-right">Qty</th><th className="text-right">Before</th><th className="text-right">After</th><th>Reason</th><th>By</th></tr></thead>
                <tbody>
                  {adjustments.map(a => (
                    <tr key={a._id}>
                      <td className="text-sm text-slate-500">{formatDateTime(a.createdAt)}</td>
                      <td className="font-medium">{a.productName}</td>
                      <td><span className={`badge ${a.type === 'add' ? 'badge-success' : 'badge-danger'}`}>{a.type === 'add' ? '+ Add' : '- Subtract'}</span></td>
                      <td className="text-right font-mono font-semibold">{a.quantity}</td>
                      <td className="text-right font-mono text-slate-500">{a.previousStock}</td>
                      <td className="text-right font-mono font-medium">{a.newStock}</td>
                      <td className="text-sm text-slate-600 capitalize">{a.reason.replace('_', ' ')}</td>
                      <td className="text-sm text-slate-500">{a.adjustedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />
          </>
        )
      )}

      {/* Adjust Stock Modal */}
      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title={`Adjust Stock: ${selectedProduct?.productName}`} size="sm">
        <div className="mb-4 p-3 rounded-xl bg-slate-50 text-center">
          <p className="text-sm text-slate-500">Current Stock</p>
          <p className="text-3xl font-heading font-bold text-slate-800">{selectedProduct?.currentStock}</p>
        </div>
        <form onSubmit={handleAdjust} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAdjustForm(f => ({ ...f, type: 'add' }))} className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${adjustForm.type === 'add' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
              <HiOutlinePlusCircle className="w-6 h-6 mx-auto mb-1" /> Add Stock
            </button>
            <button type="button" onClick={() => setAdjustForm(f => ({ ...f, type: 'subtract' }))} className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${adjustForm.type === 'subtract' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}>
              <HiOutlineMinusCircle className="w-6 h-6 mx-auto mb-1" /> Remove Stock
            </button>
          </div>
          <div>
            <label className="input-label">Quantity *</label>
            <input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} className="input-field font-mono text-lg text-center" min="1" required />
          </div>
          <div>
            <label className="input-label">Reason *</label>
            <select value={adjustForm.reason} onChange={(e) => setAdjustForm(f => ({ ...f, reason: e.target.value }))} className="input-field">
              <option value="count_correction">Count Correction</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
              <option value="donation">Donation</option>
              <option value="returned">Returned</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea value={adjustForm.notes} onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} />
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <p className="text-sm text-slate-500">New Stock Will Be</p>
            <p className="text-2xl font-heading font-bold text-slate-800">
              {adjustForm.type === 'add' ? (selectedProduct?.currentStock || 0) + Number(adjustForm.quantity || 0) : (selectedProduct?.currentStock || 0) - Number(adjustForm.quantity || 0)}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button type="button" onClick={() => setShowAdjust(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className={adjustForm.type === 'add' ? 'btn-success' : 'btn-danger'}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
