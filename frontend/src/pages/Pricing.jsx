import { useState, useEffect } from 'react';
import { pricingAPI, productsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign, Search, History, TrendingUp, TrendingDown, ArrowRight,
  Minus, Loader2, X, RefreshCw, AlertCircle, Clock, Package,
} from 'lucide-react';

export default function Pricing() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdminOrPricing = user?.role === 'admin' || user?.role === 'pricing_manager';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      const res = await productsAPI.list(params);
      setProducts(res.data.items);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setNewPrice(product.current_price.toString());
    setReason('');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const viewHistory = async (product) => {
    setSelectedProduct(product);
    setHistoryLoading(true);
    try {
      const res = await pricingAPI.getHistory(product.id, { limit: 20 });
      setPriceHistory(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid positive price');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await pricingAPI.updatePrice(selectedProduct.id, { new_price: price, reason: reason || null });
      setSuccess(res.data.message);
      fetchProducts();
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const getPriceChangeIcon = (product) => {
    if (!product?.base_price) return <Minus className="w-4 h-4 text-surface-400" />;
    const change = ((product.current_price - product.base_price) / product.base_price) * 100;
    if (change > 5) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (change < -5) return <TrendingDown className="w-4 h-4 text-emerald-500" />;
    return <Minus className="w-4 h-4 text-surface-400" />;
  };

  const getPriceChangeColor = (product) => {
    if (!product?.base_price) return 'text-surface-400';
    const change = ((product.current_price - product.base_price) / product.base_price) * 100;
    if (change > 5) return 'text-red-500';
    if (change < -5) return 'text-emerald-500';
    return 'text-surface-400';
  };

  const getPriceChangeText = (product) => {
    if (!product?.base_price) return 'No base price';
    const change = ((product.current_price - product.base_price) / product.base_price) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs base`;
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Pricing Management</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Manage product prices and track changes</p>
        </div>
        <button onClick={fetchProducts} className="btn-secondary btn-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">Product</th>
                <th className="table-header">Base Price</th>
                <th className="table-header">Current Price</th>
                <th className="table-header">Change</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Package className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-sm text-surface-500 dark:text-surface-400">No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-surface-400">{product.sku}</p>
                      </div>
                    </td>
                    <td className="table-cell font-mono">${product.base_price?.toFixed(2)}</td>
                    <td className="table-cell font-mono font-semibold text-surface-900 dark:text-white">${product.current_price?.toFixed(2)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        {getPriceChangeIcon(product)}
                        <span className={`text-xs font-medium ${getPriceChangeColor(product)}`}>
                          {getPriceChangeText(product)}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openPriceModal(product)} className="btn-primary btn-sm">
                          <DollarSign className="w-4 h-4" />
                          Update Price
                        </button>
                        <button onClick={() => viewHistory(product)} className="btn-ghost btn-sm p-1.5" title="View price history">
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Update Modal */}
      {modalOpen && selectedProduct && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Update Price</h2>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <p className="text-sm font-medium text-surface-900 dark:text-white">{selectedProduct.name}</p>
                <p className="text-xs text-surface-500">SKU: {selectedProduct.sku}</p>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="text-surface-500">Base: <span className="font-mono font-medium text-surface-700 dark:text-surface-300">${selectedProduct.base_price?.toFixed(2)}</span></span>
                  <span className="text-surface-500">Current: <span className="font-mono font-medium text-surface-900 dark:text-white">${selectedProduct.current_price?.toFixed(2)}</span></span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-600 dark:text-emerald-400">
                  {success}
                </div>
              )}

              <div>
                <label className="label">New Price ($)</label>
                <input type="number" step="0.01" min="0.01" className="input text-lg font-mono" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div>
                <label className="label">Reason (optional)</label>
                <input className="input" placeholder="e.g. Seasonal adjustment, competitor match" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleUpdatePrice} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Update Price
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {selectedProduct && priceHistory.length > 0 && !modalOpen && (
        <div className="modal-overlay" onClick={() => { setPriceHistory([]); setSelectedProduct(null); }}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Price History: {selectedProduct.name}
              </h2>
              <button onClick={() => { setPriceHistory([]); setSelectedProduct(null); }} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {priceHistory.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-500 line-through">${entry.old_price?.toFixed(2)}</span>
                          <ArrowRight className="w-4 h-4 text-surface-400" />
                          <span className="text-sm font-semibold text-surface-900 dark:text-white">${entry.new_price?.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-surface-500">{entry.change_reason || 'Price update'}</p>
                        <p className="text-xs text-surface-400">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


