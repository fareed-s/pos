import { useState, useEffect, useMemo } from 'react';
import { staffAPI } from '../utils/api';
import { getRoleLabel, getRoleBadge, formatDateTime } from '../utils/format';
import { Modal, EmptyState, PageLoader } from '../components/common';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUserGroup, HiOutlineKey,
  HiOutlineEye, HiOutlineEyeOff, HiOutlineRefresh,
} from 'react-icons/hi';

// Mirror of backend generatePassword — keeps the UI offline-friendly.
function generatePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*?';
  const all = upper + lower + digits + symbols;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const len = Math.max(8, Number(length) || 12);
  const out = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (out.length < len) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

const blankPerms = (modules) => modules.reduce((acc, m) => {
  acc[m.key] = { add: false, edit: false, delete: false };
  return acc;
}, {});

const allOnPerms = (modules) => modules.reduce((acc, m) => {
  acc[m.key] = { add: true, edit: true, delete: true };
  return acc;
}, {});

// ────────────────────────── Permission Matrix ──────────────────────────
function PermissionMatrix({ modules, value, onChange }) {
  const allRowOn = (key) => !!(value[key]?.add && value[key]?.edit && value[key]?.delete);
  const allOn = modules.every(m => allRowOn(m.key));

  const colAllOn = (col) => modules.every(m => !!value[m.key]?.[col]);

  const setRow = (key, on) => {
    onChange({ ...value, [key]: { add: on, edit: on, delete: on } });
  };
  const setAll = (on) => onChange(on ? allOnPerms(modules) : blankPerms(modules));
  const setCol = (col, on) => {
    const next = { ...value };
    modules.forEach(m => {
      next[m.key] = { ...(next[m.key] || { add: false, edit: false, delete: false }), [col]: on };
    });
    onChange(next);
  };
  const setCell = (key, col, on) => {
    onChange({
      ...value,
      [key]: { ...(value[key] || { add: false, edit: false, delete: false }), [col]: on },
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="text-left p-3 w-14">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-brand-500" checked={allOn} onChange={(e) => setAll(e.target.checked)} />
                  <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Check all</span>
                </label>
              </th>
              <th className="text-left p-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Component</th>
              {['add', 'edit', 'delete'].map(col => (
                <th key={col} className="p-3 text-center w-24">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs tracking-wider font-semibold text-slate-600 dark:text-slate-300 capitalize">{col}</span>
                    <input type="checkbox" className="w-4 h-4 rounded text-brand-500" checked={colAllOn(col)} onChange={(e) => setCol(col, e.target.checked)} title={`Toggle ${col} for all rows`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {modules.map(m => (
              <tr key={m.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="p-3">
                  <input type="checkbox" className="w-4 h-4 rounded text-brand-500" checked={allRowOn(m.key)} onChange={(e) => setRow(m.key, e.target.checked)} />
                </td>
                <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{m.label}</td>
                {['add', 'edit', 'delete'].map(col => (
                  <td key={col} className="p-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-brand-500"
                      checked={!!value[m.key]?.[col]}
                      onChange={(e) => setCell(m.key, col, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────── Staff Form modal ──────────────────────────
function StaffFormModal({ open, onClose, editUser, onSaved, modules, defaults }) {
  const [form, setForm] = useState(null);
  const [perms, setPerms] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editUser) {
      setForm({
        name: editUser.name || '',
        email: editUser.email || '',
        password: '',
        role: editUser.role || 'cashier',
        phone: editUser.phone || '',
        maxDiscountPercent: editUser.maxDiscountPercent ?? 10,
        isActive: editUser.isActive !== false,
      });
      const existing = editUser.permissions instanceof Map
        ? Object.fromEntries(editUser.permissions)
        : (editUser.permissions || {});
      // Ensure every known module has a record (even if false)
      const merged = blankPerms(modules);
      Object.keys(existing).forEach(k => { if (merged[k]) merged[k] = { ...merged[k], ...existing[k] }; });
      setPerms(merged);
    } else {
      setForm({
        name: '', email: '', password: generatePassword(12), role: 'cashier',
        phone: '', maxDiscountPercent: 10, isActive: true,
      });
      setPerms(defaults?.cashier ? deepMerge(blankPerms(modules), defaults.cashier) : blankPerms(modules));
    }
  }, [open, editUser, modules, defaults]);

  // When the role flips on a brand-new staff form, reset to that role's defaults.
  useEffect(() => {
    if (!form || editUser) return;
    if (defaults?.[form.role]) {
      setPerms(deepMerge(blankPerms(modules), defaults[form.role]));
    }
  }, [form?.role]); // eslint-disable-line

  if (!open || !form) return null;

  const update = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone,
        maxDiscountPercent: Number(form.maxDiscountPercent) || 0,
        isActive: form.isActive,
        permissions: perms,
      };
      if (editUser) {
        if (form.password) payload.password = form.password; // optional on update — handled by reset endpoint normally
        await staffAPI.update(editUser._id, payload);
        toast.success('Staff updated');
      } else {
        payload.password = form.password;
        await staffAPI.create(payload);
        toast.success('Staff created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={editUser ? `Edit Staff — ${editUser.name}` : 'Create New Staff'} size="full">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">* Name</label>
            <input value={form.name} onChange={(e) => update({ name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="input-label">* Email</label>
            <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="input-label">{editUser ? 'Password (leave blank to keep current)' : '* Password'}</label>
            <div className="flex gap-2">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                className="input-field flex-1 font-mono"
                placeholder={editUser ? 'Leave blank to keep current password' : 'Auto-generated'}
                {...(!editUser ? { required: true, minLength: 8 } : {})}
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="btn-secondary !px-3" title="Show / hide">
                {showPwd ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => update({ password: generatePassword(12) })} className="btn-secondary !px-3" title="Generate strong password">
                <HiOutlineRefresh className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="input-label">* User Type</label>
            <select value={form.role} onChange={(e) => update({ role: e.target.value })} className="input-field">
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="input-label">Phone</label>
            <input value={form.phone} onChange={(e) => update({ phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="input-label">Max Discount % Allowed</label>
            <input type="number" value={form.maxDiscountPercent} onChange={(e) => update({ maxDiscountPercent: Number(e.target.value) })} className="input-field" min={0} max={100} />
          </div>
          <div>
            <label className="input-label">* Status</label>
            <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => update({ isActive: e.target.value === 'active' })} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive (Suspended)</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Component Permissions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tick the actions this user can perform on each module.</p>
            </div>
            {!editUser && defaults?.[form.role] && (
              <button type="button"
                onClick={() => setPerms(deepMerge(blankPerms(modules), defaults[form.role]))}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
                Reset to {form.role} defaults
              </button>
            )}
          </div>
          <PermissionMatrix modules={modules} value={perms} onChange={setPerms} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create Staff'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function deepMerge(base, src) {
  const out = { ...base };
  for (const k of Object.keys(src || {})) {
    out[k] = { ...(out[k] || {}), ...(src[k] || {}) };
  }
  return out;
}

// ────────────────────────── Main page ──────────────────────────
export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [modulesData, setModulesData] = useState({ modules: [], defaults: null });

  const modules = modulesData.modules;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [s, m] = await Promise.all([staffAPI.getAll(), staffAPI.getModules()]);
      setStaff(s.data.data);
      setModulesData(m.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const res = await staffAPI.getAll(); setStaff(res.data.data); } catch {}
  };

  const openCreate = () => { setEditUser(null); setShowModal(true); };
  const openEdit = (u) => { setEditUser(u); setShowModal(true); };

  const handleResetPassword = async (user) => {
    const { value: newPassword } = await Swal.fire({
      title: 'Reset Password', input: 'password', inputLabel: `New password for ${user.name}`,
      inputPlaceholder: 'Min 8 chars, 1 uppercase, 1 number', showCancelButton: true,
      inputValidator: (v) => { if (!v || v.length < 8) return 'Password must be at least 8 characters'; },
    });
    if (newPassword) {
      try { await staffAPI.resetPassword(user._id, newPassword); toast.success('Password reset'); }
      catch { toast.error('Failed to reset'); }
    }
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({ title: 'Deactivate?', text: `${user.name} will be deactivated.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626' });
    if (result.isConfirmed) {
      try { await staffAPI.delete(user._id); toast.success('Staff deactivated'); fetchStaff(); } catch { toast.error('Failed'); }
    }
  };

  const enabledCount = useMemo(() => (u) => {
    const p = u.permissions instanceof Map ? Object.fromEntries(u.permissions) : (u.permissions || {});
    let total = 0;
    for (const v of Object.values(p)) total += (v.add ? 1 : 0) + (v.edit ? 1 : 0) + (v.delete ? 1 : 0);
    return total;
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-slate-100">Staff Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{staff.length} staff members · grant per-component access from the matrix below</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> Add Staff</button>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={HiOutlineUserGroup} title="No staff members" message="Add managers and cashiers" action={openCreate} actionLabel="Add Staff" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {staff.map(u => (
            <div key={u._id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg font-bold">{u.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">{u.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`badge ${getRoleBadge(u.role)}`}>{getRoleLabel(u.role)}</span>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    <span className="badge badge-info">{enabledCount(u)} permissions</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-400">{u.lastLogin ? `Last login: ${formatDateTime(u.lastLogin)}` : 'Never logged in'}</p>
                <div className="flex gap-1">
                  <button onClick={() => handleResetPassword(u)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Reset password">
                    <HiOutlineKey className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <StaffFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editUser={editUser}
        onSaved={fetchStaff}
        modules={modules}
        defaults={modulesData.defaults}
      />
    </div>
  );
}
