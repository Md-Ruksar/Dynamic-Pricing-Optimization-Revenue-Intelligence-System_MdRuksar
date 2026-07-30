import { useState, useEffect } from 'react';
import { productsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Package, Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight,
  Loader2, X, AlertCircle, Filter, RefreshCw, Grid3X3, List,
  ImageOff, ShoppingBag, Tag, Layers, TrendingUp,
} from 'lucide-react';

const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect fill="#f1f5f9" width="400" height="400"/>
    <text x="200" y="200" text-anchor="middle" dominant-baseline="central" fill="#94a3b8" font-family="system-ui" font-size="16">No Image</text>
  </svg>`
);

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(12);
  const [viewMode, setViewMode] = useState('grid');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', base_price: 0, current_price: 0,
    cost_price: 0, stock_quantity: 0, image_url: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdminOrPricing = user?.role === 'admin' || user?.role === 'pricing_manager';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await productsAPI.list(params);
      setProducts(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await productsAPI.getCategories();
      setCategories(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, category, limit]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchProducts();
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '', sku: '', category: '', base_price: 0, current_price: 0,
      cost_price: 0, stock_quantity: 0, image_url: '', description: '',
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      base_price: product.base_price,
      current_price: product.current_price,
      cost_price: product.cost_price || 0,
      stock_quantity: product.stock_quantity || 0,
      image_url: product.image_url || '',
      description: product.description || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
      } else {
        await productsAPI.create(formData);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleImageError = (e) => {
    e.target.src = PLACEHOLDER_IMG;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Product Management</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            <span className="font-medium text-surface-700 dark:text-surface-300">{total}</span> products in your catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              }`}
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => { setPage(0); fetchProducts(); }} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdminOrPricing && (
            <button onClick={openCreate} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-auto min-w-[160px]"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              className="input w-auto min-w-[120px]"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
            </select>
            <button type="submit" className="btn-primary">Search</button>
            {(search || category) && (
              <button type="button" onClick={() => { setSearch(''); setCategory(''); setPage(0); }} className="btn-ghost">
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-square bg-surface-200 dark:bg-surface-700" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-3/4" />
                <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
                <div className="h-5 bg-surface-200 dark:bg-surface-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="card">
          <div className="card-body text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <Package className="w-10 h-10 text-surface-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">No products found</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
              {search || category
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first product to the catalog.'}
            </p>
            {isAdminOrPricing && !search && !category && (
              <button onClick={openCreate} className="btn-primary btn-sm mt-6">
                <Plus className="w-4 h-4" /> Add your first product
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <div
                key={product.id}
                className="card overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-surface-100 dark:bg-surface-800 overflow-hidden">
                  <img
                    src={product.image_url || PLACEHOLDER_IMG}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={handleImageError}
                    loading="lazy"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      product.status === 'active'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-surface-500/90 text-white'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      product.stock_quantity > 10
                        ? 'bg-blue-500/90 text-white'
                        : product.stock_quantity > 0
                        ? 'bg-amber-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                    }`}>
                      {product.stock_quantity} in stock
                    </span>
                  </div>
                  {/* Action buttons on hover */}
                  {isAdminOrPricing && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full text-surface-700 hover:bg-white transition-colors shadow-lg"
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-colors shadow-lg"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-surface-900 dark:text-white truncate" title={product.name}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                        {product.sku}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-surface-400" />
                    <span className="text-xs text-surface-500 dark:text-surface-400">
                      {product.category || 'Uncategorized'}
                    </span>
                  </div>

                  {/* Price & Margin Row */}
                  <div className="flex items-end justify-between pt-1">
                    <div>
                      <p className="text-lg font-bold text-surface-900 dark:text-white font-mono">
                        ${product.current_price?.toFixed(2)}
                      </p>
                      {product.base_price !== product.current_price && (
                        <p className="text-xs text-surface-400 line-through font-mono">
                          ${product.base_price?.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {product.cost_price && (
                      <div className="text-right">
                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          +{((product.current_price - product.cost_price) / product.cost_price * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-surface-400">margin</div>
                      </div>
                    )}
                  </div>

                  {/* Revenue bar */}
                  {product.revenue > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] text-surface-400 mb-1">
                        <span>Revenue</span>
                        <span>${product.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1">
                        <div
                          className="bg-primary-500 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (product.revenue / 30000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50">
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Stock</th>
                  <th className="table-header">Status</th>
                  {isAdminOrPricing && <th className="table-header text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {products.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 overflow-hidden flex-shrink-0">
                          <img
                            src={product.image_url || PLACEHOLDER_IMG}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                            loading="lazy"
                          />
                        </div>
                        <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-surface-500 font-mono text-xs">{product.sku}</td>
                    <td className="table-cell">
                      <span className="badge-neutral">{product.category || 'Uncategorized'}</span>
                    </td>
                    <td className="table-cell font-mono font-medium">${product.current_price?.toFixed(2)}</td>
                    <td className="table-cell">
                      <span className={`badge ${
                        product.stock_quantity > 10 ? 'badge-success'
                        : product.stock_quantity > 0 ? 'badge-warning'
                        : 'badge-danger'
                      }`}>
                        {product.stock_quantity || 0}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                        {product.status}
                      </span>
                    </td>
                    {isAdminOrPricing && (
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(product)} className="btn-ghost btn-sm p-1.5">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-surface-500">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pageNum = start + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`btn-sm min-w-[36px] ${
                      pageNum === page ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {formData.image_url && (
                <div className="flex justify-center">
                  <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-surface-200 dark:border-surface-600">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Product Name</label>
                  <input
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Wireless Bluetooth Headphones"
                  />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input
                    className="input"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    placeholder="e.g. ELEC-001"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Electronics"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                    <option value="Electronics" />
                    <option value="Clothing" />
                    <option value="Home & Kitchen" />
                    <option value="Sports & Outdoors" />
                    <option value="Accessories" />
                    <option value="Furniture" />
                  </datalist>
                </div>
                <div>
                  <label className="label">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Current Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.current_price}
                    onChange={(e) => setFormData({ ...formData, current_price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Image URL</label>
                  <input
                    className="input"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://picsum.photos/seed/myproduct/400/400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.sku}
                  className="btn-primary"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
