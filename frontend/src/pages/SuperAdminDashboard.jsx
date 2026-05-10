import { useState, useEffect, useMemo } from 'react';
import { superadminAPI } from '../utils/api';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '../utils/format';
import { StatCard, PageLoader, SearchInput, EmptyState, Modal, Pagination, Avatar } from '../components/common';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineCash, HiOutlineExclamation,
  HiOutlineCheck, HiOutlineX, HiOutlineBan, HiOutlineKey, HiOutlineRefresh,
  HiOutlinePencil, HiOutlineTrash, HiOutlinePlus, HiOutlineClipboardCopy,
  HiOutlineClock, HiOutlineCurrencyDollar,
} from 'react-icons/hi';

// Plans available to assign (label kept in sync with backend constants)
const PLANS = [
  { key: 'trial',       label: 'Trial',     defaultDays: 7 },
  { key: 'monthly',     label: 'Monthly',   defaultDays: 30 },
  { key: 'half_yearly', label: '6 Months',  defaultDays: 180 },
  { key: 'yearly',      label: 'Yearly',    defaultDays: 365 },
  { key: 'custom',      label: 'Custom',    defaultDays: 30 },
];

const PRODUCT_NAME = 'POS Management System';
const publicUrl = () => (typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login');

const formatCredentials = ({ username, password, plan, endDate, price, currency }) => {
  const lines = [
    `Product: ${PRODUCT_NAME}`,
    `URL: ${publicUrl()}`,
    `Username: ${username}`,
    `Password: ${password}`,
  ];
  if (plan) lines.push(`Plan: ${plan}`);
  if (endDate) lines.push(`Valid till: ${new Date(endDate).toLocaleDateString()}`);
  if (price && Number(price) > 0) lines.push(`Price: ${currency || 'PKR'} ${price}`);
  return lines.join('\n');
};

// Built-in password generator that mirrors the backend rules.
function generatePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*?';
  const all = upper + lower + digits + symbols;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const len = Math.max(8, Number(length) || 12);
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const remaining = Array.from({ length: len - required.length }, () => pick(all));
  const out = [...required, ...remaining];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

const planLabel = (key) => PLANS.find(p => p.key === key)?.label || key;

// ────────────────────────── Credentials Summary modal ──────────────────────────
function CredentialsModal({ open, onClose, title, credentials, productName }) {
  if (!open || !credentials) return null;
  const text = formatCredentials(credentials);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credentials copied');
    } catch {
      toast.error('Copy failed — please copy manually');
    }
  };

  const sendWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  };

  const copyOne = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch { toast.error('Copy failed'); }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title || 'Login Credentials'} size="md">
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-brand-50 border border-emerald-200 p-5">
          <p className="text-emerald-700 font-heading font-bold text-lg flex items-center gap-2 mb-3">
            <HiOutlineCheck className="w-5 h-5" /> Account ready to share
          </p>
          <p className="text-sm text-slate-600">
            Yeh credentials sirf abhi dikhaye ja rahe hain. <strong>Copy karke client ko send karein</strong> — password
            dobara plain text me display nahi hoga.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 font-mono text-sm">
          <Row label="Product"  value={productName || PRODUCT_NAME} onCopy={(v) => copyOne(v, 'Product name')} />
          <Row label="URL"      value={publicUrl()}                  onCopy={(v) => copyOne(v, 'URL')} />
          <Row label="Username" value={credentials.username}         onCopy={(v) => copyOne(v, 'Username')} />
          <Row label="Password" value={credentials.password}         onCopy={(v) => copyOne(v, 'Password')} mono />
          {credentials.plan && <Row label="Plan" value={`${planLabel(credentials.plan)}${credentials.durationDays ? ` · ${credentials.durationDays} days` : ''}`} />}
          {credentials.endDate && <Row label="Expires" value={new Date(credentials.endDate).toLocaleString()} />}
          {credentials.price > 0 && <Row label="Price" value={`${credentials.currency || 'PKR'} ${credentials.price}`} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={copyAll} className="btn-primary flex-1">
            <HiOutlineClipboardCopy className="w-5 h-5" /> Copy All
          </button>
          <button onClick={sendWhatsApp} className="btn-secondary flex-1 !bg-emerald-500 !text-white hover:!bg-emerald-600">
            Send via WhatsApp
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center">Format ready for WhatsApp / Email paste.</p>
      </div>
    </Modal>
  );
}

function Row({ label, value, onCopy, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-400 text-xs uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className={`text-slate-800 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        {onCopy && (
          <button onClick={() => onCopy(value)} className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-brand-600" title="Copy">
            <HiOutlineClipboardCopy className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────── Plan / trial editor ──────────────────────────
function PlanForm({ value, onChange }) {
  const days = Number(value.durationDays || 0);
  const previewEnd = useMemo(() => {
    if (!days || days < 1) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }, [days]);

  const handlePlan = (key) => {
    const def = PLANS.find(p => p.key === key);
    onChange({ ...value, plan: key, durationDays: def ? def.defaultDays : value.durationDays });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="input-label">Package</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PLANS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePlan(p.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                value.plan === p.key
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="input-label">Duration (days)</label>
          <input
            type="number" min={1}
            value={value.durationDays}
            onChange={(e) => onChange({ ...value, durationDays: Number(e.target.value) || 0 })}
            className="input-field font-mono"
          />
        </div>
        <div>
          <label className="input-label">Price</label>
          <input
            type="number" min={0}
            value={value.price}
            onChange={(e) => onChange({ ...value, price: Number(e.target.value) || 0 })}
            className="input-field font-mono"
            placeholder="e.g. 4000"
          />
        </div>
        <div>
          <label className="input-label">Currency</label>
          <select
            value={value.currency || 'PKR'}
            onChange={(e) => onChange({ ...value, currency: e.target.value })}
            className="input-field"
          >
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
            <option value="AED">AED</option>
            <option value="INR">INR</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3">
        <HiOutlineClock className="w-5 h-5 text-brand-500 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-slate-500">Real-time preview</p>
          <p className="font-medium text-slate-800">
            {previewEnd
              ? <>This {planLabel(value.plan)} will expire on <span className="text-brand-600 font-semibold">{previewEnd.toLocaleString()}</span></>
              : 'Set a duration to see the expiry date'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────── Create Business modal ──────────────────────────
function CreateBusinessModal({ open, onClose, onCreated }) {
  const empty = {
    businessName: '', ownerName: '', email: '', phone: '',
    businessType: 'retail',
    password: generatePassword(12),
    plan: 'trial',
    durationDays: 7,
    price: 0,
    currency: 'PKR',
    notes: '',
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(true);

  useEffect(() => { if (open) setForm({ ...empty, password: generatePassword(12) }); /* eslint-disable-next-line */ }, [open]);

  const update = (patch) => setForm(f => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.businessName || !form.email || !form.phone) return toast.error('Name, email aur phone required hain');
    if (!form.password || form.password.length < 8) return toast.error('Password kam se kam 8 characters');
    setSaving(true);
    try {
      const res = await superadminAPI.createBusiness({
        businessName: form.businessName,
        ownerName: form.ownerName || form.businessName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        businessType: form.businessType,
        password: form.password,
        plan: form.plan,
        durationDays: Number(form.durationDays) || 7,
        price: Number(form.price) || 0,
        currency: form.currency,
        notes: form.notes,
      });
      toast.success('Business created');
      onCreated(res.data.data.credentials, res.data.data.business?.name);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Create New User / Store" size="xl">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Store / Client Name *</label>
            <input value={form.businessName} onChange={(e) => update({ businessName: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="input-label">Owner Name</label>
            <input value={form.ownerName} onChange={(e) => update({ ownerName: e.target.value })} className="input-field" placeholder="Defaults to Store Name" />
          </div>
          <div>
            <label className="input-label">Email (Username) *</label>
            <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="input-label">Contact Number *</label>
            <input value={form.phone} onChange={(e) => update({ phone: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="input-label">Business Type</label>
            <select value={form.businessType} onChange={(e) => update({ businessType: e.target.value })} className="input-field">
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="both">Both</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="restaurant">Restaurant</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="input-label">Password</label>
            <div className="flex gap-2">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                className="input-field flex-1 font-mono"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="btn-secondary !px-3" title="Show / hide">
                {showPwd ? '🙈' : '👁'}
              </button>
              <button type="button" onClick={() => update({ password: generatePassword(12) })} className="btn-secondary !px-3" title="Generate strong password">
                <HiOutlineRefresh className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Strong, random password — click the refresh icon to regenerate.</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <PlanForm value={form} onChange={(next) => setForm(next)} />
        </div>

        <div>
          <label className="input-label">Notes (optional)</label>
          <textarea rows={2} value={form.notes} onChange={(e) => update({ notes: e.target.value })} className="input-field" placeholder="Internal note about this client" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create User'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ────────────────────────── Assign Plan modal ──────────────────────────
function AssignPlanModal({ open, onClose, business, onSaved }) {
  const [form, setForm] = useState({ plan: 'monthly', durationDays: 30, price: 0, currency: 'PKR', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && business) {
      const s = business.subscription || {};
      setForm({
        plan: s.plan || 'monthly',
        durationDays: s.durationDays || 30,
        price: s.price || 0,
        currency: s.currency || 'PKR',
        notes: s.notes || '',
      });
    }
  }, [open, business]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await superadminAPI.updatePlan(business._id, {
        plan: form.plan,
        durationDays: Number(form.durationDays) || 1,
        price: Number(form.price) || 0,
        currency: form.currency,
        notes: form.notes,
      });
      toast.success('Plan updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  if (!business) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title={`Assign Plan — ${business.name}`} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <PlanForm value={form} onChange={setForm} />
        <div>
          <label className="input-label">Notes</label>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Plan'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ────────────────────────── Main page ──────────────────────────
export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [expiries, setExpiries] = useState({ expiringSoon: [], expired: [] });

  const [showCreate, setShowCreate] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [credsData, setCredsData] = useState(null);
  const [credsTitle, setCredsTitle] = useState('');
  const [productCtx, setProductCtx] = useState(PRODUCT_NAME);

  const [showPlan, setShowPlan] = useState(false);
  const [planTarget, setPlanTarget] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchBusinesses(); }, [search, statusFilter, page]);

  const fetchAll = async () => {
    try {
      const [s, e] = await Promise.all([superadminAPI.getStats(), superadminAPI.getExpiries()]);
      setStats(s.data.data);
      setExpiries(e.data.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await superadminAPI.getBusinesses({ page, search, status: statusFilter, limit: 10 });
      setBusinesses(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
  };

  const refresh = () => Promise.all([fetchAll(), fetchBusinesses()]);

  const handleApprove = async (id) => {
    try { await superadminAPI.approveBusiness(id); toast.success('Approved'); refresh(); }
    catch { toast.error('Failed'); }
  };

  const handleReject = async (id) => {
    const { value: reason } = await Swal.fire({ title: 'Reject Reason', input: 'text', showCancelButton: true });
    if (reason !== undefined) {
      try { await superadminAPI.rejectBusiness(id, reason); toast.success('Rejected'); refresh(); }
      catch { toast.error('Failed'); }
    }
  };

  const handleToggle = async (b) => {
    const action = b.isActive ? 'Suspend' : 'Activate';
    const r = await Swal.fire({
      title: `${action} ${b.name}?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: b.isActive ? '#DC2626' : '#059669',
      confirmButtonText: action,
    });
    if (r.isConfirmed) {
      try { await superadminAPI.toggleBusiness(b._id); toast.success(`${action}d`); refresh(); }
      catch { toast.error('Failed'); }
    }
  };

  const handleDelete = async (b) => {
    const r = await Swal.fire({
      title: `Delete ${b.name}?`,
      text: 'This permanently removes the user and all linked records (settings, locations, expense categories, subscription). This cannot be undone.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', confirmButtonText: 'Delete',
    });
    if (r.isConfirmed) {
      try { await superadminAPI.deleteBusiness(b._id); toast.success('Deleted'); refresh(); }
      catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    }
  };

  const handleResetPassword = async (b) => {
    const r = await Swal.fire({
      title: `Reset password for ${b.admin?.email || b.name}?`,
      text: 'A new strong password will be generated.',
      icon: 'question', showCancelButton: true, confirmButtonText: 'Reset',
    });
    if (!r.isConfirmed) return;
    try {
      const res = await superadminAPI.resetPassword(b._id, { autoGenerate: true });
      setCredsData(res.data.data.credentials);
      setProductCtx(b.name || PRODUCT_NAME);
      setCredsTitle('Password Reset — Share With Client');
      setShowCreds(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreated = (credentials, businessName) => {
    setCredsData(credentials);
    setProductCtx(businessName || PRODUCT_NAME);
    setCredsTitle('User Created — Share Credentials');
    setShowCreds(true);
    refresh();
  };

  const openAssignPlan = (b) => { setPlanTarget(b); setShowPlan(true); };

  if (loading) return <PageLoader />;

  const subBadge = (sub) => {
    if (!sub) return <span className="badge badge-info">No plan</span>;
    const days = sub.daysRemaining;
    if (days === null || days === undefined) return <span className="badge badge-info">{planLabel(sub.plan)}</span>;
    if (days < 0) return <span className="badge badge-danger">Expired · {Math.abs(days)}d ago</span>;
    if (days <= 30) return <span className="badge badge-warning">{planLabel(sub.plan)} · {days}d left</span>;
    return <span className="badge badge-success">{planLabel(sub.plan)} · {days}d</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Platform Overview</h1>
          <p className="text-slate-500 text-sm">Create users, assign packages, and monitor subscriptions.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <HiOutlinePlus className="w-5 h-5" /> Create User
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Total Businesses" value={formatNumber(stats?.totalBusinesses || 0)} icon={HiOutlineOfficeBuilding} color="blue" />
        <StatCard title="Active Users" value={formatNumber(stats?.totalUsers || 0)} icon={HiOutlineUsers} color="purple" />
        <StatCard title="Today's Sales" value={formatCurrency(stats?.todaySales?.total || 0)} subtitle={`${stats?.todaySales?.count || 0} txns`} icon={HiOutlineCash} color="green" />
        <StatCard title="Expired" value={formatNumber(stats?.expiredCount || 0)} icon={HiOutlineExclamation} color="amber" />
      </div>

      {/* Expiry alerts */}
      {(expiries.expiringSoon.length > 0 || expiries.expired.length > 0) && (
        <div className="card p-5">
          <h2 className="font-heading font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <HiOutlineClock className="w-5 h-5 text-amber-500" /> Subscription Alerts
          </h2>
          <div className="space-y-2">
            {expiries.expired.map(e => (
              <div key={e.business._id} className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200">
                <div>
                  <p className="font-medium text-slate-800">{e.business.name}</p>
                  <p className="text-xs text-slate-500">{e.business.email} · {planLabel(e.subscription.plan)}</p>
                </div>
                <span className="badge badge-danger">Expired {Math.abs(e.daysRemaining)} day{Math.abs(e.daysRemaining) === 1 ? '' : 's'} ago</span>
              </div>
            ))}
            {expiries.expiringSoon.map(e => (
              <div key={e.business._id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div>
                  <p className="font-medium text-slate-800">{e.business.name}</p>
                  <p className="text-xs text-slate-500">{e.business.email} · {planLabel(e.subscription.plan)} · expires {formatDate(e.subscription.endDate)}</p>
                </div>
                <span className="badge badge-warning">{e.daysRemaining}d left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Businesses Table */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-heading font-semibold text-slate-800 mb-3">Registered Users</h2>
          <div className="flex gap-3 flex-wrap">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, email, owner..." className="flex-1 min-w-[200px]" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Active</option>
              <option value="inactive">Suspended</option>
            </select>
          </div>
        </div>

        {businesses.length === 0 ? (
          <EmptyState title="No businesses yet" action={() => setShowCreate(true)} actionLabel="Create First User" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Plan / Price</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(b => (
                  <tr key={b._id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar user={b.admin || { name: b.ownerName || b.name }} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{b.name}</p>
                          <p className="text-xs text-slate-400 truncate">{b.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">
                      <p>{b.ownerName}</p>
                      <p className="text-xs text-slate-400 font-mono">{b.phone}</p>
                    </td>
                    <td>
                      {subBadge(b.subscription)}
                      {b.subscription?.price > 0 && (
                        <p className="text-[11px] text-slate-500 font-mono mt-1">
                          {b.subscription.currency || 'PKR'} {formatNumber(b.subscription.price)}
                        </p>
                      )}
                    </td>
                    <td>
                      {!b.isActive ? <span className="badge badge-danger">Suspended</span> :
                       b.isApproved ? <span className="badge badge-success">Active</span> :
                       <span className="badge badge-warning">Pending</span>}
                    </td>
                    <td className="text-xs text-slate-500">{formatDateTime(b.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {!b.isApproved && b.isActive && (
                          <>
                            <button onClick={() => handleApprove(b._id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve">
                              <HiOutlineCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReject(b._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => openAssignPlan(b)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Assign / change plan">
                          <HiOutlineCurrencyDollar className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleResetPassword(b)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="Reset password">
                          <HiOutlineKey className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(b)} className={`p-1.5 rounded-lg ${b.isActive ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-emerald-50 text-emerald-600'}`} title={b.isActive ? 'Suspend' : 'Activate'}>
                          <HiOutlineBan className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      <CreateBusinessModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      <CredentialsModal open={showCreds} onClose={() => setShowCreds(false)} title={credsTitle} credentials={credsData} productName={productCtx} />
      <AssignPlanModal open={showPlan} onClose={() => setShowPlan(false)} business={planTarget} onSaved={refresh} />
    </div>
  );
}
