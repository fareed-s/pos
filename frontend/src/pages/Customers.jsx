import { useState, useEffect } from 'react';
import { customerAPI } from '../utils/api';
import { formatCurrency, formatDateTime, formatDate, getStatusColor } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader } from '../components/common';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUsers, HiOutlineEye,
  HiOutlineCash, HiOutlineStar, HiOutlineCreditCard, HiOutlineClipboardList,
} from 'react-icons/hi';

export default function Customers() {
  const { can } = useAuth();
  const canAdd = can('customers', 'add');
  const canEdit = can('customers', 'edit');
  const canDelete = can('customers', 'delete');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editCust, setEditCust] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);

  const emptyForm = {
    customerName: '', phone: '', email: '', customerType: 'regular',
    priceLevel: 'retail', creditLimit: 0, notes: '', tags: '',
    address: { street: '', city: '', area: '' },
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCustomers(); }, [page, search, typeFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.getAll({ page, limit: 20, search, type: typeFilter });
      setCustomers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setForm(f => ({ ...f, [parent]: { ...(f[parent] || {}), [child]: value } }));
    } else {
      setForm(f => ({ ...f, [name]: name === 'creditLimit' ? Number(value) : value }));
    }
  };

  const openCreate = () => { setEditCust(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditCust(c);
    setForm({
      customerName: c.customerName, phone: c.phone, email: c.email || '',
      customerType: c.customerType, priceLevel: c.priceLevel || 'retail',
      creditLimit: c.creditLimit || 0, notes: c.notes || '', tags: c.tags?.join(', ') || '',
      address: c.address || { street: '', city: '', area: '' },
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (editCust) {
        await customerAPI.update(editCust._id, data);
        toast.success('Customer updated');
      } else {
        await customerAPI.create(data);
        toast.success('Customer created');
      }
      setShowModal(false); fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    const r = await Swal.fire({ title: 'Deactivate?', text: c.customerName, icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626' });
    if (r.isConfirmed) {
      try { await customerAPI.delete(c._id); toast.success('Deactivated'); fetchCustomers(); } catch { toast.error('Failed'); }
    }
  };

  const handleRecordPayment = async (customer) => {
    // Escape any HTML in user-controlled values before injecting into Swal `html`
    const escapeHtml = (s) => String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const safeName = escapeHtml(customer.customerName);
    const safeBal = Number(customer.currentBalance || 0).toFixed(2);
    const { value: amount } = await Swal.fire({
      title: 'Record Payment',
      html: `<p class="text-sm text-gray-500 mb-2">Customer: <strong>${safeName}</strong></p><p class="text-sm">Outstanding: <strong class="text-red-600">Rs. ${safeBal}</strong></p>`,
      input: 'number', inputLabel: 'Payment Amount', showCancelButton: true,
      inputValue: customer.currentBalance,
      inputValidator: (v) => {
        if (!v || Number(v) <= 0) return 'Enter valid amount';
        if (Number(v) > Number(customer.currentBalance || 0) + 0.001) return 'Cannot exceed outstanding balance';
      },
    });
    if (amount) {
      try {
        await customerAPI.recordPayment(customer._id, { amount: Number(amount), method: 'cash' });
        toast.success('Payment recorded');
        fetchCustomers();
      } catch { toast.error('Failed'); }
    }
  };

  const viewStatement = async (customer) => {
    try {
      const res = await customerAPI.getStatement(customer._id);
      setStatementData(res.data.data);
      setShowStatement(true);
    } catch { toast.error('Failed'); }
  };

  const viewHistory = async (customer) => {
    setSelectedCust(customer);
    try {
      const res = await customerAPI.getHistory(customer._id, { limit: 50 });
      setHistoryData(res.data.data);
      setShowHistory(true);
    } catch { toast.error('Failed'); }
  };

  if (loading) return <PageLoader />;

  // Stats
  const totalCredit = customers.reduce((s, c) => s + (c.currentBalance || 0), 0);
  const wholesaleCount = customers.filter(c => c.customerType === 'wholesale').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm">{pagination.total || 0} customers · Credit outstanding: <span className="text-red-600 font-semibold">{formatCurrency(totalCredit)}</span></p>
        </div>
        {canAdd && <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> Add Customer</button>}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name or phone..." className="flex-1 min-w-[200px]" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">All Types</option>
          <option value="regular">Regular</option>
          <option value="wholesale">Wholesale</option>
          <option value="vip">VIP</option>
          <option value="walk-in">Walk-in</option>
        </select>
      </div>

      {customers.length === 0 ? (
        <EmptyState icon={HiOutlineUsers} title="No customers yet" action={openCreate} actionLabel="Add Customer" />
      ) : (
        <div className="table-container bg-white">
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Phone</th><th>Type</th><th className="text-right">Total Spent</th><th className="text-right">Credit Balance</th><th className="text-right">Loyalty Pts</th><th>Last Purchase</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        c.customerType === 'vip' ? 'bg-amber-100 text-amber-700' :
                        c.customerType === 'wholesale' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.customerType === 'vip' ? <HiOutlineStar className="w-4 h-4" /> : <HiOutlineUsers className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.customerName}</p>
                        {c.email && <p className="text-[10px] text-slate-400">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{c.phone}</td>
                  <td><span className={`badge ${c.customerType === 'vip' ? 'badge-warning' : c.customerType === 'wholesale' ? 'badge-purple' : 'badge-info'}`}>{c.customerType}</span></td>
                  <td className="text-right font-mono text-sm">{formatCurrency(c.totalSpent || 0)}</td>
                  <td className="text-right">
                    <span className={`font-mono text-sm font-semibold ${c.currentBalance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {formatCurrency(c.currentBalance || 0)}
                    </span>
                    {c.currentBalance > 0 && c.creditLimit > 0 && (
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                        <div className="bg-red-500 h-1 rounded-full" style={{ width: `${Math.min(100, (c.currentBalance / c.creditLimit) * 100)}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    <span className="font-mono text-sm">{c.loyaltyPoints || 0}</span>
                    <span className="text-[10px] text-amber-500 ml-1">★</span>
                  </td>
                  <td className="text-sm text-slate-500">{c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : '-'}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => viewHistory(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="History"><HiOutlineClipboardList className="w-4 h-4" /></button>
                      {c.currentBalance > 0 && (
                        <>
                          <button onClick={() => viewStatement(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Statement"><HiOutlineCreditCard className="w-4 h-4" /></button>
                          <button onClick={() => handleRecordPayment(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" title="Record Payment"><HiOutlineCash className="w-4 h-4" /></button>
                        </>
                      )}
                      {canEdit && <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Edit"><HiOutlinePencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete"><HiOutlineTrash className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editCust ? 'Edit Customer' : 'New Customer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Name *</label><input name="customerName" value={form.customerName} onChange={handleChange} className="input-field" required /></div>
            <div><label className="input-label">Phone *</label><input name="phone" value={form.phone} onChange={handleChange} className="input-field" required /></div>
            <div><label className="input-label">Email</label><input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" /></div>
            <div><label className="input-label">Type</label>
              <select name="customerType" value={form.customerType} onChange={handleChange} className="input-field">
                <option value="regular">Regular</option><option value="wholesale">Wholesale</option><option value="vip">VIP</option><option value="walk-in">Walk-in</option>
              </select>
            </div>
            <div><label className="input-label">Price Level</label>
              <select name="priceLevel" value={form.priceLevel} onChange={handleChange} className="input-field">
                <option value="retail">Retail</option><option value="wholesale">Wholesale</option>
              </select>
            </div>
            <div><label className="input-label">Credit Limit</label><input type="number" name="creditLimit" value={form.creditLimit} onChange={handleChange} className="input-field font-mono" min={0} /></div>
            <div><label className="input-label">City</label><input name="address.city" value={form.address.city} onChange={handleChange} className="input-field" /></div>
            <div><label className="input-label">Area</label><input name="address.area" value={form.address.area} onChange={handleChange} className="input-field" /></div>
          </div>
          <div><label className="input-label">Tags (comma separated)</label><input name="tags" value={form.tags} onChange={handleChange} className="input-field" placeholder="e.g. bulk-buyer, premium" /></div>
          <div><label className="input-label">Notes</label><textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={2} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : editCust ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>

      {/* Statement Modal */}
      <Modal isOpen={showStatement} onClose={() => setShowStatement(false)} title={`Statement: ${statementData?.customer?.customerName || ''}`} size="lg">
        {statementData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Credit Limit</p>
                <p className="font-mono font-bold text-lg">{formatCurrency(statementData.customer.creditLimit)}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-center">
                <p className="text-[10px] text-red-400 uppercase">Outstanding</p>
                <p className="font-mono font-bold text-lg text-red-600">{formatCurrency(statementData.customer.currentBalance)}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-center">
                <p className="text-[10px] text-emerald-400 uppercase">Available</p>
                <p className="font-mono font-bold text-lg text-emerald-600">{formatCurrency(Math.max(0, statementData.customer.creditLimit - statementData.customer.currentBalance))}</p>
              </div>
            </div>

            <h4 className="font-heading font-semibold text-sm text-slate-700">Credit Sales</h4>
            {statementData.creditSales.length === 0 ? <p className="text-sm text-slate-400">No credit sales</p> : (
              <div className="space-y-1.5">
                {statementData.creditSales.map(s => {
                  const creditAmt = s.payments?.find(p => p.method === 'credit')?.amount || 0;
                  return (
                    <div key={s._id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm">
                      <div>
                        <span className="font-mono text-xs text-brand-600">{s.invoiceNo}</span>
                        <span className="text-slate-400 ml-2">{formatDate(s.saleDate)}</span>
                      </div>
                      <span className="font-mono font-semibold text-red-600">+{formatCurrency(creditAmt)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <h4 className="font-heading font-semibold text-sm text-slate-700">Payments Received</h4>
            {statementData.payments.length === 0 ? <p className="text-sm text-slate-400">No payments</p> : (
              <div className="space-y-1.5">
                {statementData.payments.map(p => (
                  <div key={p._id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm">
                    <div>
                      <span className="text-slate-400">{formatDateTime(p.createdAt)}</span>
                      <span className="ml-2 badge badge-info text-[10px]">{p.method}</span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-600">-{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Purchase History Modal */}
      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title={`History: ${selectedCust?.customerName || ''}`} size="lg">
        {historyData.length === 0 ? <EmptyState title="No purchase history" /> : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th className="text-right">Total</th><th>Payment</th></tr></thead>
              <tbody>
                {historyData.map(s => (
                  <tr key={s._id}>
                    <td className="font-mono text-xs font-semibold text-brand-600">{s.invoiceNo}</td>
                    <td className="text-sm text-slate-500">{formatDateTime(s.saleDate)}</td>
                    <td className="text-sm">{s.items?.length}</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(s.grandTotal)}</td>
                    <td>{s.payments?.map((p, i) => <span key={i} className="badge badge-info text-[10px] mr-1">{p.method}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
