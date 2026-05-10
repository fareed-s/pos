import { useState, useRef } from 'react';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../utils/format';
import { Avatar, PageLoader } from '../components/common';
import toast from 'react-hot-toast';
import {
  HiOutlinePencil, HiOutlineLockClosed, HiOutlineUser,
  HiOutlineCamera, HiOutlineTrash, HiOutlineCheck, HiOutlineEye, HiOutlineEyeOff,
} from 'react-icons/hi';

// Resize an uploaded image to max 256px on the longest side and compress to JPEG.
// Keeps the base64 payload small so it fits comfortably in the User.avatar string.
const resizeImage = (file, maxSize = 256, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

export default function Profile() {
  const { user, business, isLoading, checkAuth, dispatch } = useAuth();
  const fileRef = useRef(null);

  const [info, setInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [savingInfo, setSavingInfo] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(null); // base64 if user picked a new one
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  if (isLoading || !user) return <PageLoader />;

  // ── Avatar handlers ──
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    try {
      const dataUrl = await resizeImage(file, 256, 0.85);
      setAvatarPreview(dataUrl);
    } catch {
      toast.error('Could not read image');
    }
  };

  const saveAvatar = async () => {
    if (!avatarPreview) return;
    setAvatarSaving(true);
    try {
      const res = await authAPI.updateProfile({ avatar: avatarPreview });
      dispatch({ type: 'UPDATE_USER', payload: { avatar: res.data.data.avatar } });
      setAvatarPreview(null);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update photo');
    } finally { setAvatarSaving(false); }
  };

  const removeAvatar = async () => {
    setAvatarSaving(true);
    try {
      await authAPI.updateProfile({ avatar: '' });
      dispatch({ type: 'UPDATE_USER', payload: { avatar: '' } });
      setAvatarPreview(null);
      toast.success('Photo removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setAvatarSaving(false); }
  };

  // ── Personal info ──
  const saveInfo = async (e) => {
    e.preventDefault();
    if (!info.name.trim()) return toast.error('Name is required');
    setSavingInfo(true);
    try {
      const res = await authAPI.updateProfile({ name: info.name, phone: info.phone });
      dispatch({ type: 'UPDATE_USER', payload: { name: res.data.data.name, phone: res.data.data.phone } });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingInfo(false); }
  };

  // ── Password change ──
  const savePassword = async (e) => {
    e.preventDefault();
    if (!pwd.current) return toast.error('Enter your current password');
    if (pwd.next.length < 8) return toast.error('New password must be at least 8 characters');
    if (!/[A-Z]/.test(pwd.next)) return toast.error('New password needs an uppercase letter');
    if (!/[0-9]/.test(pwd.next)) return toast.error('New password needs a number');
    if (pwd.next !== pwd.confirm) return toast.error('New password and confirmation do not match');
    setSavingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Password changed');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingPwd(false); }
  };

  const previewUser = avatarPreview ? { ...user, avatar: avatarPreview } : user;

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Update your personal info, photo and password.</p>
      </div>

      {/* ── Avatar Card ── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <Avatar user={previewUser} size="2xl" className="ring-4 ring-brand-100 dark:ring-brand-900/40" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-lg transition-colors"
              title="Change photo"
            >
              <HiOutlineCamera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-heading font-bold text-xl text-slate-800 dark:text-slate-100">{user.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
              <span className="badge badge-info">{getRoleLabel(user.role)}</span>
              {business && <span className="badge badge-purple">{business.name}</span>}
            </div>

            {avatarPreview ? (
              <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                <button onClick={saveAvatar} disabled={avatarSaving} className="btn-primary btn-sm">
                  <HiOutlineCheck className="w-4 h-4" /> {avatarSaving ? 'Saving...' : 'Save Photo'}
                </button>
                <button onClick={() => setAvatarPreview(null)} className="btn-secondary btn-sm">Cancel</button>
              </div>
            ) : (
              user.avatar && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button onClick={() => fileRef.current?.click()} className="btn-secondary btn-sm">
                    <HiOutlineCamera className="w-4 h-4" /> Change Photo
                  </button>
                  <button onClick={removeAvatar} disabled={avatarSaving} className="btn-secondary btn-sm !text-red-600 hover:!border-red-300">
                    <HiOutlineTrash className="w-4 h-4" /> Remove
                  </button>
                </div>
              )
            )}
            {!user.avatar && !avatarPreview && (
              <p className="mt-3 text-xs text-slate-400">Click the camera icon to upload a profile picture.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal Info Card ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <HiOutlineUser className="w-5 h-5 text-brand-500" />
          <h2 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Personal Information</h2>
        </div>
        <form onSubmit={saveInfo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Full Name *</label>
            <input value={info.name} onChange={(e) => setInfo(s => ({ ...s, name: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="input-label">Email (read-only)</label>
            <input value={user.email} className="input-field opacity-60 cursor-not-allowed" readOnly />
          </div>
          <div>
            <label className="input-label">Phone</label>
            <input value={info.phone} onChange={(e) => setInfo(s => ({ ...s, phone: e.target.value }))} className="input-field" placeholder="e.g. 03001234567" />
          </div>
          <div>
            <label className="input-label">Role (read-only)</label>
            <input value={getRoleLabel(user.role)} className="input-field opacity-60 cursor-not-allowed" readOnly />
          </div>
          <div className="md:col-span-2 flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <button type="submit" disabled={savingInfo} className="btn-primary">
              <HiOutlinePencil className="w-4 h-4" />
              {savingInfo ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password Card ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <HiOutlineLockClosed className="w-5 h-5 text-brand-500" />
          <h2 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Change Password</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <PasswordField
            label="Current Password *"
            value={pwd.current}
            onChange={(v) => setPwd(s => ({ ...s, current: v }))}
            visible={showPwd.current}
            toggleVisible={() => setShowPwd(s => ({ ...s, current: !s.current }))}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordField
              label="New Password *"
              value={pwd.next}
              onChange={(v) => setPwd(s => ({ ...s, next: v }))}
              visible={showPwd.next}
              toggleVisible={() => setShowPwd(s => ({ ...s, next: !s.next }))}
              hint="Min 8 chars · 1 uppercase · 1 number"
              required
            />
            <PasswordField
              label="Confirm New Password *"
              value={pwd.confirm}
              onChange={(v) => setPwd(s => ({ ...s, confirm: v }))}
              visible={showPwd.confirm}
              toggleVisible={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}
              required
            />
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <button type="submit" disabled={savingPwd} className="btn-primary">
              <HiOutlineLockClosed className="w-4 h-4" />
              {savingPwd ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, visible, toggleVisible, hint, required }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field pr-11 font-mono"
          required={required}
          minLength={required ? 1 : undefined}
        />
        <button type="button" onClick={toggleVisible} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {visible ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
