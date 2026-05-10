import { useState, useEffect } from 'react';
import { expenseAPI } from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader, Searchable } from '../components/common';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCash } from 'react-icons/hi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#EC4899','#6366F1','#14B8A6'];

export default function Expenses() {
  const { can } = useAuth();
  const canAdd = can('expenses', 'add');
  const canEdit = can('expenses', 'edit');
  const canDelete = can('expenses', 'delete');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [catFilter, setCatFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { amount: '', category: '', date: new Date().toISOString().slice(0,10), description: '', paymentMethod: 'cash', isRecurring: false };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchExpenses(); fetchCategories(); }, [page, catFilter, startDate, endDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.getAll({ page, limit: 20, category: catFilter, startDate, endDate });
      setExpenses(res.data.data); setTotals(res.data.totals); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  };

  const fetchCategories = async () => { try { const r = await expenseAPI.getCategories(); setCategories(r.data.data); } catch {} };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : name === 'amount' ? (value === '' ? '' : Number(value)) : value }));
  };

  const openCreate = () => { setEditExp(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (exp) => {
    setEditExp(exp);
    setForm({ amount: exp.amount, category: exp.category, date: exp.date?.slice(0,10) || '', description: exp.description || '', paymentMethod: exp.paymentMethod, isRecurring: exp.isRecurring });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editExp) { await expenseAPI.update(editExp._id, form); toast.success('Updated'); }
      else { await expenseAPI.create(form); toast.success('Expense recorded'); }
      setShowModal(false); fetchExpenses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (exp) => {
    const r = await Swal.fire({ title: 'Delete expense?', text: `${exp.category} - ${formatCurrency(exp.amount)}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626' });
    if (r.isConfirmed) { try { await expenseAPI.delete(exp._id); toast.success('Deleted'); fetchExpenses(); } catch { toast.error('Failed'); } }
  };

  const pieData = totals.byCategory?.map(c => ({ name: c._id || 'Other', value: c.total })) || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-slate-800">Expenses</h1>
          <p className="text-slate-500 text-sm">Total: <span className="font-semibold text-red-600">{formatCurrency(totals.totalAmount || 0)}</span></p>
        </div>
        {canAdd && <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> Record Expense</button>}
      </div>

      {/* Summary + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <div className="flex flex-wrap gap-3 mb-0">
            <div className="w-44">
              <Searchable
                value={catFilter}
                onChange={(v) => { setCatFilter(v); setPage(1); }}
                options={categories.map(c => ({ value: c.name, label: c.name }))}
                placeholder="All Categories"
              />
            </div>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input-field w-auto" />
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input-field w-auto" />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-heading font-semibold text-slate-700 mb-2">By Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 text-sm py-8">No data</p>}
        </div>
      </div>

      {loading ? <PageLoader /> : expenses.length === 0 ? (
        <EmptyState icon={HiOutlineCash} title="No expenses recorded" action={openCreate} actionLabel="Record Expense" />
      ) : (
        <div className="table-container bg-white">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Payment</th><th className="text-right">Amount</th><th>By</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp._id}>
                  <td className="text-sm text-slate-500">{formatDateTime(exp.date)}</td>
                  <td><span className="badge badge-info">{exp.category}</span></td>
                  <td className="text-sm text-slate-600 max-w-[200px] truncate">{exp.description || '-'}</td>
                  <td className="text-sm capitalize">{exp.paymentMethod}</td>
                  <td className="text-right font-mono font-semibold text-red-600">{formatCurrency(exp.amount)}</td>
                  <td className="text-sm text-slate-500">{exp.createdBy?.name || '-'}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Edit"><HiOutlinePencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => handleDelete(exp)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete"><HiOutlineTrash className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editExp ? 'Edit Expense' : 'Record Expense'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="input-label">Amount *</label><input type="number" name="amount" value={form.amount} onChange={handleChange} className="input-field font-mono text-lg" min={0} step={0.01} required /></div>
          <div><label className="input-label">Category *</label>
            <Searchable
              value={form.category}
              onChange={(v) => setForm(f => ({ ...f, category: v }))}
              options={categories.map(c => ({ value: c.name, label: c.name }))}
              placeholder="Select category"
            />
          </div>
          <div><label className="input-label">Date</label><input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" /></div>
          <div><label className="input-label">Payment Method</label>
            <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="input-field">
              <option value="cash">Cash</option><option value="card">Card</option><option value="online">Online</option><option value="cheque">Cheque</option>
            </select>
          </div>
          <div><label className="input-label">Description</label><textarea name="description" value={form.description} onChange={handleChange} className="input-field" rows={2} /></div>
          <label className="flex items-center gap-2"><input type="checkbox" name="isRecurring" checked={form.isRecurring} onChange={handleChange} className="rounded border-slate-300 text-brand-500" /><span className="text-sm text-slate-600">Recurring expense</span></label>
          <div className="flex justify-end gap-3 pt-3 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : editExp ? 'Update' : 'Save'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
