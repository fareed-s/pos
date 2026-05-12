import { useEffect, useMemo, useState } from 'react';
import { productAPI } from '../utils/api';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import { PageLoader, EmptyState } from '../components/common';
import { HiOutlineClock, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';

// Visual config per bucket. `dotClass` colors the legend dot + bar segment;
// `accentClass` provides the active-card border + tint.
const BUCKETS = [
  { key: 'expired',  dotClass: 'bg-red-500',    accentClass: 'border-red-300 bg-red-50 dark:bg-red-900/30 dark:border-red-700/60',     textClass: 'text-red-600 dark:text-red-300' },
  { key: 'd0_30',    dotClass: 'bg-rose-500',   accentClass: 'border-rose-300 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/60', textClass: 'text-rose-600 dark:text-rose-300' },
  { key: 'd31_60',   dotClass: 'bg-amber-500',  accentClass: 'border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700/60', textClass: 'text-amber-600 dark:text-amber-300' },
  { key: 'd61_90',   dotClass: 'bg-emerald-500',accentClass: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-700/60', textClass: 'text-emerald-600 dark:text-emerald-300' },
  { key: 'd91_180',  dotClass: 'bg-sky-500',    accentClass: 'border-sky-300 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-700/60',     textClass: 'text-sky-600 dark:text-sky-300' },
];

export default function ExpiryTracker() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  // Default selected bucket = first bucket with items, else expired.
  const [activeKey, setActiveKey] = useState('d0_30');

  const fetchData = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await productAPI.getExpiryTracker();
      setData(res.data.data);
      // Auto-jump to the most urgent non-empty bucket on first load.
      const order = BUCKETS.map(b => b.key);
      const firstWithItems = order.find(k => res.data.data?.buckets?.[k]?.items?.length > 0);
      if (firstWithItems) setActiveKey(firstWithItems);
    } catch {
      toast.error('Failed to load expiry data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const buckets = data?.buckets || {};
  const totalAtRisk = data?.totalAtRisk || 0;

  // Bar segments — proportional widths of each bucket relative to totalAtRisk.
  const segments = useMemo(() => {
    if (!totalAtRisk) return [];
    return BUCKETS.map(b => ({
      ...b,
      count: buckets[b.key]?.items?.length || 0,
      pct: ((buckets[b.key]?.items?.length || 0) / totalAtRisk) * 100,
    })).filter(s => s.count > 0);
  }, [buckets, totalAtRisk]);

  const active = buckets[activeKey];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-slate-100">
            Expiry Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track products approaching their expiry date — drill in to act before stock goes to waste.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary btn-sm"
        >
          <HiOutlineRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Bucket cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {BUCKETS.map(b => {
          const bucket = buckets[b.key] || { items: [], value: 0, label: b.key };
          const isActive = activeKey === b.key;
          return (
            <button
              key={b.key}
              onClick={() => setActiveKey(b.key)}
              className={`text-left rounded-2xl border-2 p-4 transition-all ${
                isActive
                  ? b.accentClass + ' shadow-md'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${b.dotClass}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {bucket.label}
                </span>
              </div>
              <p className={`text-3xl font-heading font-bold ${b.textClass}`}>
                {formatNumber(bucket.items?.length || 0)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Value: {formatCurrency(bucket.value || 0)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Risk distribution */}
      <div className="card p-5">
        <h3 className="text-sm font-heading font-semibold text-slate-800 dark:text-slate-100">
          Expiry Risk Distribution
        </h3>
        <div className="mt-3 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex">
          {segments.length === 0 ? (
            <div className="w-full bg-slate-200 dark:bg-slate-600" />
          ) : (
            segments.map(s => (
              <div
                key={s.key}
                className={s.dotClass}
                style={{ width: `${s.pct}%` }}
                title={`${buckets[s.key]?.label}: ${s.count}`}
              />
            ))
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {BUCKETS.map(b => (
            <div key={b.key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${b.dotClass}`} />
              <span className="text-slate-600 dark:text-slate-300">
                {buckets[b.key]?.label}: <strong>{buckets[b.key]?.items?.length || 0}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected bucket table */}
      <div className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-heading font-semibold text-slate-800 dark:text-slate-100">
            {active?.label || ''} — {active?.items?.length || 0} batch{(active?.items?.length || 0) === 1 ? '' : 'es'}
          </h3>
          {active?.value > 0 && (
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Total value: <strong>{formatCurrency(active.value)}</strong>
            </span>
          )}
        </header>

        {(!active || active.items.length === 0) ? (
          <EmptyState icon={HiOutlineClock} title="No items in this bucket" message="Nothing to worry about here." />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine / Product</th>
                  <th>Batch</th>
                  <th>Expiry Date</th>
                  <th className="text-right">Remaining Qty</th>
                  <th className="text-right">Days Left</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {active.items.map(item => {
                  const isExpired = item.daysLeft < 0;
                  return (
                    <tr key={item._id}>
                      <td className="font-medium text-slate-800 dark:text-slate-100">
                        {item.productName}
                        <p className="text-[11px] font-mono text-slate-400">{item.sku}</p>
                      </td>
                      <td className="text-sm font-mono text-slate-500">{item.batchNumber || '—'}</td>
                      <td className={`text-sm font-medium ${isExpired ? 'text-red-600 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {formatDate(item.expiryDate)}
                      </td>
                      <td className="text-right font-mono">{formatNumber(item.currentStock)} {item.unit || ''}</td>
                      <td className={`text-right font-mono font-semibold ${
                        isExpired ? 'text-red-600 dark:text-red-300'
                        : item.daysLeft <= 30 ? 'text-rose-600 dark:text-rose-300'
                        : item.daysLeft <= 60 ? 'text-amber-600 dark:text-amber-300'
                        : 'text-emerald-600 dark:text-emerald-300'
                      }`}>
                        {isExpired ? `${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft}d`}
                      </td>
                      <td className="text-right font-mono">{formatCurrency(item.stockValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
