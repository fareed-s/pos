import { useState, useEffect } from 'react';
import { productAPI, bakeryAPI } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { PageLoader, SearchInput, Searchable } from '../components/common';
import toast from 'react-hot-toast';
import { HiOutlineSave, HiOutlineRefresh } from 'react-icons/hi';

export default function BulkPriceUpdate() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [changes, setChanges] = useState({});
  const [catFilter, setCatFilter] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await productAPI.getAll({ limit: 500, status: 'active' });
      setProducts(res.data.data);
      const cats = {};
      res.data.data.forEach(p => { if (p.category?.name) cats[p.category._id] = p.category.name; });
      setCategories(Object.entries(cats).map(([id, name]) => ({ id, name })));
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let f = products;
    if (catFilter) f = f.filter(p => p.category?._id === catFilter);
    if (search) { const q = search.toLowerCase(); f = f.filter(p => p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)); }
    setFiltered(f);
  }, [search, catFilter, products]);

  const handleChange = (productId, field, value) => {
    setChanges(prev => ({
      ...prev,
      [productId]: { ...prev[productId], productId, [field]: value === '' ? null : Number(value) },
    }));
  };

  const getVal = (productId, field, original) => {
    if (changes[productId] && changes[productId][field] !== undefined && changes[productId][field] !== null) return changes[productId][field];
    return original;
  };

  const isChanged = (productId) => !!changes[productId];

  const changedCount = Object.keys(changes).length;

  const handleSave = async () => {
    if (changedCount === 0) return toast.error('Koi change nahi kiya');
    setSaving(true);
    try {
      // Strip null/blank fields and rows that have nothing to update
      const updates = Object.values(changes)
        .map(u => {
          const cleaned = { productId: u.productId };
          for (const [k, v] of Object.entries(u)) {
            if (k === 'productId') continue;
            if (v !== null && v !== undefined && !Number.isNaN(v)) cleaned[k] = v;
          }
          return cleaned;
        })
        .filter(u => u.productId && Object.keys(u).length > 1);

      if (updates.length === 0) {
        setSaving(false);
        return toast.error('Koi valid change nahi mila');
      }
      await bakeryAPI.bulkUpdatePrices({ updates });
      toast.success(`${updates.length} products ke rates update ho gaye!`);
      setChanges({});
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">💲 Bulk Price Update</h1>
          <p className="text-slate-500 text-sm">Ek saath multiple products ke rates change karo</p>
        </div>
        {changedCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-amber-600">{changedCount} products changed</span>
            <button onClick={() => setChanges({})} className="btn-secondary btn-sm"><HiOutlineRefresh className="w-4 h-4" /> Reset</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? '...' : <><HiOutlineSave className="w-5 h-5" /> Save All Changes</>}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Product search karo..." className="flex-1 min-w-[200px]" />
        <div className="w-56">
          <Searchable
            value={catFilter}
            onChange={(v) => setCatFilter(v)}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder="All Categories"
          />
        </div>
      </div>

      <div className="table-container bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th className="text-center">Purani Cost</th>
              <th className="text-center bg-amber-50">Nayi Cost Price</th>
              <th className="text-center">Purana Sale</th>
              <th className="text-center bg-emerald-50">Naya Sale Price</th>
              <th className="text-center">Profit</th>
              <th className="text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const newCost = getVal(p._id, 'costPrice', p.costPrice);
              const newSale = getVal(p._id, 'salePrice', p.salePrice);
              const profit = newSale - newCost;
              const changed = isChanged(p._id);
              return (
                <tr key={p._id} className={changed ? 'bg-amber-50/50' : ''}>
                  <td>
                    <p className="font-medium text-sm">{p.productName}</p>
                    <p className="text-[10px] text-slate-400">{p.category?.name}</p>
                  </td>
                  <td className="font-mono text-xs text-slate-400">{p.sku}</td>
                  <td className="text-center font-mono text-sm text-slate-400">{formatCurrency(p.costPrice)}</td>
                  <td className="text-center bg-amber-50/50">
                    <input type="number" value={getVal(p._id, 'costPrice', p.costPrice)}
                      onChange={(e) => handleChange(p._id, 'costPrice', e.target.value)}
                      className="w-24 text-center text-sm font-mono border border-amber-200 rounded-lg px-2 py-1.5 focus:border-amber-500 focus:outline-none bg-white" min={0} />
                  </td>
                  <td className="text-center font-mono text-sm text-slate-400">{formatCurrency(p.salePrice)}</td>
                  <td className="text-center bg-emerald-50/50">
                    <input type="number" value={getVal(p._id, 'salePrice', p.salePrice)}
                      onChange={(e) => handleChange(p._id, 'salePrice', e.target.value)}
                      className="w-24 text-center text-sm font-mono border border-emerald-200 rounded-lg px-2 py-1.5 focus:border-emerald-500 focus:outline-none bg-white" min={0} />
                  </td>
                  <td className={`text-center font-mono text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </td>
                  <td className="text-right font-mono text-sm">{p.currentStock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {changedCount > 0 && (
        <div className="sticky bottom-4">
          <div className="card p-4 flex items-center justify-between bg-amber-50 border-amber-200 shadow-lg">
            <span className="font-heading font-semibold text-amber-800">{changedCount} products ke rates change hue</span>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save All Changes'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
