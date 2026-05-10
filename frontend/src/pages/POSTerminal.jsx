import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productAPI, salesAPI, customerAPI } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { usePrivacy } from '../context/PrivacyContext';
import KhataModal from '../components/pos/KhataModal';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineX, HiOutlinePlus, HiOutlineMinus, HiOutlineTrash,
  HiOutlineShoppingCart, HiOutlineCash, HiOutlineCreditCard, HiOutlineGlobe,
  HiOutlinePause, HiOutlineReceiptRefund, HiOutlineUser,
  HiOutlineUserAdd, HiOutlineStar, HiOutlinePrinter, HiOutlineCheck,
  HiOutlineClipboardList, HiOutlineEye,
} from 'react-icons/hi';

export default function POSTerminal() {
  const { user, settings, viewOnly, isExpired } = useAuth();
  // Privacy mode — only masks the today-summary chip in the topbar. Cart totals,
  // line items, change due, receipts: ALL real (else cashier would charge wrong).
  const { maskCurrency: mC, maskNumber: mN } = usePrivacy();
  const searchRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ customerName: '', phone: '' });
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState('percentage');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  // Partial payment on credit sales — how much the customer is paying RIGHT NOW in cash;
  // the rest is added to their khata balance. '' = nothing paid up front (full credit).
  const [creditPaidNow, setCreditPaidNow] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [heldSales, setHeldSales] = useState([]);
  const [showHeld, setShowHeld] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [showKhata, setShowKhata] = useState(false);

  // Cashier discount cap: the lower of the per-staff `maxDiscountPercent` and the
  // business-wide `settings.maxCashierDiscount`. Owner/manager can always discount fully.
  const isCashier = user?.role === 'cashier';
  const cashierDiscountCap = Math.min(
    user?.maxDiscountPercent ?? 100,
    settings?.maxCashierDiscount ?? 100
  );
  const maxDiscount = isCashier ? cashierDiscountCap : 100;

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
    fetchFeatured();
    fetchHeldSales();
    fetchTodaySummary();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'Escape') {
        setShowSearchDrop(false);
        setShowCustomerDrop(false);
        setShowReceipt(false);
        setShowHeld(false);
        setShowNewCustomer(false);
        setShowKhata(false);
        return;
      }
      // Disable destructive shortcuts when the user is typing
      if (typing) return;
      if (e.key === 'F9') { e.preventDefault(); handleCompleteSale(); }
      if (e.key === 'F4') { e.preventDefault(); handleHoldSale(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, paymentMethod, amountTendered, selectedCustomer]);

  const fetchFeatured = async () => {
    try { const res = await productAPI.getFeatured(); setFeaturedProducts(res.data.data); } catch {}
  };

  const fetchHeldSales = async () => {
    try { const res = await salesAPI.getHeld(); setHeldSales(res.data.data); } catch {}
  };

  const fetchTodaySummary = async () => {
    try { const res = await salesAPI.getTodaySummary(); setTodaySummary(res.data.data); } catch {}
  };

  // Product search with debounce
  useEffect(() => {
    if (searchQuery.length < 1) { setSearchResults([]); setShowSearchDrop(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await productAPI.search(searchQuery);
        setSearchResults(res.data.data);
        setShowSearchDrop(true);
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 1) { setCustomerResults([]); setShowCustomerDrop(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await customerAPI.search(customerSearch);
        setCustomerResults(res.data.data);
        setShowCustomerDrop(true);
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Add product to cart
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id);
      if (existing) {
        return prev.map(item =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        productId: product._id,
        productName: product.productName,
        sku: product.sku,
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
        quantity: 1,
        discount: 0,
        discountType: 'percentage',
        tax: product.tax || 0,
        lineTotal: product.salePrice,
        currentStock: product.currentStock,
        unit: product.unit,
      }];
    });
    setSearchQuery('');
    setShowSearchDrop(false);
    searchRef.current?.focus();
  }, []);

  // Update cart item
  const updateCartItem = (productId, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const updated = { ...item, [field]: value };
      // Recalc line total
      let discountAmt = 0;
      if (updated.discount > 0) {
        discountAmt = updated.discountType === 'fixed' ? updated.discount : (updated.unitPrice * updated.quantity * updated.discount) / 100;
      }
      updated.lineTotal = updated.unitPrice * updated.quantity - discountAmt;
      return updated;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setOverallDiscount(0);
    setAmountTendered('');
    setCreditPaidNow('');
    setNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountTotal = cart.reduce((sum, item) => {
    if (!item.discount) return sum;
    return sum + (item.discountType === 'fixed' ? item.discount : (item.unitPrice * item.quantity * item.discount) / 100);
  }, 0);
  const taxTotal = cart.reduce((sum, item) => {
    let discAmt = item.discountType === 'fixed' ? item.discount : (item.unitPrice * item.quantity * item.discount) / 100;
    return sum + ((item.unitPrice * item.quantity - discAmt) * item.tax) / 100;
  }, 0);
  const overallDiscountAmount = overallDiscountType === 'fixed' ? overallDiscount : (subtotal * overallDiscount) / 100;
  const discountTotal = itemDiscountTotal + overallDiscountAmount;
  const grandTotal = subtotal + taxTotal - discountTotal;
  const change = amountTendered ? Math.max(0, Number(amountTendered) - grandTotal) : 0;

  // Partial-payment math for credit sales. paidNow is what the customer is handing
  // over right now in cash; remainingCredit is what gets added to their khata balance.
  // Clamped so paidNow can never exceed grandTotal (no negative khata).
  const creditPaidNumber = Math.min(grandTotal, Math.max(0, Number(creditPaidNow) || 0));
  const remainingCredit = Math.max(0, grandTotal - creditPaidNumber);

  // Step 1: validate, then either submit straight away (cash/card/online)
  // or open the Khata modal (credit). Khata modal then calls submitSale().
  const handleCompleteSale = () => {
    if (viewOnly) return toast.error('Subscription expired — sales are blocked');
    if (cart.length === 0) return toast.error('Cart is empty');
    if (paymentMethod === 'credit' && !selectedCustomer) {
      return toast.error('Credit sale requires selecting a customer');
    }
    if (paymentMethod === 'cash' && amountTendered && Number(amountTendered) < grandTotal) {
      return toast.error('Insufficient payment amount');
    }
    if (paymentMethod === 'credit') {
      // Edge case: customer is paying the full amount in cash through the credit flow.
      // Skip the khata modal — there's no balance to record.
      if (remainingCredit <= 0) {
        return submitSale(null, true /* paidInFull */);
      }
      setShowKhata(true);
      return;
    }
    submitSale();
  };

  // Step 2: actual API call. khataPayload (optional) carries Self/Other + proof URLs.
  // paidInFull (rare) means the customer chose Credit but paid the entire bill in cash.
  const submitSale = async (khataPayload = null, paidInFull = false) => {
    setProcessing(true);
    try {
      // Build the payments array. Three shapes:
      //   1. Non-credit  → single entry of that method.
      //   2. Credit, full khata  → single credit entry.
      //   3. Credit, partial pay → cash entry + credit entry; sum = grandTotal.
      let payments;
      if (paymentMethod !== 'credit') {
        payments = [{ method: paymentMethod, amount: grandTotal }];
      } else if (paidInFull) {
        payments = [{ method: 'cash', amount: grandTotal }];
      } else if (creditPaidNumber > 0) {
        payments = [
          { method: 'cash', amount: creditPaidNumber },
          { method: 'credit', amount: remainingCredit },
        ];
      } else {
        payments = [{ method: 'credit', amount: grandTotal }];
      }

      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
        })),
        customerId: selectedCustomer?._id,
        customerName: selectedCustomer?.customerName || 'Walk-in Customer',
        payments,
        amountTendered: paymentMethod === 'cash' ? Number(amountTendered) || grandTotal : grandTotal,
        discountType: overallDiscountType,
        discountValue: overallDiscount,
        notes,
        ...(khataPayload || {}),
      };

      const res = await salesAPI.create(saleData);
      setLastSale(res.data.data);
      setShowReceipt(true);
      setShowKhata(false);
      clearCart();
      fetchTodaySummary();
      toast.success(`Sale completed: ${res.data.data.invoiceNo}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sale failed');
    } finally {
      setProcessing(false);
    }
  };

  // Hold sale
  const handleHoldSale = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    try {
      await salesAPI.hold({
        items: cart,
        customerId: selectedCustomer?._id,
        customerName: selectedCustomer?.customerName || 'Walk-in Customer',
        notes,
      });
      toast.success('Sale held');
      clearCart();
      fetchHeldSales();
    } catch (err) {
      toast.error('Failed to hold sale');
    }
  };

  // Resume held sale
  const handleResumeHeld = async (id) => {
    try {
      const res = await salesAPI.resumeHeld(id);
      const held = res.data.data;
      setCart(held.items);
      if (held.customerId) {
        setSelectedCustomer({ _id: held.customerId, customerName: held.customerName });
      }
      setNotes(held.notes || '');
      setShowHeld(false);
      fetchHeldSales();
      toast.success('Sale resumed');
    } catch {
      toast.error('Failed to resume');
    }
  };

  // Quick add customer
  const handleQuickAddCustomer = async () => {
    if (!newCustomerForm.customerName || !newCustomerForm.phone) return toast.error('Name and phone required');
    try {
      const res = await customerAPI.quickAdd(newCustomerForm);
      setSelectedCustomer(res.data.data);
      setShowNewCustomer(false);
      setNewCustomerForm({ customerName: '', phone: '' });
      toast.success('Customer added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  // ── Quick Access pagination ──
  const QUICK_ACCESS_PER_PAGE = 18;
  const [quickPage, setQuickPage] = useState(1);
  const quickTotalPages = Math.max(1, Math.ceil(featuredProducts.length / QUICK_ACCESS_PER_PAGE));
  const quickPageItems = featuredProducts.slice(
    (quickPage - 1) * QUICK_ACCESS_PER_PAGE,
    quickPage * QUICK_ACCESS_PER_PAGE
  );
  // Reset page when results shrink
  useEffect(() => { if (quickPage > quickTotalPages) setQuickPage(1); }, [quickPage, quickTotalPages]);

  // ── Viewport detection so we mount the search input in exactly one place ──
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  // Inline JSX block (NOT a component) — keeps the same fiber across renders so
  // the input never remounts and focus stays after every keystroke.
  const searchBoxJsx = (
    <div className="relative">
      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        ref={searchRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Scan or search (F2)..."
        className="w-full pl-9 pr-3 py-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-slate-100 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all"
        autoFocus
      />
      {showSearchDrop && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto z-30">
          {searchResults.map(p => (
            <button
              key={p._id}
              onClick={() => addToCart(p)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div className="text-left min-w-0 flex-1 pr-2">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{p.productName}</p>
                <p className="text-[10px] text-slate-400">
                  <span className="font-mono">{p.sku}</span>
                  {p.barcode && <span className="ml-2">• {p.barcode}</span>}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-semibold text-sm text-brand-600 dark:text-brand-400">{formatCurrency(p.salePrice)}</p>
                <p className={`text-[10px] font-mono ${p.currentStock <= 0 ? 'text-red-500' : p.currentStock <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  Stock: {p.currentStock}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col overflow-hidden" style={{ zIndex: 40 }}>
      {/* Top Bar */}
      <div className="h-12 bg-navy-900 flex items-center justify-between px-3 sm:px-4 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <HiOutlineShoppingCart className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <span className="text-white font-heading font-semibold text-sm whitespace-nowrap">POS Terminal</span>
          <span className="text-slate-400 text-xs hidden sm:inline truncate">| {user?.name}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-400">
          {todaySummary && (
            <>
              <span className="hidden xs:inline">Sales: <span className="text-emerald-400 font-semibold">{formatCurrency(mC(todaySummary.totalSales))}</span></span>
              <span className="hidden sm:inline">Count: <span className="text-white font-semibold">{mN(todaySummary.salesCount)}</span></span>
            </>
          )}
          <span className="text-slate-500 hidden xl:inline">F2: Search | F4: Hold | F9: Complete | Esc: Close</span>
          <Link to="/dashboard" className="text-brand-400 hover:text-brand-300 font-medium whitespace-nowrap">← Back</Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* LEFT PANEL — Search + Quick Access (desktop only, fills remaining space) */}
        <div className="hidden md:flex md:flex-1 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-0">
          {/* Search Bar (desktop) */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 relative">
            {isDesktop && searchBoxJsx}
          </div>

          {/* Quick Access — always visible */}
          <div className="px-2.5 pt-2 pb-1.5 flex items-center justify-between flex-shrink-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <HiOutlineStar className="w-3 h-3" /> Quick Access
            </p>
            <span className="text-[10px] text-slate-400 font-mono">{featuredProducts.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {featuredProducts.length === 0 ? (
              <div className="text-center text-[11px] text-slate-400 py-12 px-2">
                Mark products as <span className="font-semibold">featured</span> to show here.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5">
                {quickPageItems.map(p => (
                  <button
                    key={p._id}
                    onClick={() => addToCart(p)}
                    disabled={p.currentStock <= 0 && !settings?.allowNegativeStock}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    title={p.productName}
                  >
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-300 leading-tight min-h-[2.2em]">
                      {p.productName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] font-mono font-bold text-brand-600 dark:text-brand-400">
                        {formatCurrency(p.salePrice)}
                      </p>
                      <p className={`text-[9px] font-mono ${p.currentStock <= 0 ? 'text-red-500' : p.currentStock <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {p.currentStock}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Pagination */}
          {quickTotalPages > 1 && (
            <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
              <button
                onClick={() => setQuickPage(p => Math.max(1, p - 1))}
                disabled={quickPage === 1}
                className="px-2 py-0.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-200"
              >
                ←
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {quickPage} / {quickTotalPages}
              </span>
              <button
                onClick={() => setQuickPage(p => Math.min(quickTotalPages, p + 1))}
                disabled={quickPage === quickTotalPages}
                className="px-2 py-0.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-200"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* MIDDLE PANEL — Cart (fixed width on desktop, full width on mobile) */}
        <div className="w-full md:w-[420px] lg:w-[460px] xl:w-[500px] flex flex-col bg-slate-50 dark:bg-slate-900 flex-shrink-0 md:overflow-hidden border-l border-slate-200 dark:border-slate-700">
          {/* Mobile-only sticky search (replaces hidden left panel) */}
          {!isDesktop && (
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-20">
              {searchBoxJsx}
            </div>
          )}

          <div className="px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <HiOutlineShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500 flex-shrink-0" />
              <h2 className="font-heading font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">Cart</h2>
              {cart.length > 0 && (
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  · {cart.length} items · {cart.reduce((s, i) => s + i.quantity, 0)} qty
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="px-2 py-1 text-[11px] sm:text-xs font-medium text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 md:overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-slate-400 dark:text-slate-500 p-6">
                <HiOutlineShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 mb-3 text-slate-200 dark:text-slate-700" />
                <p className="text-base sm:text-lg font-heading font-semibold text-slate-300 dark:text-slate-500">Cart is empty</p>
                <p className="text-xs sm:text-sm mt-1">Search above to add items</p>
              </div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                    <tr className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                      <th className="text-left pl-2 pr-1 py-2 font-semibold w-6">#</th>
                      <th className="text-left px-1 py-2 font-semibold">Product</th>
                      <th className="text-center px-1 py-2 font-semibold w-14">Price</th>
                      <th className="text-center px-1 py-2 font-semibold w-24">Qty</th>
                      <th className="text-center px-1 py-2 font-semibold w-12">Disc</th>
                      <th className="text-right px-1 py-2 font-semibold w-16">Total</th>
                      <th className="w-7"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800/40">
                    {cart.map((item, idx) => (
                      <tr key={item.productId} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/40">
                        <td className="pl-2 pr-1 py-1.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-1 py-1.5 min-w-0">
                          <p className="font-medium text-xs text-slate-800 dark:text-slate-100 truncate">{item.productName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateCartItem(item.productId, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                            className="w-12 text-center text-[11px] font-mono border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md px-0.5 py-1 focus:border-brand-500 focus:outline-none"
                            min={0}
                            step="0.01"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => updateCartItem(item.productId, 'quantity', Math.max(0.5, item.quantity - 1))}
                              className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              <HiOutlineMinus className="w-2.5 h-2.5 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(item.productId, 'quantity', Number(e.target.value) || 1)}
                              className="w-10 text-center text-[11px] font-mono font-semibold border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md px-0.5 py-1 focus:border-brand-500 focus:outline-none"
                              min={0.01}
                              step={item.unit === 'kg' || item.unit === 'liter' ? 0.1 : 1}
                            />
                            <button
                              onClick={() => updateCartItem(item.productId, 'quantity', item.quantity + 1)}
                              className="w-5 h-5 rounded bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-300 flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              <HiOutlinePlus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateCartItem(item.productId, 'discount', Math.min(maxDiscount, Math.max(0, Number(e.target.value) || 0)))}
                            className="w-10 text-center text-[11px] font-mono border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md px-0.5 py-1 focus:border-brand-500 focus:outline-none"
                            min={0} max={maxDiscount}
                            title={isCashier ? `Max allowed: ${maxDiscount}%` : undefined}
                          />
                        </td>
                        <td className="px-1 py-1.5 text-right font-mono font-semibold text-xs text-slate-800 dark:text-slate-100">{formatCurrency(item.lineTotal)}</td>
                        <td className="pr-1">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile cart cards (stacked) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800/40">
                  {cart.map((item, idx) => (
                    <div key={item.productId} className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-400 font-mono">{idx + 1} · {item.sku}</p>
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{item.productName}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 flex-shrink-0"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Price</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateCartItem(item.productId, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                            className="w-full text-center text-sm font-mono border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md px-1 py-1 focus:border-brand-500 focus:outline-none"
                            min={0} step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Qty</label>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => updateCartItem(item.productId, 'quantity', Math.max(0.5, item.quantity - 1))}
                              className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center">
                              <HiOutlineMinus className="w-3 h-3 dark:text-slate-200" />
                            </button>
                            <input
                              type="number" value={item.quantity}
                              onChange={(e) => updateCartItem(item.productId, 'quantity', Number(e.target.value) || 1)}
                              className="w-10 text-center text-sm font-mono font-semibold border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-md py-1"
                              min={0.01} step={item.unit === 'kg' ? 0.1 : 1}
                            />
                            <button onClick={() => updateCartItem(item.productId, 'quantity', item.quantity + 1)}
                              className="w-7 h-7 rounded-md bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                              <HiOutlinePlus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Total</label>
                          <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">{formatCurrency(item.lineTotal)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Summary & Payment */}
        <div className="w-full md:w-[280px] lg:w-[300px] xl:w-[320px] flex flex-col bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex-shrink-0 md:overflow-hidden">
          {/* Customer Selector */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-brand-50 border border-brand-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                    <HiOutlineUser className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-800">{selectedCustomer.customerName}</p>
                    <p className="text-[10px] text-brand-500">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded hover:bg-brand-100">
                  <HiOutlineX className="w-4 h-4 text-brand-400" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Walk-in Customer (search to select)"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                />
                <button onClick={() => setShowNewCustomer(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-brand-50 text-brand-500" title="Add new customer">
                  <HiOutlineUserAdd className="w-4 h-4" />
                </button>
                {showCustomerDrop && customerResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-20">
                    {customerResults.map(c => (
                      <button key={c._id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDrop(false); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-50 text-left border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{c.customerName}</p>
                          <p className="text-[10px] text-slate-400">{c.phone} · {c.customerType}</p>
                        </div>
                        {c.currentBalance > 0 && <span className="text-[10px] font-mono text-red-500">Due: {formatCurrency(c.currentBalance)}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Tax</span><span className="font-mono text-slate-600">+{formatCurrency(taxTotal)}</span></div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-mono">-{formatCurrency(discountTotal)}</span></div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-heading font-bold text-lg text-slate-800">Grand Total</span>
                <span className="font-mono font-bold text-2xl text-brand-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Overall Discount — clamped to cashier cap when type is percentage, to subtotal when fixed */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Discount</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  value={overallDiscount}
                  onChange={(e) => {
                    const raw = Number(e.target.value) || 0;
                    const cap = overallDiscountType === 'percentage' ? maxDiscount : Math.max(0, subtotal);
                    setOverallDiscount(Math.min(cap, Math.max(0, raw)));
                  }}
                  className="flex-1 text-sm font-mono border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 focus:border-brand-500 focus:outline-none"
                  min={0}
                  max={overallDiscountType === 'percentage' ? maxDiscount : undefined}
                  title={isCashier && overallDiscountType === 'percentage' ? `Max allowed: ${maxDiscount}%` : undefined}
                />
                <select
                  value={overallDiscountType}
                  onChange={(e) => { setOverallDiscountType(e.target.value); setOverallDiscount(0); }}
                  className="text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-2 py-2 focus:border-brand-500 focus:outline-none"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">Rs.</option>
                </select>
              </div>
              {isCashier && overallDiscountType === 'percentage' && (
                <p className="text-[10px] text-slate-400 mt-1">Cashier limit: {maxDiscount}%</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {[
                  { key: 'cash', icon: HiOutlineCash, label: 'Cash', activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                  { key: 'card', icon: HiOutlineCreditCard, label: 'Card', activeClass: 'border-blue-500 bg-blue-50 text-blue-700' },
                  { key: 'online', icon: HiOutlineGlobe, label: 'Online', activeClass: 'border-purple-500 bg-purple-50 text-purple-700' },
                  { key: 'credit', icon: HiOutlineReceiptRefund, label: 'Credit', activeClass: 'border-amber-500 bg-amber-50 text-amber-700' },
                ].map(pm => (
                  <button
                    key={pm.key}
                    onClick={() => setPaymentMethod(pm.key)}
                    className={`p-2 rounded-xl border-2 text-center text-xs font-medium transition-all ${
                      paymentMethod === pm.key
                        ? pm.activeClass
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <pm.icon className="w-4 h-4 mx-auto mb-0.5" />
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit / Khata partial payment — customer can pay part now in cash,
                rest goes on their khata balance. Default: full credit (paid now = 0). */}
            {paymentMethod === 'credit' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-900/20 dark:border-amber-700 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Paid Now (cash)</label>
                  {creditPaidNow !== '' && (
                    <button onClick={() => setCreditPaidNow('')} className="text-[10px] text-slate-400 hover:text-red-500">Clear</button>
                  )}
                </div>
                <input
                  type="number"
                  value={creditPaidNow}
                  onChange={(e) => setCreditPaidNow(e.target.value)}
                  placeholder="0 (full khata) or partial amount"
                  className="w-full text-base font-mono font-semibold text-center border-2 border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
                  min={0}
                  max={grandTotal}
                  step="any"
                />

                {/* Quick split buttons — half / full grand-total. Tap once to fill. */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCreditPaidNow('')}
                    className="py-1 text-[11px] rounded-md border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Full Khata
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditPaidNow(String(Math.round(grandTotal / 2)))}
                    className="py-1 text-[11px] rounded-md border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Half ({formatCurrency(Math.round(grandTotal / 2))})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditPaidNow(String(grandTotal))}
                    className="py-1 text-[11px] rounded-md border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Pay Full
                  </button>
                </div>

                {/* Live split preview */}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200 dark:border-amber-700">
                  <div className="text-emerald-700 dark:text-emerald-300">
                    Cash: <span className="font-mono font-semibold">{formatCurrency(creditPaidNumber)}</span>
                  </div>
                  <div className="text-amber-700 dark:text-amber-300">
                    Khata: <span className="font-mono font-bold">{formatCurrency(remainingCredit)}</span>
                  </div>
                </div>

                {selectedCustomer && remainingCredit > 0 && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedCustomer.customerName}'s new balance after sale:&nbsp;
                    <span className="font-semibold">
                      {formatCurrency((selectedCustomer.currentBalance || 0) + remainingCredit)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Cash Tendered */}
            {paymentMethod === 'cash' && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount Tendered</label>
                  {amountTendered && (
                    <button onClick={() => setAmountTendered('')} className="text-[10px] text-slate-400 hover:text-red-500">Clear</button>
                  )}
                </div>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder={grandTotal.toString()}
                  className="w-full mt-1 text-lg font-mono font-semibold text-center border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
                {amountTendered && Number(amountTendered) >= grandTotal && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <p className="text-xs text-emerald-600 font-medium">Change</p>
                    <p className="text-xl font-mono font-bold text-emerald-700">{formatCurrency(change)}</p>
                  </div>
                )}
                {/* Quick amount buttons — accumulate (tap 100 then 500 → 600) */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[100, 500, 1000, 5000].map(v => (
                    <button
                      key={v}
                      onClick={() => setAmountTendered(prev => String((Number(prev) || 0) + v))}
                      className="py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t border-slate-200 space-y-2">
            {viewOnly && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <HiOutlineEye className="w-4 h-4 flex-shrink-0" />
                <span><strong>View-only</strong> — Subscription expired. Sales are temporarily disabled.</span>
              </div>
            )}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || processing || viewOnly}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-heading font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : viewOnly ? (
                <><HiOutlineEye className="w-5 h-5" /> View-Only Mode</>
              ) : (
                <><HiOutlineCheck className="w-5 h-5" /> Complete Sale (F9)</>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleHoldSale}
                disabled={cart.length === 0}
                className="py-2.5 bg-amber-50 text-amber-700 border border-amber-200 font-medium text-sm rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <HiOutlinePause className="w-4 h-4" /> Hold (F4)
              </button>
              <button
                onClick={() => setShowHeld(true)}
                className="py-2.5 bg-slate-50 text-slate-600 border border-slate-200 font-medium text-sm rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 relative"
              >
                <HiOutlineClipboardList className="w-4 h-4" /> Held Sales
                {heldSales.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {heldSales.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <HiOutlineCheck className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="font-heading font-bold text-xl text-slate-800">Sale Complete!</h3>
              </div>

              {/* Receipt Content — print-receipt is targeted by the @media print rules in index.css */}
              <div id="receipt-content" className="print-receipt border-2 border-dashed border-slate-200 rounded-xl p-4 font-mono text-xs">
                <div className="text-center mb-3">
                  <p className="font-bold text-sm">POS System</p>
                  <p className="text-slate-500">{new Date(lastSale.saleDate).toLocaleString()}</p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 mb-2">
                  <div className="flex justify-between"><span>Invoice:</span><span className="font-bold">{lastSale.invoiceNo}</span></div>
                  <div className="flex justify-between"><span>Cashier:</span><span>{lastSale.cashierName}</span></div>
                  <div className="flex justify-between"><span>Customer:</span><span>{lastSale.customerName}</span></div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 mb-2 space-y-1">
                  {lastSale.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="flex-1 truncate">{item.productName}</span>
                      <span className="ml-2">{item.quantity}x{item.unitPrice}</span>
                      <span className="ml-2 font-semibold w-20 text-right">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(lastSale.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax:</span><span>{formatCurrency(lastSale.taxTotal)}</span></div>
                  {lastSale.discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Discount:</span><span>-{formatCurrency(lastSale.discountTotal)}</span></div>}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-slate-300">
                    <span>TOTAL:</span><span>{formatCurrency(lastSale.grandTotal)}</span>
                  </div>
                  {lastSale.payments?.map((p, i) => (
                    <div key={i} className="flex justify-between text-slate-500"><span>Paid ({p.method}):</span><span>{formatCurrency(p.amount)}</span></div>
                  ))}
                  {lastSale.changeGiven > 0 && <div className="flex justify-between font-bold"><span>Change:</span><span>{formatCurrency(lastSale.changeGiven)}</span></div>}
                </div>
                <div className="text-center mt-3 pt-2 border-t border-dashed border-slate-300">
                  <p className="text-slate-400">Thank you for your business!</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    // Defer to next tick so the modal is fully painted before the print
                    // dialog opens — fixes Chrome's intermittent blank first-print bug.
                    setTimeout(() => window.print(), 50);
                  }}
                  className="flex-1 btn-secondary flex items-center justify-center gap-1.5"
                >
                  <HiOutlinePrinter className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => { setShowReceipt(false); setLastSale(null); searchRef.current?.focus(); }}
                  className="flex-1 btn-primary"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Sales Modal */}
      {showHeld && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-heading font-semibold text-lg">Held Sales ({heldSales.length})</h3>
              <button onClick={() => setShowHeld(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2">
              {heldSales.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No held sales</p>
              ) : (
                heldSales.map(h => (
                  <div key={h._id} className="p-3 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{h.customerName}</p>
                        <p className="text-[10px] text-slate-400">{new Date(h.createdAt).toLocaleString()} · {h.items.length} items</p>
                      </div>
                      <p className="font-mono font-semibold text-brand-600">
                        {formatCurrency(h.items.reduce((s, i) => s + (i.lineTotal || i.unitPrice * i.quantity), 0))}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-400 mb-2 truncate">
                      {h.items.map(i => i.productName).join(', ')}
                    </div>
                    <button onClick={() => handleResumeHeld(h._id)} className="btn-primary btn-sm w-full">Resume Sale</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Quick Add Customer</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Name *</label>
                <input value={newCustomerForm.customerName} onChange={(e) => setNewCustomerForm(f => ({ ...f, customerName: e.target.value }))}
                  className="input-field mt-1" placeholder="Customer name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Phone *</label>
                <input value={newCustomerForm.phone} onChange={(e) => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field mt-1" placeholder="03001234567" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNewCustomer(false)} className="flex-1 btn-secondary">Cancel</button>
                <button onClick={handleQuickAddCustomer} className="flex-1 btn-primary">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Khata (udhar) modal — opens for credit sales before submission.
          `amount` shows the actual khata portion (after any partial payment), not
          the full bill, so the cashier verifies the right number. */}
      <KhataModal
        isOpen={showKhata}
        onClose={() => setShowKhata(false)}
        onConfirm={(payload) => submitSale(payload)}
        customer={selectedCustomer}
        amount={remainingCredit}
        paidNow={creditPaidNumber}
        grandTotal={grandTotal}
      />
    </div>
  );
}
