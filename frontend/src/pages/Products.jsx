import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI, categoryAPI } from '../utils/api';
import { formatCurrency, formatNumber, getStatusColor } from '../utils/format';
import { SearchInput, Pagination, EmptyState, Modal, PageLoader, BarcodeScanner, Searchable } from '../components/common';
import ProductBulkUpload from '../components/products/ProductBulkUpload';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCube,
  HiOutlineFilter, HiOutlineExclamationCircle, HiOutlineEye,
  HiOutlineCamera, HiOutlineUpload, HiOutlinePlusCircle,
} from 'react-icons/hi';

export default function Products() {
  const { can } = useAuth();
  const canAdd = can('products', 'add');
  const canEdit = can('products', 'edit');
  const canDelete = can('products', 'delete');
  // Stock-in piggybacks on inventory edit perms — same gate as the Adjust modal
  // on the Inventory page. Falls back to product-edit if inventory perm isn't set.
  const canStockIn = can('inventory', 'edit') || canEdit;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  // Seed category filter from `?category=ID` so links from the Categories page
  // arrive pre-filtered. URL is the source of truth on first mount only.
  const [searchParams] = useSearchParams();
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  // Quick Stock-In — opens a small modal from the row's + icon. Captures qty,
  // batch number, expiry, and unit cost so the batch trail is auditable later.
  const [stockInProduct, setStockInProduct] = useState(null);
  const [stockInForm, setStockInForm] = useState({
    quantity: 1, batchNumber: '', expiryDate: '', unitCostAtReceipt: '', notes: '',
  });
  const [stockInSaving, setStockInSaving] = useState(false);

  const emptyForm = {
    productName: '', sku: '', barcode: '', category: '', description: '',
    costPrice: '', salePrice: '', wholesalePrice: '', minimumPrice: '',
    tax: 17, discount: 0, currentStock: 0, lowStockThreshold: 5,
    reorderLevel: 10, unit: 'piece', isStockTracked: true, isFeatured: false,
    brand: '', expiryDate: '', batchNumber: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, search, filterCategory, filterStatus]);

  const fetchProducts = async () => {
    try {
      const params = { page, limit: 15, search, category: filterCategory, status: filterStatus };
      const res = await productAPI.getAll(params);
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      setCategories(res.data.data);
    } catch (err) {}
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value }));
  };

  const openCreate = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      productName: product.productName, sku: product.sku, barcode: product.barcode || '',
      category: product.category?._id || '', description: product.description || '',
      costPrice: product.costPrice, salePrice: product.salePrice,
      wholesalePrice: product.wholesalePrice || '', minimumPrice: product.minimumPrice || '',
      tax: product.tax || 0, discount: product.discount || 0,
      currentStock: product.currentStock, lowStockThreshold: product.lowStockThreshold,
      reorderLevel: product.reorderLevel || 10, unit: product.unit,
      isStockTracked: product.isStockTracked, isFeatured: product.isFeatured || false,
      brand: product.brand || '', expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
      batchNumber: product.batchNumber || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, costPrice: Number(form.costPrice), salePrice: Number(form.salePrice) };
      if (data.wholesalePrice === '') delete data.wholesalePrice;
      if (data.minimumPrice === '') delete data.minimumPrice;
      if (!data.category) delete data.category;

      if (editProduct) {
        await productAPI.update(editProduct._id, data);
        toast.success('Product updated');
      } else {
        await productAPI.create(data);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const openStockIn = (product) => {
    setStockInProduct(product);
    setStockInForm({
      quantity: 1,
      batchNumber: '',
      expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
      unitCostAtReceipt: product.costPrice || '',
      notes: '',
    });
  };

  const handleStockIn = async (e) => {
    e.preventDefault();
    if (!stockInProduct) return;
    const qty = Number(stockInForm.quantity);
    if (!qty || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    setStockInSaving(true);
    try {
      const payload = {
        productId: stockInProduct._id,
        type: 'add',
        quantity: qty,
        reason: 'purchase',
        notes: stockInForm.notes,
        batchNumber: stockInForm.batchNumber || undefined,
        expiryDate: stockInForm.expiryDate || undefined,
      };
      const cost = Number(stockInForm.unitCostAtReceipt);
      if (Number.isFinite(cost) && cost > 0) payload.unitCostAtReceipt = cost;

      await productAPI.adjustStock(payload);
      toast.success(`+${qty} ${stockInProduct.unit || ''} added to ${stockInProduct.productName}`);
      setStockInProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setStockInSaving(false);
    }
  };

  const handleDelete = async (product) => {
    const result = await Swal.fire({
      title: 'Deactivate Product?',
      text: `"${product.productName}" will be deactivated.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Deactivate',
    });
    if (result.isConfirmed) {
      try {
        await productAPI.delete(product._id);
        toast.success('Product deactivated');
        fetchProducts();
      } catch (err) {
        toast.error('Failed to delete');
      }
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800">Products</h1>
          <p className="text-slate-500 text-sm">{pagination.total || 0} products in total</p>
        </div>
        {canAdd && (
          <div className="flex gap-2">
            <button onClick={() => setShowBulkUpload(true)} className="btn-secondary">
              <HiOutlineUpload className="w-5 h-5" /> Bulk Upload
            </button>
            <button onClick={openCreate} className="btn-primary">
              <HiOutlinePlus className="w-5 h-5" /> Add Product
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products..." className="flex-1" />
          <div className="w-full sm:w-56">
            <Searchable
              value={filterCategory}
              onChange={(v) => { setFilterCategory(v); setPage(1); }}
              options={categories.filter(c => c.isActive).map(c => ({ value: c._id, label: c.name }))}
              placeholder="All Categories"
            />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="input-field w-auto min-w-[120px]">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {products.length === 0 ? (
        <EmptyState icon={HiOutlineCube} title="No products found" message="Add your first product to get started" action={openCreate} actionLabel="Add Product" />
      ) : (
        <div className="table-container bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Sale Price</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Profit</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <HiOutlineCube className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{p.productName}</p>
                        {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                      </div>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-slate-600">{p.sku}</span></td>
                  <td><span className="text-sm text-slate-600">{p.category?.name || '-'}</span></td>
                  <td className="text-right font-mono text-sm">{formatCurrency(p.costPrice)}</td>
                  <td className="text-right font-mono text-sm font-medium">{formatCurrency(p.salePrice)}</td>
                  <td className="text-right">
                    <span className={`font-mono text-sm font-medium ${
                      p.currentStock <= 0 ? 'text-red-600' : p.currentStock <= p.lowStockThreshold ? 'text-amber-600' : 'text-slate-700'
                    }`}>
                      {p.currentStock}
                    </span>
                    {p.currentStock <= p.lowStockThreshold && p.currentStock > 0 && (
                      <HiOutlineExclamationCircle className="w-4 h-4 text-amber-500 inline ml-1" />
                    )}
                  </td>
                  <td className="text-right">
                    <span className={`font-mono text-sm font-medium ${p.profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(p.profitMargin)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {canStockIn && (
                        <button
                          onClick={() => openStockIn(p)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Add stock (batch + expiry)"
                        >
                          <HiOutlinePlusCircle className="w-5 h-5" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-500 transition-colors" title="Edit">
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors" title="Delete">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      )}
                      {!canEdit && !canDelete && !canStockIn && (
                        <span className="text-[10px] text-slate-300">View only</span>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Product' : 'New Product'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="input-label">Product Name *</label>
              <input name="productName" value={form.productName} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="input-label">SKU {editProduct ? '' : '(auto-generated if empty)'}</label>
              <input name="sku" value={form.sku} onChange={handleChange} className="input-field font-mono" placeholder="Auto-generated" />
            </div>
            <div>
              <label className="input-label">Barcode</label>
              <div className="relative">
                <input name="barcode" value={form.barcode} onChange={handleChange} className="input-field font-mono pr-11" placeholder="EAN-13 / UPC" />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                  title="Scan with camera"
                >
                  <HiOutlineCamera className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="input-label">Category</label>
              <Searchable
                value={form.category}
                onChange={(v) => setForm(f => ({ ...f, category: v }))}
                options={categories.filter(c => c.isActive).map(c => ({
                  value: c._id,
                  label: `${c.parentCategory ? '— ' : ''}${c.name}`,
                }))}
                placeholder="Select category"
              />
            </div>
            <div>
              <label className="input-label">Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} className="input-field" />
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="font-heading font-semibold text-slate-700 mb-3">Pricing</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">Cost Price *</label>
                <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} className="input-field font-mono" min="0" step="0.01" required />
              </div>
              <div>
                <label className="input-label">Sale Price *</label>
                <input type="number" name="salePrice" value={form.salePrice} onChange={handleChange} className="input-field font-mono" min="0" step="0.01" required />
              </div>
              <div>
                <label className="input-label">Wholesale Price</label>
                <input type="number" name="wholesalePrice" value={form.wholesalePrice} onChange={handleChange} className="input-field font-mono" min="0" step="0.01" />
              </div>
              <div>
                <label className="input-label">Minimum Price</label>
                <input type="number" name="minimumPrice" value={form.minimumPrice} onChange={handleChange} className="input-field font-mono" min="0" step="0.01" />
              </div>
              <div>
                <label className="input-label">Tax %</label>
                <input type="number" name="tax" value={form.tax} onChange={handleChange} className="input-field" min="0" max="100" />
              </div>
              <div>
                <label className="input-label">Discount %</label>
                <input type="number" name="discount" value={form.discount} onChange={handleChange} className="input-field" min="0" max="100" />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h4 className="font-heading font-semibold text-slate-700 mb-3">Inventory</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">Current Stock</label>
                <input type="number" name="currentStock" value={form.currentStock} onChange={handleChange} className="input-field font-mono" min="0" />
              </div>
              <div>
                <label className="input-label">Low Stock Alert</label>
                <input type="number" name="lowStockThreshold" value={form.lowStockThreshold} onChange={handleChange} className="input-field" min="0" />
              </div>
              <div>
                <label className="input-label">Reorder Level</label>
                <input type="number" name="reorderLevel" value={form.reorderLevel} onChange={handleChange} className="input-field" min="0" />
              </div>
              <div>
                <label className="input-label">Unit</label>
                <select name="unit" value={form.unit} onChange={handleChange} className="input-field">
                  {['piece', 'kg', 'gram', 'liter', 'ml', 'box', 'carton', 'dozen', 'meter', 'pair', 'pack', 'set'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isStockTracked" checked={form.isStockTracked} onChange={handleChange} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-slate-600">Track Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-slate-600">Featured (Quick Access)</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input-field" rows={2} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : editProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setForm(f => ({ ...f, barcode: code }));
          setShowScanner(false);
          toast.success(`Scanned: ${code}`);
        }}
      />

      <ProductBulkUpload
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => { setShowBulkUpload(false); fetchProducts(); }}
      />

      {/* Quick Stock-In — one-row "stock received" capture. Reason is hard-coded
          to `purchase` because that's what 99% of these will be; if a manager
          needs to log damage / correction etc. they use the Inventory page. */}
      <Modal
        isOpen={!!stockInProduct}
        onClose={() => setStockInProduct(null)}
        title={stockInProduct ? `Add Stock — ${stockInProduct.productName}` : ''}
        size="md"
      >
        {stockInProduct && (
          <form onSubmit={handleStockIn} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Current Stock</p>
                <p className="text-xl font-heading font-bold text-slate-800 dark:text-slate-100">
                  {formatNumber(stockInProduct.currentStock)} <span className="text-xs font-normal text-slate-500">{stockInProduct.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">After Adding</p>
                <p className="text-xl font-heading font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(stockInProduct.currentStock + Number(stockInForm.quantity || 0))} <span className="text-xs font-normal text-slate-500">{stockInProduct.unit}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm(f => ({ ...f, quantity: e.target.value }))}
                  className="input-field font-mono text-center text-lg"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="input-label">Unit Cost (this batch)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockInForm.unitCostAtReceipt}
                  onChange={(e) => setStockInForm(f => ({ ...f, unitCostAtReceipt: e.target.value }))}
                  className="input-field font-mono"
                  placeholder={`Current: ${stockInProduct.costPrice}`}
                />
                <p className="text-[10px] text-slate-400 mt-1">Updates product cost if different</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Batch Number</label>
                <input
                  type="text"
                  value={stockInForm.batchNumber}
                  onChange={(e) => setStockInForm(f => ({ ...f, batchNumber: e.target.value }))}
                  className="input-field font-mono"
                  placeholder="e.g. B-23145"
                />
              </div>
              <div>
                <label className="input-label">Expiry Date</label>
                <input
                  type="date"
                  value={stockInForm.expiryDate}
                  onChange={(e) => setStockInForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Notes</label>
              <textarea
                value={stockInForm.notes}
                onChange={(e) => setStockInForm(f => ({ ...f, notes: e.target.value }))}
                className="input-field"
                rows={2}
                placeholder="e.g. Supplier invoice #4521"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setStockInProduct(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={stockInSaving} className="btn-success">
                {stockInSaving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><HiOutlinePlusCircle className="w-5 h-5" /> Add Stock</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
