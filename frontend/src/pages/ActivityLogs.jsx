import { useState, useEffect } from 'react';
import { activityLogAPI } from '../utils/api';
import { formatDateTime } from '../utils/format';
import { SearchInput, Pagination, EmptyState, PageLoader } from '../components/common';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardList, HiOutlineCube, HiOutlineShoppingCart, HiOutlineUsers,
  HiOutlineCash, HiOutlineTruck, HiOutlineCog, HiOutlineKey,
} from 'react-icons/hi';

const moduleIcons = {
  products: HiOutlineCube, sales: HiOutlineShoppingCart, customers: HiOutlineUsers,
  expenses: HiOutlineCash, purchases: HiOutlineTruck, suppliers: HiOutlineTruck,
  categories: HiOutlineCube, staff: HiOutlineUsers, settings: HiOutlineCog,
  auth: HiOutlineKey, inventory: HiOutlineCube, cash_register: HiOutlineCash,
};

const actionColors = {
  create: 'text-emerald-600 bg-emerald-50', update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-600 bg-red-50', login: 'text-purple-600 bg-purple-50',
  void: 'text-red-600 bg-red-50', return: 'text-amber-600 bg-amber-50',
  stock_adjustment: 'text-amber-600 bg-amber-50', receive_stock: 'text-emerald-600 bg-emerald-50',
  open_register: 'text-blue-600 bg-blue-50', close_register: 'text-slate-600 bg-slate-100',
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [moduleStats, setModuleStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { fetchLogs(); }, [page, search, moduleFilter, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await activityLogAPI.getAll({ page, limit: 30, search, module: moduleFilter, startDate, endDate });
      setLogs(res.data.data); setModuleStats(res.data.moduleStats); setPagination(res.data.pagination);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold text-slate-800">Activity Log</h1>

      {/* Module Stats */}
      {moduleStats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => { setModuleFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${!moduleFilter ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
            All ({pagination.total || 0})
          </button>
          {moduleStats.map(m => {
            const Icon = moduleIcons[m._id] || HiOutlineClipboardList;
            return (
              <button key={m._id} onClick={() => { setModuleFilter(m._id); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  moduleFilter === m._id ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-500'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {m._id} ({m.count})
              </button>
            );
          })}
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search actions..." className="flex-1 min-w-[200px]" />
        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input-field w-auto" />
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input-field w-auto" />
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon={HiOutlineClipboardList} title="No activity logs" message="Actions will be recorded here automatically" />
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const Icon = moduleIcons[log.module] || HiOutlineClipboardList;
            const colorClass = actionColors[log.action] || 'text-slate-600 bg-slate-100';
            return (
              <div key={log._id} className="card px-4 py-3 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass.split(' ')[1]}`}>
                  <Icon className={`w-[1.125rem] h-[1.125rem] ${colorClass.split(' ')[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800">{log.userName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colorClass}`}>{log.action}</span>
                    <span className="badge badge-info text-[10px]">{log.module}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details || 'No details'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />
    </div>
  );
}
