import { HiOutlineSearch, HiOutlineX, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineInboxIn } from 'react-icons/hi';

export { default as BarcodeScanner } from './BarcodeScanner';
export { default as Searchable } from './Searchable';

// Loading Spinner
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-[3px] border-slate-200 border-t-brand-500 rounded-full animate-spin`} />
    </div>
  );
}

// Full page loader
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

// Modal
export function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true }) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${sizes[size]}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-heading font-semibold text-slate-800">{title}</h3>
            {showClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <HiOutlineX className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Search Input
export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-11 pr-10"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100">
          <HiOutlineX className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </div>
  );
}

// Pagination
export function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-slate-500">
        Showing page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pages}</span> ({total} items)
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          let pageNum;
          if (pages <= 5) pageNum = i + 1;
          else if (page <= 3) pageNum = i + 1;
          else if (page >= pages - 2) pageNum = pages - 4 + i;
          else pageNum = page - 2 + i;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                pageNum === page ? 'bg-brand-500 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <HiOutlineChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Avatar — shows uploaded image, falls back to gradient initials
export function Avatar({ user, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-7 h-7 text-[11px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
    '2xl': 'w-32 h-32 text-4xl',
  };
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-400 to-purple-500 text-white font-bold flex-shrink-0 ${className}`}
      title={user?.name}
    >
      {user?.avatar
        ? <img src={user.avatar} alt={user.name || 'avatar'} className="w-full h-full object-cover" />
        : <span>{initial}</span>}
    </div>
  );
}

// Empty State
export function EmptyState({ icon: Icon = HiOutlineInboxIn, title = 'No data found', message = '', action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-slate-700 mb-1">{title}</h3>
      {message && <p className="text-slate-500 text-sm mb-4">{message}</p>}
      {action && <button onClick={action} className="btn-primary btn-sm">{actionLabel}</button>}
    </div>
  );
}

// Stat Card
export function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50',
    amber: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50',
    red: 'from-red-500 to-red-600 text-red-600 bg-red-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
  };
  const [gradFrom, gradTo, textColor, bgColor] = colors[color].split(' ');

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-[1.375rem] h-[1.375rem] ${textColor}`} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 font-medium mb-0.5">{title}</p>
      <p className="text-2xl font-heading font-bold text-slate-800">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
