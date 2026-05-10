import { useState, useEffect } from 'react';
import { supplierAPI } from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader } from '../components/common';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineTruck, HiOutlineEye, HiOutlineStar } from 'react-icons/hi';

export default function Suppliers() {
  const { can } = useAuth();
  const canAdd = can('suppliers', 'add');
  const canEdit = can('suppliers', 'edit');
  const canDelete = can('suppliers', 'delete');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);

  const emptyForm = {
    supplierName: '', companyName: '', email: '', phone: '', contactPerson: '',
    designation: '', paymentTerms: 'COD', rating: 3, notes: '',
    address: { street: '', city: '', state: '', country: '' },
    taxNumber: '', bankDetails: { bankName: '', accountNumber: '', branchCode: '' },
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchSuppliers(); }, [page, search]);

  const fetchSuppliers = async () => {
    try {
      const res = await supplierAPI.getAll({ page, limit: 20, search, status: 'active' });
      setSuppliers(res.data.data);
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
      setForm(f => ({ ...f, [name]: name === 'rating' ? Number(value) : value }));
    }
  };

  const openCreate = () => { setEditSupplier(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => {
    setEditSupplier(s);
    setForm({
      supplierName: s.supplierName, companyName: s.companyName || '', email: s.email || '',
      phone: s.phone, contactPerson: s.contactPerson || '', designation: s.designation || '',
      paymentTerms: s.paymentTerms || 'COD', rating: s.rating || 3, notes: s.notes || '',
      address: s.address || { street: '', city: '', state: '', country: '' },
      taxNumber: s.taxNumber || '', bankDetails: s.bankDetails || { bankName: '', accountNumber: '', branchCode: '' },
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editSupplier) {
        await supplierAPI.update(editSupplier._id, form);
        toast.success('Supplier updated');
      } else {
        await supplierAPI.create(form);
        toast.success('Supplier created');
      }
      setShowModal(false); fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s) => {
    const r = await Swal.fire({ title: 'Deactivate?', text: `${s.supplierName} will be deactivated.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626' });
    if (r.isConfirmed) {
      try { await supplierAPI.delete(s._id); toast.success('Deactivated'); fetchSuppliers(); }
      catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    }
  };

  const viewLedger = async (id) => {
    try { const res = await supplierAPI.getLedger(id); setLedgerData(res.data.data); setShowLedger(true); }
    catch { toast.error('Failed to load ledger'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-slate-800">Suppliers</h1><p className="text-slate-500 text-sm">{pagination.total || 0} suppliers</p></div>
        {canAdd && <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> Add Supplier</button>}
      </div>

      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search suppliers..." className="max-w-md" />

      {suppliers.length === 0 ? (
        <EmptyState icon={HiOutlineTruck} title="No suppliers yet" action={openCreate} actionLabel="Add Supplier" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {suppliers.map(s => (
            <div key={s._id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{s.supplierName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-800">{s.supplierName}</h3>
                    {s.companyName && <p className="text-xs text-slate-400">{s.companyName}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <HiOutlineStar key={i} className={`w-3.5 h-3.5 ${i < s.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 text-sm mb-3">
                <p className="text-slate-500">📞 {s.phone}</p>
                {s.email && <p className="text-slate-500">✉️ {s.email}</p>}
                <p className="text-slate-400 text-xs">Terms: {s.paymentTerms}</p>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 mb-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Purchases</p>
                  <p className="font-mono font-semibold text-sm">{s.totalPurchases || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Amount Due</p>
                  <p className={`font-mono font-semibold text-sm ${s.totalAmountDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(s.totalAmountDue || 0)}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <button onClick={() => viewLedger(s._id)} className="flex-1 btn-secondary btn-sm"><HiOutlineEye className="w-4 h-4" /> Ledger</button>
                {canEdit && <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Edit"><HiOutlinePencil className="w-4 h-4" /></button>}
                {canDelete && <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete"><HiOutlineTrash className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editSupplier ? 'Edit Supplier' : 'New Supplier'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Supplier Name *</label><input name="supplierName" value={form.supplierName} onChange={handleChange} className="input-field" required /></div>
            <div><label className="input-label">Company Name</label><input name="companyName" value={form.companyName} onChange={handleChange} className="input-field" /></div>
            <div><label className="input-label">Phone *</label><input name="phone" value={form.phone} onChange={handleChange} className="input-field" required /></div>
            <div><label className="input-label">Email</label><input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" /></div>
            <div><label className="input-label">Contact Person</label><input name="contactPerson" value={form.contactPerson} onChange={handleChange} className="input-field" /></div>
            <div><label className="input-label">Payment Terms</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className="input-field">
                <option value="COD">Cash on Delivery</option><option value="Net 15">Net 15</option><option value="Net 30">Net 30</option><option value="Net 60">Net 60</option><option value="Advance">Advance</option>
              </select>
            </div>
            <div><label className="input-label">City</label><input name="address.city" value={form.address.city} onChange={handleChange} className="input-field" /></div>
            <div><label className="input-label">Rating</label>
              <select name="rating" value={form.rating} onChange={handleChange} className="input-field">
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} Star{v>1?'s':''}</option>)}
              </select>
            </div>
          </div>
          <div><label className="input-label">Notes</label><textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={2} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : editSupplier ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>

      {/* Ledger Modal */}
      <Modal isOpen={showLedger} onClose={() => setShowLedger(false)} title={`Ledger: ${ledgerData?.supplier?.supplierName || ''}`} size="lg">
        {ledgerData && (
          <div>
            <div className="p-3 rounded-xl bg-slate-50 mb-4 text-center">
              <p className="text-sm text-slate-500">Outstanding Balance</p>
              <p className={`text-2xl font-heading font-bold ${ledgerData.supplier.totalAmountDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(ledgerData.supplier.totalAmountDue || 0)}
              </p>
            </div>
            {ledgerData.orders.length === 0 ? <p className="text-center text-slate-400 py-4">No purchase orders</p> : (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>PO#</th><th>Date</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Payment</th></tr></thead>
                  <tbody>
                    {ledgerData.orders.map(o => (
                      <tr key={o._id}>
                        <td className="font-mono text-xs font-semibold text-brand-600">{o.poNumber}</td>
                        <td className="text-sm text-slate-500">{formatDateTime(o.orderDate)}</td>
                        <td><span className={`badge ${o.status === 'received' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{o.status}</span></td>
                        <td className="text-right font-mono text-sm">{formatCurrency(o.grandTotal)}</td>
                        <td className="text-right font-mono text-sm text-emerald-600">{formatCurrency(o.amountPaid)}</td>
                        <td className="text-right font-mono text-sm text-red-600">{formatCurrency(o.balanceDue)}</td>
                        <td><span className={`badge ${o.paymentStatus === 'paid' ? 'badge-success' : o.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger'}`}>{o.paymentStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
