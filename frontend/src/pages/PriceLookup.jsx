import { useState, useEffect, useRef } from 'react';
import { productAPI } from '../utils/api';
import { formatCurrency } from '../utils/format';
import {
  HiOutlineSearch, HiOutlineCube, HiOutlineTrendingUp,
  HiOutlineExclamationCircle, HiOutlineX,
} from 'react-icons/hi';

export default function PriceLookup() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchAllProducts();
    searchRef.current?.focus();
  }, []);

  const fetchAllProducts = async () => {
    try {
      const res = await productAPI.getAll({ limit: 500, status: 'active' });
      setAllProducts(res.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    let filtered = allProducts;

    if (query.length > 0) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p =>
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    setResults(filtered);
  }, [query, allProducts]);

  const margin = (p) => p.costPrice > 0 ? ((p.salePrice - p.costPrice) / p.costPrice * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          <HiOutlineSearch className="w-7 h-7 text-brand-500" />
          Price Lookup
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Product ka naam type karo — Purchase Price, Sale Price aur Stock sab dikh jayega
        </p>
      </div>

      {/* Big Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Product ka naam likho... (e.g. Dalda, Samosa, Sugar, Daal)"
            className="w-full pr-12 py-4 text-lg rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40 focus:outline-none transition-all shadow-sm"
            style={{ paddingLeft: '3.25rem' }}
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); searchRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <HiOutlineX className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Results Count — All Items pill keeps the "you're seeing everything" cue
          without the category chip soup the screen used to drown in. */}
      <div className="flex flex-col items-center gap-2">
        <span className="px-4 py-1.5 rounded-full bg-brand-500 text-white text-sm font-medium shadow-sm">
          All Items ({allProducts.length})
        </span>
        <p className="text-sm text-slate-400">
          {results.length} product{results.length !== 1 ? 's' : ''} mil gaye
        </p>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineCube className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-lg font-heading font-semibold text-slate-300 dark:text-slate-500">Koi product nahi mila</p>
          <p className="text-sm text-slate-400 mt-1">Doosra naam try karo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {results.map(p => {
            const m = margin(p);
            const profit = p.salePrice - p.costPrice;
            const lowStock = p.currentStock <= p.lowStockThreshold;
            return (
              <div
                key={p._id}
                onClick={() => setSelectedProduct(selectedProduct?._id === p._id ? null : p)}
                className={`group relative overflow-hidden rounded-2xl border-2 cursor-pointer transition-all bg-white dark:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 ${
                  selectedProduct?._id === p._id
                    ? 'border-brand-500 shadow-xl ring-2 ring-brand-100 dark:ring-brand-900/40'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* subtle gradient corner accent */}
                <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br from-brand-100/50 to-purple-100/40 dark:from-brand-900/30 dark:to-purple-900/20 blur-xl pointer-events-none" />

                <div className="relative p-4">
                  {/* Product Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 min-h-[2.5em]">
                        {p.productName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                        {p.category?.name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                            {p.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {lowStock && (
                      <HiOutlineExclamationCircle className={`w-5 h-5 flex-shrink-0 ${p.currentStock <= 0 ? 'text-red-500' : 'text-amber-500'}`} />
                    )}
                  </div>

                  {/* Price Cards */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide">Cost Price</p>
                      <p className="font-mono font-bold text-slate-700 dark:text-slate-200 text-base mt-0.5">
                        {formatCurrency(p.costPrice)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/20">
                      <p className="text-[10px] font-semibold text-brand-100 tracking-wide">Sale Price</p>
                      <p className="font-mono font-bold text-base mt-0.5">
                        {formatCurrency(p.salePrice)}
                      </p>
                    </div>
                  </div>

                  {/* Stock + Margin */}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Stock:</span>
                      <span className={`font-mono font-bold ${
                        p.currentStock <= 0 ? 'text-red-600' :
                        lowStock ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {p.currentStock}{p.unit ? ' ' + p.unit : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      <HiOutlineTrendingUp className="w-3.5 h-3.5" />
                      <span className="font-mono font-bold text-xs">
                        +{formatCurrency(profit)} ({m.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedProduct?._id === p._id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs animate-fade-in">
                      {p.wholesalePrice > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Wholesale Price:</span>
                          <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(p.wholesalePrice)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Profit per item:</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(profit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Profit Margin:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{m.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Stock Value (Cost):</span>
                        <span className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(p.currentStock * p.costPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Low Stock Alert:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-200">{p.lowStockThreshold}{p.unit ? ' ' + p.unit : ''}</span>
                      </div>
                      {p.brand && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Brand:</span>
                          <span className="text-slate-700 dark:text-slate-200">{p.brand}</span>
                        </div>
                      )}
                      {p.supplier?.supplierName && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Supplier:</span>
                          <span className="text-slate-700 dark:text-slate-200">{p.supplier.supplierName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
