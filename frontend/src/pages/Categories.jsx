import { useState, useEffect } from 'react';
import { categoryAPI, productAPI } from '../utils/api';
import { Modal, EmptyState, PageLoader, Searchable } from '../components/common';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineTag,
  HiOutlineX, HiOutlineCube, HiOutlineExternalLink, HiOutlineChevronDown,
} from 'react-icons/hi';
import { Link } from 'react-router-dom';

// Pastel palette — cycled by index so every card stands out from its neighbours.
// Each entry pairs a soft background with a saturated accent for the icon /
// border. Dark-mode variants kept subtle so the page stays calm at night.
const PALETTE = [
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', icon: 'bg-emerald-500',  ring: 'ring-emerald-400' },
  { bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-700',     icon: 'bg-amber-500',    ring: 'ring-amber-400' },
  { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-700',       icon: 'bg-blue-500',     ring: 'ring-blue-400' },
  { bg: 'bg-purple-50 dark:bg-purple-900/20',   border: 'border-purple-200 dark:border-purple-700',   icon: 'bg-purple-500',   ring: 'ring-purple-400' },
  { bg: 'bg-pink-50 dark:bg-pink-900/20',       border: 'border-pink-200 dark:border-pink-700',       icon: 'bg-pink-500',     ring: 'ring-pink-400' },
  { bg: 'bg-rose-50 dark:bg-rose-900/20',       border: 'border-rose-200 dark:border-rose-700',       icon: 'bg-rose-500',     ring: 'ring-rose-400' },
  { bg: 'bg-teal-50 dark:bg-teal-900/20',       border: 'border-teal-200 dark:border-teal-700',       icon: 'bg-teal-500',     ring: 'ring-teal-400' },
  { bg: 'bg-orange-50 dark:bg-orange-900/20',   border: 'border-orange-200 dark:border-orange-700',   icon: 'bg-orange-500',   ring: 'ring-orange-400' },
];

// Stable color per category — hash the name so the same category always gets
// the same color even after re-fetch. Avoids the "everything turns blue when I
// reorder" problem index-based mapping has.
const colorFor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
};

export default function Categories() {
  const { can } = useAuth();
  const canAdd = can('categories', 'add');
  const canEdit = can('categories', 'edit');
  const canDelete = can('categories', 'delete');

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', parentCategory: '', description: '', sortOrder: 0 });

  // Selected category preview state — products are lazily fetched on click.
  const [selectedCat, setSelectedCat] = useState(null);
  const [previewProducts, setPreviewProducts] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMeta, setPreviewMeta] = useState({ total: 0 });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      setCategories(res.data.data);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'sortOrder' ? Number(value) : value }));
  };

  const openCreate = (parentId = '') => {
    setEditCat(null);
    setForm({ name: '', parentCategory: parentId, description: '', sortOrder: 0 });
    setShowModal(true);
  };

  const openEdit = (cat, e) => {
    if (e) e.stopPropagation();
    setEditCat(cat);
    setForm({ name: cat.name, parentCategory: cat.parentCategory?._id || '', description: cat.description || '', sortOrder: cat.sortOrder || 0 });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.parentCategory) data.parentCategory = null;
      if (editCat) {
        await categoryAPI.update(editCat._id, data);
        toast.success('Category updated');
      } else {
        await categoryAPI.create(data);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (cat, e) => {
    if (e) e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Category?', text: `"${cat.name}" will be deactivated.`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626', confirmButtonText: 'Delete',
    });
    if (result.isConfirmed) {
      try {
        await categoryAPI.delete(cat._id);
        toast.success('Category deleted');
        if (selectedCat?._id === cat._id) closePreview();
        fetchCategories();
      } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
    }
  };

  // ─── Preview panel ──────────────────────────────────────────────────────────
  const openPreview = async (cat) => {
    // Toggle off when the user clicks the same card twice.
    if (selectedCat?._id === cat._id) return closePreview();
    setSelectedCat(cat);
    setPreviewLoading(true);
    setPreviewProducts([]);
    try {
      const res = await productAPI.getAll({ category: cat._id, limit: 50, status: 'active' });
      setPreviewProducts(res.data.data || []);
      setPreviewMeta({ total: res.data.pagination?.total || 0 });
    } catch {
      toast.error('Failed to load products');
    } finally {
      setPreviewLoading(false);
    }
  };
  const closePreview = () => {
    setSelectedCat(null);
    setPreviewProducts([]);
    setPreviewMeta({ total: 0 });
  };

  if (loading) return <PageLoader />;

  // Show all active categories as flat tiles. Subcategories are shown with a
  // tiny "↳ Parent" hint under the name so the hierarchy is preserved.
  const visibleCats = categories.filter(c => c.isActive);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-slate-100">Categories</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {visibleCats.length} categories — click to view products
          </p>
        </div>
        {canAdd && (
          <button onClick={() => openCreate()} className="btn-primary">
            <HiOutlinePlus className="w-5 h-5" /> Add Category
          </button>
        )}
      </div>

      {visibleCats.length === 0 ? (
        <EmptyState
          icon={HiOutlineTag}
          title="No categories yet"
          message={canAdd ? 'Create categories to organize your products' : 'Ask an admin to create categories.'}
          action={canAdd ? () => openCreate() : undefined}
          actionLabel={canAdd ? 'Add Category' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleCats.map(cat => {
            const c = colorFor(cat.name);
            const isSelected = selectedCat?._id === cat._id;
            const productCount = cat.productCount || 0;

            return (
              <button
                key={cat._id}
                type="button"
                onClick={() => openPreview(cat)}
                className={`group relative text-left p-3 rounded-xl border-2 transition-all ${c.bg} ${
                  isSelected ? `${c.ring} ring-2 border-transparent shadow-md` : `${c.border} hover:shadow-sm`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <HiOutlineTag className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{cat.name}</p>
                    {cat.parentCategory?.name && (
                      <p className="text-[10px] text-slate-400 truncate">↳ {cat.parentCategory.name}</p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {productCount} {productCount === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                  <HiOutlineChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Hover-only edit/delete — kept out of the way until needed */}
                {(canEdit || canDelete) && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => openEdit(cat, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openEdit(cat, e); }}
                        className="p-1 rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-brand-500 cursor-pointer"
                        title="Edit"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {canDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(cat, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(cat, e); }}
                        className="p-1 rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-red-500 cursor-pointer"
                        title="Delete"
                      >
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Product preview panel — slides in below the grid when a card is clicked */}
      {selectedCat && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg ${colorFor(selectedCat.name).icon} flex items-center justify-center flex-shrink-0`}>
                <HiOutlineTag className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 truncate">{selectedCat.name}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {previewMeta.total} products in this category
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/products?category=${selectedCat._id}`}
                className="hidden sm:inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                <HiOutlineExternalLink className="w-3.5 h-3.5" /> View all
              </Link>
              <button
                onClick={closePreview}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
                aria-label="Close preview"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {previewLoading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading products…</div>
          ) : previewProducts.length === 0 ? (
            <div className="p-10 text-center">
              <HiOutlineCube className="w-10 h-10 mx-auto text-slate-200 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No products in this category yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/40">
                  <tr className="text-[11px] text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Product</th>
                    <th className="text-left px-4 py-2.5">SKU</th>
                    <th className="text-left px-4 py-2.5">Brand</th>
                    <th className="text-right px-4 py-2.5">Stock</th>
                    <th className="text-right px-4 py-2.5">Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800/50">
                  {previewProducts.map(p => (
                    <tr key={p._id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-2 dark:text-slate-100">
                        <p className="font-medium">{p.productName}</p>
                        {p.description && <p className="text-[10px] text-slate-400 truncate max-w-xs">{p.description}</p>}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{p.sku}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{p.brand || '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-mono font-semibold ${p.currentStock <= 0 ? 'text-red-600' : p.currentStock <= p.lowStockThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {p.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(p.salePrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewMeta.total > previewProducts.length && (
                <div className="p-3 text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-700">
                  Showing first {previewProducts.length} of {previewMeta.total} —{' '}
                  <Link to={`/products?category=${selectedCat._id}`} className="text-brand-600 dark:text-brand-400 hover:underline">
                    open Products page
                  </Link>{' '}
                  to see all and edit
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editCat ? 'Edit Category' : 'New Category'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Category Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="input-label">Parent Category</label>
            <Searchable
              value={form.parentCategory}
              onChange={(v) => setForm(f => ({ ...f, parentCategory: v }))}
              options={categories
                .filter(c => !c.parentCategory && c.isActive && c._id !== editCat?._id)
                .map(c => ({ value: c._id, label: c.name }))}
              placeholder="None (Top Level)"
            />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input-field" rows={2} />
          </div>
          <div>
            <label className="input-label">Sort Order</label>
            <input type="number" name="sortOrder" value={form.sortOrder} onChange={handleChange} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : editCat ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
