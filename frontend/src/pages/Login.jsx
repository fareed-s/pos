import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineShoppingCart, HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result.success) {
        toast.success('Welcome back!');
        const role = result.data.user.role;
        navigate(role === 'superadmin' ? '/superadmin' : '/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-2xl shadow-brand-500/30">
              <HiOutlineShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-heading text-3xl font-bold">POS System</h1>
              <p className="text-brand-300 text-sm font-medium">Management Suite</p>
            </div>
          </div>
          <h2 className="text-white font-heading text-4xl font-bold leading-tight mb-4">
            Manage your business<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-purple-300">smarter & faster</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Complete point of sale solution for retail shops, wholesalers, and distributors. Manage inventory, sales, customers, and finances in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: 'Products', value: '10K+' },
              { label: 'Businesses', value: '500+' },
              { label: 'Transactions', value: '1M+' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-heading text-2xl font-bold">{s.value}</p>
                <p className="text-slate-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <HiOutlineShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-heading text-xl font-bold text-slate-800">POS System</h1>
          </div>

          <h2 className="text-2xl font-heading font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email Address</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="input-field pl-11" required />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-11"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            New account? Please contact your administrator — accounts are provisioned by the platform team.
          </p>
        </div>
      </div>
    </div>
  );
}
