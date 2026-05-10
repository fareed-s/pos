import { useState, useEffect } from 'react';
import { salesAPI } from '../utils/api';
import { formatCurrency, formatDateTime, getStatusColor } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader } from '../components/common';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlineShoppingCart, HiOutlineEye, HiOutlineBan, HiOutlineReceiptRefund,
  HiOutlinePrinter, HiOutlineFilter, HiOutlineDownload,
} from 'react-icons/hi';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnMethod, setReturnMethod] = useState('cash');

  useEffect(() => { fetchSales(); }, [page, search, statusFilter, startDate, endDate]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, search, status: statusFilter, startDate, endDate };
      const res = await salesAPI.getAll(params);
      setSales(res.data.data);
      setTotals(res.data.totals);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  };

  const viewSale = async (id) => {
    try {
      const res = await salesAPI.getOne(id);
      setSelectedSale(res.data.data);
      setShowDetail(true);
    } catch { toast.error('Failed to load sale details'); }
  };

  const handleVoid = async (sale) => {
    const { value: reason } = await Swal.fire({
      title: 'Void Sale', text: `Void invoice ${sale.invoiceNo}?`,
      input: 'text', inputLabel: 'Reason for voiding', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#DC2626', confirmButtonText: 'Void Sale',
      inputValidator: (v) => { if (!v) return 'Reason is required'; },
    });
    if (reason) {
      try {
        await salesAPI.void(sale._id, reason);
        toast.success('Sale voided');
        fetchSales();
        setShowDetail(false);
      } catch (err) { toast.error(err.response?.data?.message || 'Failed to void'); }
    }
  };

  const openReturn = (sale) => {
    setSelectedSale(sale);
    setReturnItems(sale.items.map(i => ({ ...i, returnQty: 0, selected: false })));
    setReturnReason('');
    setReturnMethod('cash');
    setShowReturn(true);
  };

  const handleReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.selected && i.returnQty > 0);
    if (itemsToReturn.length === 0) return toast.error('Select items to return');
    if (!returnReason) return toast.error('Return reason is required');

    try {
      await salesAPI.return(selectedSale._id, {
        items: itemsToReturn.map(i => ({ productId: i.productId.toString ? i.productId.toString() : i.productId, quantity: i.returnQty })),
        refundMethod: returnMethod,
        reason: returnReason,
      });
      toast.success('Return processed');
      setShowReturn(false);
      fetchSales();
    } catch (err) { toast.error(err.response?.data?.message || 'Return failed'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Sales History</h1>
          <p className="text-slate-500 text-sm">
            Total: <span className="font-semibold text-emerald-600">{formatCurrency(totals.totalAmount || 0)}</span> from {totals.totalCount || 0} sales
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search invoice, customer..." className="flex-1 min-w-[200px]" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[130px]">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
            <option value="returned">Returned</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input-field w-auto" />
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input-field w-auto" />
        </div>
      </div>

      {loading ? <PageLoader /> : sales.length === 0 ? (
        <EmptyState icon={HiOutlineShoppingCart} title="No sales found" message="Sales will appear here after completing transactions" />
      ) : (
        <div className="table-container bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Items</th>
                <th className="text-right">Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale._id}>
                  <td><span className="font-mono text-xs font-semibold text-brand-600">{sale.invoiceNo}</span></td>
                  <td className="text-sm text-slate-500">{formatDateTime(sale.saleDate)}</td>
                  <td className="text-sm">{sale.customerName}</td>
                  <td className="text-sm text-slate-500">{sale.cashierName}</td>
                  <td className="text-sm text-slate-500">{sale.items?.length || 0}</td>
                  <td className="text-right font-mono font-semibold">{formatCurrency(sale.grandTotal)}</td>
                  <td>
                    <div className="flex gap-1">
                      {sale.payments?.map((p, i) => (
                        <span key={i} className="badge badge-info text-[10px]">{p.method}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className={`badge ${getStatusColor(sale.status)}`}>{sale.status}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => viewSale(sale._id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="View"><HiOutlineEye className="w-4 h-4" /></button>
                      {sale.status === 'completed' && (
                        <>
                          <button onClick={() => handleVoid(sale)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Void"><HiOutlineBan className="w-4 h-4" /></button>
                          <button onClick={() => openReturn(sale)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600" title="Return"><HiOutlineReceiptRefund className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      {/* Sale Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`Invoice: ${selectedSale?.invoiceNo || ''}`} size="lg">
        {selectedSale && (
          <div className="space-y-4 print-receipt">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Date:</span> <span className="font-medium">{formatDateTime(selectedSale.saleDate)}</span></div>
              <div><span className="text-slate-400">Status:</span> <span className={`badge ${getStatusColor(selectedSale.status)} ml-1`}>{selectedSale.status}</span></div>
              <div><span className="text-slate-400">Customer:</span> <span className="font-medium">{selectedSale.customerName}</span></div>
              <div><span className="text-slate-400">Cashier:</span> <span className="font-medium">{selectedSale.cashierName}</span></div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Product</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Disc</th><th className="text-right">Tax</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {selectedSale.items.map((item, i) => (
                    <tr key={i}>
                      <td><p className="font-medium">{item.productName}</p><p className="text-[10px] font-mono text-slate-400">{item.sku}</p></td>
                      <td className="text-right font-mono text-sm">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right font-mono text-sm">{item.quantity}</td>
                      <td className="text-right font-mono text-sm text-emerald-600">{item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-'}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(item.taxAmount)}</td>
                      <td className="text-right font-mono text-sm font-semibold">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-mono">{formatCurrency(selectedSale.taxTotal)}</span></div>
              {selectedSale.discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-mono">-{formatCurrency(selectedSale.discountTotal)}</span></div>}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200"><span>Grand Total</span><span className="font-mono">{formatCurrency(selectedSale.grandTotal)}</span></div>
              <div className="pt-2 border-t border-slate-200">
                {selectedSale.payments?.map((p, i) => (
                  <div key={i} className="flex justify-between text-slate-500"><span>Paid ({p.method})</span><span className="font-mono">{formatCurrency(p.amount)}</span></div>
                ))}
                {selectedSale.changeGiven > 0 && <div className="flex justify-between font-medium"><span>Change Given</span><span className="font-mono">{formatCurrency(selectedSale.changeGiven)}</span></div>}
              </div>
            </div>

            {selectedSale.voidReason && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm">
                <span className="font-semibold text-red-700">Void Reason:</span> <span className="text-red-600">{selectedSale.voidReason}</span>
              </div>
            )}

            {/* Khata proof — only present on credit sales where the cashier captured proof */}
            {(selectedSale.udharType || selectedSale.udharProofImage || selectedSale.udharProofVoice) && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 print:hidden">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                    <HiOutlineReceiptRefund className="w-4 h-4" />
                    Khata (Udhar) Entry
                  </p>
                  <span className={`badge ${selectedSale.udharType === 'someone_else' ? 'badge-warning' : 'badge-success'}`}>
                    {selectedSale.udharType === 'someone_else' ? 'Someone Else' : 'Self'}
                  </span>
                </div>
                {selectedSale.udharProxyName && (
                  <p className="text-xs text-amber-700 mb-2">
                    Picked up by: <span className="font-semibold">{selectedSale.udharProxyName}</span>
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSale.udharProofImage && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">Photo Proof</p>
                      <a href={selectedSale.udharProofImage} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={selectedSale.udharProofImage}
                          alt="Khata proof"
                          className="w-full max-h-40 object-cover rounded-lg border border-amber-200 hover:border-amber-400 transition-colors"
                        />
                        <span className="text-[10px] text-amber-600 mt-1 block">Click to view full size →</span>
                      </a>
                    </div>
                  )}
                  {selectedSale.udharProofVoice && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">Voice Note</p>
                      <audio src={selectedSale.udharProofVoice} controls className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action bar — hidden during print thanks to body * { visibility: hidden } */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setShowDetail(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => setTimeout(() => window.print(), 50)}
                className="btn-primary flex items-center gap-1.5"
              >
                <HiOutlinePrinter className="w-4 h-4" /> Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return Modal */}
      <Modal isOpen={showReturn} onClose={() => setShowReturn(false)} title="Process Return" size="lg">
        {selectedSale && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Select items to return from invoice <span className="font-mono font-semibold">{selectedSale.invoiceNo}</span></p>

            <div className="space-y-2">
              {returnItems.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border-2 transition-colors ${item.selected ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={item.selected}
                      onChange={(e) => {
                        const items = [...returnItems];
                        items[i].selected = e.target.checked;
                        if (e.target.checked && items[i].returnQty === 0) items[i].returnQty = items[i].quantity;
                        if (!e.target.checked) items[i].returnQty = 0;
                        setReturnItems(items);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-slate-400">Sold: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                    {item.selected && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Return qty:</label>
                        <input type="number" value={item.returnQty}
                          onChange={(e) => { const items = [...returnItems]; items[i].returnQty = Math.min(item.quantity, Number(e.target.value)); setReturnItems(items); }}
                          className="w-16 text-center text-sm font-mono border rounded-lg px-2 py-1" min={1} max={item.quantity} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Refund Method</label>
                <select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)} className="input-field">
                  <option value="cash">Cash</option>
                  <option value="credit">Store Credit</option>
                  <option value="exchange">Exchange</option>
                </select>
              </div>
              <div>
                <label className="input-label">Estimated Refund</label>
                <p className="font-mono font-bold text-lg text-brand-600 mt-1">
                  {formatCurrency(returnItems.filter(i => i.selected).reduce((s, i) => s + (i.quantity > 0 ? (i.lineTotal / i.quantity) * i.returnQty : 0), 0))}
                </p>
              </div>
            </div>

            <div>
              <label className="input-label">Reason *</label>
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="input-field" placeholder="Reason for return" />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button onClick={() => setShowReturn(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleReturn} className="btn-primary">Process Return</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
