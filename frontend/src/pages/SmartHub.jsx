import { useState, useEffect } from 'react';
import { smartAPI } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { PageLoader, EmptyState } from '../components/common';
import toast from 'react-hot-toast';
import {
  HiOutlineLightBulb, HiOutlineClock, HiOutlineTag, HiOutlineUsers,
  HiOutlineTruck, HiOutlineExclamationCircle, HiOutlineFire, HiOutlineCheckCircle,
} from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const tabs = [
  { key: 'production', label: '🤖 AI Production', icon: HiOutlineLightBulb },
  { key: 'expiry', label: '⏰ Expiry Alert', icon: HiOutlineClock },
  { key: 'discount', label: '🏷️ Smart Discount', icon: HiOutlineTag },
  { key: 'leaderboard', label: '🏆 Staff Board', icon: HiOutlineUsers },
  { key: 'supplier', label: '📊 Price Compare', icon: HiOutlineTruck },
];

export default function SmartHub() {
  const [tab, setTab] = useState('production');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('today');

  useEffect(() => { fetchData(); }, [tab, period]);

  const fetchData = async () => {
    setLoading(true); setData(null);
    try {
      let res;
      switch (tab) {
        case 'production': res = await smartAPI.getProductionSuggestions(); break;
        case 'expiry': res = await smartAPI.getExpiryCountdown(); break;
        case 'discount': res = await smartAPI.getDiscountSuggestions(); break;
        case 'leaderboard': res = await smartAPI.getStaffLeaderboard({ period }); break;
        case 'supplier': res = await smartAPI.getSupplierComparison(); break;
      }
      setData(res.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-slate-800">🧠 Smart Hub</h1>
        <p className="text-slate-500 text-sm">AI-powered insights jo kisi aur POS mein nahi milte</p>
      </div>

      {/* Tabs — clear `data` synchronously on switch so the next tab's first render
          doesn't see the previous tab's shape (e.g. leaderboard.map on production data). */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 justify-center">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setData(null); setTab(t.key); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white shadow-lg shadow-brand-500/25' : 'bg-white border border-slate-200 text-slate-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : !data ? <EmptyState title="No data" /> : (
        <>
          {/* AI PRODUCTION SUGGESTIONS */}
          {tab === 'production' && (
            <div className="space-y-4">
              <div className="card p-5 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-center">
                <p className="text-sm text-purple-600 font-medium">🤖 AI Prediction for <span className="font-bold">{data.dayName}</span></p>
                <p className="text-xs text-purple-400 mt-1">Based on last {data.weeksAnalyzed} weeks of {data.dayName} sales</p>
              </div>

              {data.suggestions?.length === 0 ? <EmptyState title="Not enough data yet" message="2-3 weeks ki sale ke baad AI accurate predict karega" /> : (
                <>
                  <div className="card p-4">
                    <h3 className="font-heading font-semibold text-sm text-slate-700 mb-3">Production Plan</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.suggestions?.slice(0, 12).map(s => ({ name: s.productName.length > 12 ? s.productName.slice(0, 12) + '..' : s.productName, produce: s.suggestedProduction, sold: s.avgSoldPerDay }))} layout="vertical" margin={{ left: 90 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="produce" fill="#7C3AED" radius={[0, 6, 6, 0]} barSize={14} name="Banao" />
                        <Bar dataKey="sold" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={14} name="Avg Bikta" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {data.suggestions.map((s, i) => (
                      <div key={i} className="card p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${s.confidence >= 75 ? 'bg-emerald-100 text-emerald-600' : s.confidence >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                            {s.suggestedProduction}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.productName}</p>
                            <p className="text-[10px] text-slate-400">
                              Avg sold: {s.avgSoldPerDay}/day · Wasted: {s.avgWastedPerDay}/day · Stock: {s.currentStock}
                              · Confidence: {s.confidence}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm text-purple-600">{s.suggestedProduction} banao</p>
                          <p className="text-[10px] text-slate-400">Est. Revenue: {formatCurrency(s.estimatedRevenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* EXPIRY COUNTDOWN */}
          {tab === 'expiry' && (
            <div className="space-y-4">
              {data.totalAtRisk > 0 && (
                <div className="card p-5 bg-gradient-to-r from-red-50 to-amber-50 border-red-200 text-center">
                  <HiOutlineExclamationCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-lg font-heading font-bold text-red-700">{data.totalAtRisk} items at risk!</p>
                  <p className="text-sm text-red-500">Potential loss: {formatCurrency(data.totalPotentialLoss)}</p>
                </div>
              )}

              {/* Urgent */}
              {data.urgent?.length > 0 && (
                <div>
                  <h3 className="font-heading font-semibold text-red-600 mb-2 flex items-center gap-2"><HiOutlineFire className="w-5 h-5" /> URGENT - Jaldi Becho!</h3>
                  <div className="space-y-2">
                    {data.urgent.map((item, i) => (
                      <div key={i} className="card p-3 border-l-4 border-l-red-500 flex items-center justify-between bg-red-50">
                        <div>
                          <p className="font-medium text-sm text-red-800">{item.productName}</p>
                          <p className="text-[10px] text-red-500">
                            {item.hoursLeft !== undefined ? `${item.hoursLeft} hours left` : item.daysLeft !== undefined ? `${item.daysLeft} days left` : item.status}
                            · Stock: {item.currentStock} · Loss: {formatCurrency(item.potentialLoss)}
                          </p>
                        </div>
                        <span className="badge badge-danger animate-pulse">⚠️ {item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              {data.warning?.length > 0 && (
                <div>
                  <h3 className="font-heading font-semibold text-amber-600 mb-2">⚡ Warning - Dhyan Do</h3>
                  <div className="space-y-2">
                    {data.warning.map((item, i) => (
                      <div key={i} className="card p-3 border-l-4 border-l-amber-500 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.hoursLeft !== undefined ? `${item.hoursLeft} hours left` : `${item.daysLeft} days left`}
                            · Stock: {item.currentStock}
                          </p>
                        </div>
                        <span className="badge badge-warning">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OK */}
              {data.ok?.length > 0 && (
                <div>
                  <h3 className="font-heading font-semibold text-emerald-600 mb-2 flex items-center gap-2"><HiOutlineCheckCircle className="w-5 h-5" /> Fresh - OK</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {data.ok.map((item, i) => (
                      <div key={i} className="card p-2.5 text-center">
                        <p className="text-xs font-medium truncate">{item.productName}</p>
                        <p className="text-[10px] text-emerald-500">{item.hoursLeft !== undefined ? `${item.hoursLeft}h left` : `${item.daysLeft}d left`}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.totalAtRisk === 0 && <EmptyState icon={HiOutlineCheckCircle} title="Sab Fresh hai! ✅" message="Koi item expire nahi ho raha" />}
            </div>
          )}

          {/* SMART DISCOUNT */}
          {tab === 'discount' && (
            <div className="space-y-4">
              <div className="card p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-emerald-200 text-center">
                <p className="text-sm text-emerald-600 font-medium">🏷️ Smart Discount Engine</p>
                <p className="text-xs text-emerald-400">Waste se bachne ke liye discount suggestions (current time: {data.currentHour}:00)</p>
              </div>

              {data.suggestions?.length === 0 ? (
                <EmptyState icon={HiOutlineTag} title="Abhi discount ki zaroorat nahi" message="Shaam ko 4 baje ke baad suggestions aayenge" />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="card p-3 text-center"><p className="text-[10px] text-slate-400">Excess Items</p><p className="font-heading font-bold text-lg">{data.totalExcessItems}</p></div>
                    <div className="card p-3 text-center bg-emerald-50"><p className="text-[10px] text-emerald-500">Recovery Possible</p><p className="font-heading font-bold text-lg text-emerald-600">{formatCurrency(data.totalPotentialRecovery)}</p></div>
                    <div className="card p-3 text-center bg-red-50"><p className="text-[10px] text-red-500">If Not Sold</p><p className="font-heading font-bold text-lg text-red-600">{formatCurrency(data.totalPotentialLoss)}</p></div>
                  </div>

                  <div className="space-y-2">
                    {data.suggestions.map((s, i) => (
                      <div key={i} className={`card p-4 border-l-4 ${s.urgency === 'high' ? 'border-l-red-500 bg-red-50' : s.urgency === 'medium' ? 'border-l-amber-500 bg-amber-50' : 'border-l-blue-500'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{s.productName}</p>
                            <p className="text-[10px] text-slate-400">{s.category} · Sold today: {s.soldToday} · Excess: {s.excessStock}</p>
                          </div>
                          <span className={`badge ${s.urgency === 'high' ? 'badge-danger' : s.urgency === 'medium' ? 'badge-warning' : 'badge-info'}`}>{s.urgency}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div><span className="text-slate-400 line-through">{formatCurrency(s.originalPrice)}</span></div>
                          <div className="text-lg font-mono font-bold text-emerald-600">{formatCurrency(s.discountedPrice)}</div>
                          <span className="badge bg-red-100 text-red-600 border-red-200">{s.suggestedDiscount}% OFF</span>
                          <div className="ml-auto text-xs text-slate-400">Recovery: {formatCurrency(s.potentialRecovery)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STAFF LEADERBOARD */}
          {tab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {['today', 'week', 'month'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${period === p ? 'bg-brand-500 text-white' : 'bg-white border text-slate-500'}`}>
                    {p === 'today' ? 'Aaj' : p === 'week' ? 'Is Hafte' : 'Is Mahine'}
                  </button>
                ))}
              </div>

              <div className="card p-4 text-center bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                <p className="text-sm text-amber-600">🏆 Team Total Sales</p>
                <p className="text-3xl font-heading font-bold text-amber-700">{formatCurrency(data.totalTeamSales)}</p>
              </div>

              {data.leaderboard?.length === 0 ? <EmptyState title="Koi sale nahi hui abhi" /> : (
                <div className="space-y-3">
                  {data.leaderboard.map((entry, i) => (
                    <div key={i} className={`card p-4 ${i === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-lg' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                          i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg' :
                          i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white' :
                          i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {entry.medal || `#${entry.rank}`}
                        </div>
                        <div className="flex-1">
                          <p className="font-heading font-bold text-lg text-slate-800">{entry.name}</p>
                          <div className="flex gap-4 text-xs text-slate-400 mt-1">
                            <span>{entry.salesCount} bills</span>
                            <span>{entry.itemsSold} items</span>
                            <span>Avg: {formatCurrency(entry.avgSale)}</span>
                            <span>Max: {formatCurrency(entry.maxSale)}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                            <div className={`h-2 rounded-full ${i === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-brand-500'}`}
                              style={{ width: `${Math.min(100, (entry.totalSales / (data.dailyTarget || 50000)) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-xl text-brand-600">{formatCurrency(entry.totalSales)}</p>
                          <p className="text-[10px] text-slate-400">Target: {formatCurrency(data.dailyTarget)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUPPLIER COMPARISON */}
          {tab === 'supplier' && (
            <div className="space-y-4">
              <div className="card p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-center">
                <p className="text-sm text-blue-600 font-medium">📊 Supplier Price Comparison</p>
                <p className="text-xs text-blue-400">Same product ke different suppliers ke rates — kon sasta?</p>
              </div>

              {!data || data.length === 0 ? (
                <EmptyState icon={HiOutlineTruck} title="Abhi comparison nahi" message="Jab 2+ suppliers se same product khareedo ge to compare hoga" />
              ) : (
                <div className="space-y-3">
                  {data.map((comp, i) => (
                    <div key={i} className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-heading font-semibold text-slate-800">{comp.productName}</h3>
                        <span className="badge badge-success">Save {formatCurrency(comp.savingsPerUnit)}/unit ({comp.savingsPercent}%)</span>
                      </div>
                      <div className="space-y-1.5">
                        {comp.suppliers.map((s, j) => (
                          <div key={j} className={`flex items-center justify-between p-2.5 rounded-xl ${j === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                              {j === 0 && <span className="text-xs">✅</span>}
                              <span className={`text-sm ${j === 0 ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}>{s.supplierName}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-bold ${j === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{formatCurrency(s.lastCost)}</span>
                              <span className="text-[10px] text-slate-400 ml-2">{s.orderCount} orders</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
