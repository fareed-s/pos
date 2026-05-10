import { useState, useEffect } from 'react';
import { purchaseAPI, supplierAPI, productAPI } from '../utils/api';
import { formatCurrency, formatDateTime, getStatusColor } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader, Searchable } from '../components/common';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlinePlus, HiOutlineEye, HiOutlineClipboardCheck, HiOutlineCash,
  HiOutlineBan, HiOutlineClipboardList, HiOutlineLightBulb, HiOutlineTrash,
} from 'react-icons/hi';

export default function Purchases() {
  const { can } = useAuth();
  const canAdd = can('purchases', 'add');
  const [orders, setOrders] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Create form
  const [poForm, setPOForm] = useState({ supplierId: '', items: [], tax: 0, discount: 0, notes: '', expectedDeliveryDate: '' });
  const [newItem, setNewItem] = useState({ productId: '', productName: '', quantity: 1, unitCost: 0 });

  useEffect(() => { fetchOrders(); fetchSuppliers(); fetchProducts(); }, [page, search, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await purchaseAPI.getAll({ page, limit: 20, search, status: statusFilter });
      setOrders(res.data.data); setTotals(res.data.totals); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  };

  const fetchSuppliers = async () => { try { const r = await supplierAPI.getAll({ limit: 100, status: 'active' }); setSuppliers(r.data.data); } catch {} };
  const fetchProducts = async () => { try { const r = await productAPI.getAll({ limit: 500, status: 'active' }); setProducts(r.data.data); } catch {} };

  const addItem = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.unitCost) return toast.error('Fill all item fields');
    setPOForm(f => ({ ...f, items: [...f.items, { ...newItem, lineTotal: newItem.quantity * newItem.unitCost }] }));
    setNewItem({ productId: '', productName: '', quantity: 1, unitCost: 0 });
  };

  const removeItem = (idx) => setPOForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleProductSelect = (productId) => {
    const p = products.find(pr => pr._id === productId);
    if (p) setNewItem(n => ({ ...n, productId: p._id, productName: p.productName, unitCost: p.costPrice }));
  };

  const handleCreate = async (status = 'draft') => {
    if (!poForm.supplierId) return toast.error('Select a supplier');
    if (poForm.items.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await purchaseAPI.create({ ...poForm, status });
      toast.success(`PO created as ${status}`);
      setShowCreate(false);
      setPOForm({ supplierId: '', items: [], tax: 0, discount: 0, notes: '', expectedDeliveryDate: '' });
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const viewDetail = async (id) => {
    try { const r = await purchaseAPI.getOne(id); setSelectedPO(r.data.data); setShowDetail(true); }
    catch { toast.error('Failed'); }
  };

  const openReceive = async (id) => {
    try { const r = await purchaseAPI.getOne(id); setSelectedPO(r.data.data); setShowReceive(true); }
    catch { toast.error('Failed'); }
  };

  const [receiveItems, setReceiveItems] = useState([]);
  useEffect(() => {
    if (selectedPO && showReceive) {
      setReceiveItems(selectedPO.items.map(i => ({
        productId: i.productId, productName: i.productName,
        ordered: i.quantity, alreadyReceived: i.receivedQuantity,
        remaining: i.quantity - i.receivedQuantity, receivedQuantity: i.quantity - i.receivedQuantity,
      })));
    }
  }, [selectedPO, showReceive]);

  const handleReceive = async () => {
    setSaving(true);
    try {
      const items = receiveItems.filter(i => i.receivedQuantity > 0).map(i => ({ productId: i.productId, receivedQuantity: i.receivedQuantity }));
      const res = await purchaseAPI.receiveStock(selectedPO._id, { items });
      toast.success(res.data.message);
      setShowReceive(false); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePayment = async (po) => {
    const { value: amount } = await Swal.fire({
      title: 'Record Payment', input: 'number', inputLabel: `Balance due: ${formatCurrency(po.balanceDue)}`,
      inputPlaceholder: 'Amount', showCancelButton: true, inputValue: po.balanceDue,
      inputValidator: (v) => { if (!v || Number(v) <= 0) return 'Enter valid amount'; },
    });
    if (amount) {
      try { await purchaseAPI.recordPayment(po._id, { amount: Number(amount) }); toast.success('Payment recorded'); fetchOrders(); }
      catch { toast.error('Failed'); }
    }
  };

  const handleCancel = async (po) => {
    const r = await Swal.fire({ title: 'Cancel PO?', text: `Cancel ${po.poNumber}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626' });
    if (r.isConfirmed) {
      try { await purchaseAPI.cancel(po._id); toast.success('PO cancelled'); fetchOrders(); } catch { toast.error('Failed'); }
    }
  };

  const fetchSuggestions = async () => {
    try { const r = await purchaseAPI.getReorderSuggestions(); setSuggestions(r.data.data); setShowSuggestions(true); }
    catch { toast.error('Failed'); }
  };

  const poSubtotal = poForm.items.reduce((s, i) => s + i.lineTotal, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-heading font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-slate-500 text-sm">Total: {formatCurrency(totals.totalAmount || 0)} · Due: <span className="text-red-600 font-semibold">{formatCurrency(totals.totalDue || 0)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSuggestions} className="btn-secondary"><HiOutlineLightBulb className="w-5 h-5" /> Reorder Suggestions</button>
          {canAdd && <button onClick={() => setShowCreate(true)} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> New PO</button>}
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search PO#..." className="flex-1 min-w-[180px]" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">All Status</option>
          {['draft','ordered','partially_received','received','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : orders.length === 0 ? (
        <EmptyState icon={HiOutlineClipboardList} title="No purchase orders" action={() => setShowCreate(true)} actionLabel="Create PO" />
      ) : (
        <div className="table-container bg-white">
          <table className="data-table">
            <thead><tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Items</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Status</th><th>Payment</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {orders.map(po => (
                <tr key={po._id}>
                  <td><span className="font-mono text-xs font-semibold text-brand-600">{po.poNumber}</span></td>
                  <td className="text-sm">{po.supplierId?.supplierName || '-'}</td>
                  <td className="text-sm text-slate-500">{formatDateTime(po.orderDate)}</td>
                  <td className="text-sm">{po.items?.length}</td>
                  <td className="text-right font-mono text-sm">{formatCurrency(po.grandTotal)}</td>
                  <td className="text-right font-mono text-sm text-emerald-600">{formatCurrency(po.amountPaid)}</td>
                  <td className="text-right font-mono text-sm text-red-600">{formatCurrency(po.balanceDue)}</td>
                  <td><span className={`badge ${getStatusColor(po.status)}`}>{po.status.replace('_',' ')}</span></td>
                  <td><span className={`badge ${getStatusColor(po.paymentStatus)}`}>{po.paymentStatus}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => viewDetail(po._id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="View"><HiOutlineEye className="w-4 h-4" /></button>
                      {!['received','cancelled'].includes(po.status) && (
                        <button onClick={() => openReceive(po._id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" title="Receive"><HiOutlineClipboardCheck className="w-4 h-4" /></button>
                      )}
                      {po.balanceDue > 0 && po.status !== 'cancelled' && (
                        <button onClick={() => handlePayment(po)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Payment"><HiOutlineCash className="w-4 h-4" /></button>
                      )}
                      {!['received','cancelled'].includes(po.status) && (
                        <button onClick={() => handleCancel(po)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Cancel"><HiOutlineBan className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      {/* Create PO Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Supplier *</label>
              <Searchable
                value={poForm.supplierId}
                onChange={(v) => setPOForm(f => ({ ...f, supplierId: v }))}
                options={suppliers.map(s => ({
                  value: s._id,
                  label: `${s.supplierName}${s.companyName ? ` (${s.companyName})` : ''}`,
                }))}
                placeholder="Select supplier"
              />
            </div>
            <div><label className="input-label">Expected Delivery</label><input type="date" value={poForm.expectedDeliveryDate} onChange={(e) => setPOForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))} className="input-field" /></div>
          </div>

          {/* Add items */}
          <div>
            <label className="input-label">Add Items</label>
            <div className="flex gap-2 items-end">
              <div className="flex-[3]">
                <Searchable
                  value={newItem.productId}
                  onChange={(v) => handleProductSelect(v)}
                  options={products.map(p => ({
                    value: p._id,
                    label: `${p.productName} (Stock: ${p.currentStock})`,
                  }))}
                  placeholder="Select product (search by name / SKU)"
                />
              </div>
              <div className="flex-1"><input type="number" value={newItem.quantity} onChange={(e) => setNewItem(n => ({ ...n, quantity: Number(e.target.value) }))} className="input-field text-sm font-mono" placeholder="Qty" min={1} /></div>
              <div className="flex-1"><input type="number" value={newItem.unitCost} onChange={(e) => setNewItem(n => ({ ...n, unitCost: Number(e.target.value) }))} className="input-field text-sm font-mono" placeholder="Cost" min={0} /></div>
              <button onClick={addItem} className="btn-primary btn-sm"><HiOutlinePlus className="w-4 h-4" /></button>
            </div>
          </div>

          {poForm.items.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Cost</th><th className="text-right">Total</th><th></th></tr></thead>
                <tbody>
                  {poForm.items.map((item, i) => (
                    <tr key={i}>
                      <td className="font-medium text-sm">{item.productName}</td>
                      <td className="text-right font-mono text-sm">{item.quantity}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(item.unitCost)}</td>
                      <td className="text-right font-mono text-sm font-semibold">{formatCurrency(item.lineTotal)}</td>
                      <td className="text-right"><button onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-600"><HiOutlineTrash className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono font-semibold">{formatCurrency(poSubtotal)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t border-slate-200"><span>Grand Total</span><span className="font-mono">{formatCurrency(poSubtotal)}</span></div>
          </div>

          <div><label className="input-label">Notes</label><textarea value={poForm.notes} onChange={(e) => setPOForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} /></div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => handleCreate('draft')} disabled={saving} className="btn-secondary">Save Draft</button>
            <button onClick={() => handleCreate('ordered')} disabled={saving} className="btn-primary">Create & Order</button>
          </div>
        </div>
      </Modal>

      {/* Receive Stock Modal */}
      <Modal isOpen={showReceive} onClose={() => setShowReceive(false)} title={`Receive Stock: ${selectedPO?.poNumber || ''}`} size="lg">
        {selectedPO && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Enter received quantities for each item</p>
            <div className="space-y-2">
              {receiveItems.map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-slate-400">Ordered: {item.ordered} · Received: {item.alreadyReceived} · Remaining: {item.remaining}</p>
                  </div>
                  <input type="number" value={item.receivedQuantity}
                    onChange={(e) => { const items = [...receiveItems]; items[i].receivedQuantity = Math.min(item.remaining, Number(e.target.value)); setReceiveItems(items); }}
                    className="w-20 text-center font-mono border rounded-lg px-2 py-1.5" min={0} max={item.remaining} disabled={item.remaining <= 0} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button onClick={() => setShowReceive(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleReceive} disabled={saving} className="btn-success">{saving ? '...' : 'Confirm Receipt'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`PO: ${selectedPO?.poNumber || ''}`} size="lg">
        {selectedPO && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-400">Supplier:</span> <span className="font-medium">{selectedPO.supplierId?.supplierName}</span></div>
              <div><span className="text-slate-400">Status:</span> <span className={`badge ${getStatusColor(selectedPO.status)} ml-1`}>{selectedPO.status.replace('_',' ')}</span></div>
              <div><span className="text-slate-400">Order Date:</span> {formatDateTime(selectedPO.orderDate)}</div>
              <div><span className="text-slate-400">Payment:</span> <span className={`badge ${getStatusColor(selectedPO.paymentStatus)} ml-1`}>{selectedPO.paymentStatus}</span></div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Product</th><th className="text-right">Ordered</th><th className="text-right">Received</th><th className="text-right">Cost</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {selectedPO.items.map((item, i) => (
                    <tr key={i}>
                      <td className="font-medium">{item.productName}</td>
                      <td className="text-right font-mono">{item.quantity}</td>
                      <td className="text-right font-mono"><span className={item.receivedQuantity >= item.quantity ? 'text-emerald-600' : 'text-amber-600'}>{item.receivedQuantity}</span></td>
                      <td className="text-right font-mono">{formatCurrency(item.unitCost)}</td>
                      <td className="text-right font-mono font-semibold">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between"><span>Grand Total</span><span className="font-mono font-bold">{formatCurrency(selectedPO.grandTotal)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span className="font-mono">{formatCurrency(selectedPO.amountPaid)}</span></div>
              <div className="flex justify-between text-red-600 font-semibold"><span>Balance Due</span><span className="font-mono">{formatCurrency(selectedPO.balanceDue)}</span></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reorder Suggestions */}
      <Modal isOpen={showSuggestions} onClose={() => setShowSuggestions(false)} title="Reorder Suggestions" size="lg">
        {suggestions.length === 0 ? <p className="text-center text-slate-400 py-4">All products are well stocked!</p> : (
          <div className="space-y-2">
            <p className="text-sm text-slate-500 mb-3">Products at or below reorder level</p>
            {suggestions.map(p => (
              <div key={p._id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.productName}</p>
                  <p className="text-xs text-slate-400">Stock: <span className="text-red-600 font-semibold">{p.currentStock}</span> / Reorder at: {p.reorderLevel} · {p.supplier?.supplierName || 'No supplier'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{formatCurrency(p.costPrice)}</p>
                  <p className="text-[10px] text-slate-400">Suggested: {Math.max(p.reorderLevel * 2 - p.currentStock, p.lowStockThreshold)} {p.unit}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
