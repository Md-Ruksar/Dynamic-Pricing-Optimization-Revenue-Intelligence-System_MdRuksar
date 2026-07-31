import { useState, useEffect, useCallback } from 'react';
import { pricingAPI, productsAPI, aiAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  DollarSign, Search, Clock, TrendingUp, TrendingDown, ArrowRight,
  Minus, Loader2, X, RefreshCw, AlertCircle, Package, BrainCircuit,
  CheckCircle2, XCircle, Sparkles, ChevronDown,
} from 'lucide-react';

export default function Pricing() {
  const { user } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
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
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProduct, setAiProduct] = useState(null);
  const [approveConfirm, setApproveConfirm] = useState(null);
  const [applying, setApplying] = useState(false);

  const isAdminOrPricing = user?.role === 'admin' || user?.role === 'pricing_manager';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      const res = await productsAPI.list(params);
      setProducts(res.data.items);
    } catch (err) {
      toast.error('Failed to load products', err.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  const fetchRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const res = await pricingAPI.listRecommendations({ limit: 20 });
      setRecommendations(res.data);
    } catch { /* non-critical */ } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timer);
  }, [search, fetchProducts]);

  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setNewPrice(product.current_price.toString());
    setReason('');
    setError('');
    setModalOpen(true);
  };

  const viewHistory = async (product) => {
    setSelectedProduct(product);
    setHistoryLoading(true);
    try {
      const res = await pricingAPI.getHistory(product.id, { limit: 20 });
      setPriceHistory(res.data);
    } catch (err) {
      toast.error('Failed to load history', err.response?.data?.detail);
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
    try {
      const res = await pricingAPI.updatePrice(selectedProduct.id, { new_price: price, reason: reason || null });
      toast.success('Price updated', res.data.message);
      fetchProducts();
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const runAiAnalysis = async (product) => {
    setAiProduct(product);
    setAiAnalysis(null);
    setAiLoading(true);
    try {
      const res = await aiAPI.optimize(product.id);
      setAiAnalysis(res.data);
    } catch (err) {
      toast.error('AI analysis failed', err.response?.data?.detail);
      setAiAnalysis(null);
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiRecommendation = async () => {
    if (!aiProduct) return;
    setApplying(true);
    try {
      const res = await aiAPI.saveRecommendation(aiProduct.id);
      toast.success('Recommendation saved', res.data.message);
      fetchRecommendations();
      setAiAnalysis((prev) => ({ ...prev, saved: true }));
    } catch (err) {
      toast.error('Could not save recommendation', err.response?.data?.detail);
    } finally {
      setApplying(false);
    }
  };

  const handleApproveRecommendation = async () => {
    if (!approveConfirm) return;
    setApplying(true);
    try {
      const res = await pricingAPI.approveRecommendation(approveConfirm.id);
      toast.success('Recommendation applied', res.data.message);
      fetchRecommendations();
      fetchProducts();
    } catch (err) {
      toast.error('Failed to apply', err.response?.data?.detail);
    } finally {
      setApplying(false);
      setApproveConfirm(null);
    }
  };

  const handleRejectRecommendation = async (id) => {
    try {
      const res = await pricingAPI.rejectRecommendation(id);
      toast.info('Recommendation rejected', res.data.message);
      fetchRecommendations();
    } catch (err) {
      toast.error('Failed to reject', err.response?.data?.detail);
    }
  };

  const getPriceChange = (product) => {
    if (!product?.base_price) return { icon: Minus, text: 'No base price', color: 'text-surface-400' };
    const change = ((product.current_price - product.base_price) / product.base_price) * 100;
    if (change > 5) return { icon: TrendingUp, text: `+${change.toFixed(1)}% vs base`, color: 'text-red-500' };
    if (change < -5) return { icon: TrendingDown, text: `${change.toFixed(1)}% vs base`, color: 'text-emerald-500' };
    return { icon: Minus, text: `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs base`, color: 'text-surface-400' };
  };

  const statusBadge = (status) => {
    const map = {
      pending: 'badge-warning',
      applied: 'badge-success',
      rejected: 'badge-danger',
    };
    return `badge ${map[status] || 'badge-neutral'}`;
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Pricing Management</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Manual pricing, AI recommendations, and change tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecommendations} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${recLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AI Recommendations Panel */}
      <div className="card overflow-hidden border-l-4 border-l-primary-500">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <BrainCircuit className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">AI Price Recommendations</h3>
              <p className="text-xs text-surface-500">Approve or reject suggestions from trained pricing models</p>
            </div>
          </div>
          {recLoading && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
        </div>
        <div className="card-body">
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-sm text-surface-500 dark:text-surface-400">No recommendations yet</p>
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                Use the AI analysis button on any product to generate recommendations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 6).map((rec) => {
                const diff = rec.recommended_price - rec.current_price;
                const diffPct = rec.current_price ? (diff / rec.current_price) * 100 : 0;
                return (
                  <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{rec.product_name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                        <span className="text-surface-500">${rec.current_price.toFixed(2)}</span>
                        <ArrowRight className="w-3 h-3 text-surface-400" />
                        <span className="font-semibold text-primary-600 dark:text-primary-400">${rec.recommended_price.toFixed(2)}</span>
                        <span className={diff > 0 ? 'text-red-500' : 'text-emerald-500'}>
                          ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                        </span>
                        <span className="badge-info">Confidence {rec.confidence_score?.toFixed(0)}%</span>
                        <span className={statusBadge(rec.status)}>{rec.status}</span>
                      </div>
                    </div>
                    {rec.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setApproveConfirm(rec)}
                          className="btn-success btn-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleRejectRecommendation(rec.id)} className="btn-ghost btn-sm text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">Product</th>
                <th className="table-header">Base Price</th>
                <th className="table-header">Current Price</th>
                <th className="table-header">Change</th>
                <th className="table-header">Margin</th>
                <th className="table-header">Stock</th>
                <th className="table-header">Revenue</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Package className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-sm text-surface-500 dark:text-surface-400">No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const change = getPriceChange(product);
                  const ChangeIcon = change.icon;
                  const margin = product.cost_price
                    ? ((product.current_price - product.cost_price) / product.current_price * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={product.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-medium text-surface-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-surface-400">{product.sku}</p>
                      </td>
                      <td className="table-cell font-mono">${product.base_price?.toFixed(2)}</td>
                      <td className="table-cell font-mono font-semibold text-surface-900 dark:text-white">${product.current_price?.toFixed(2)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <ChangeIcon className={`w-4 h-4 ${change.color}`} />
                          <span className={`text-xs font-medium ${change.color}`}>{change.text}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        {margin !== null ? (
                          <span className={`badge ${parseFloat(margin) >= 40 ? 'badge-success' : parseFloat(margin) >= 20 ? 'badge-warning' : 'badge-danger'}`}>
                            {margin}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${product.stock_quantity > 10 ? 'badge-success' : product.stock_quantity > 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {product.stock_quantity || 0}
                        </span>
                      </td>
                      <td className="table-cell font-mono text-xs">${(product.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdminOrPricing && (
                            <>
                              <button
                                onClick={() => runAiAnalysis(product)}
                                className="btn-ghost btn-sm p-1.5 text-primary-600 dark:text-primary-400"
                                title="AI price analysis"
                              >
                                <BrainCircuit className="w-4 h-4" />
                              </button>
                              <button onClick={() => openPriceModal(product)} className="btn-primary btn-sm">
                                <DollarSign className="w-4 h-4" />
                                Update
                              </button>
                            </>
                          )}
                          <button onClick={() => viewHistory(product)} className="btn-ghost btn-sm p-1.5" title="View price history">
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {aiProduct && (
        <div className="modal-overlay" onClick={() => { setAiProduct(null); setAiAnalysis(null); }}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary-500" />
                AI Price Analysis
              </h2>
              <button onClick={() => { setAiProduct(null); setAiAnalysis(null); }} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">{aiProduct.name}</p>
                  <p className="text-xs text-surface-500">SKU: {aiProduct.sku}</p>
                </div>
                <span className={`badge ${aiProduct.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{aiProduct.status}</span>
              </div>

              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-3" />
                  <p className="text-sm text-surface-500">Training models and analyzing price elasticity...</p>
                </div>
              ) : aiAnalysis ? (
                <>
                  {aiAnalysis.insufficient_data ? (
                    <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Insufficient Data</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{aiAnalysis.recommendation}</p>
                        <p className="text-xs text-amber-500 mt-2">Upload a pricing dataset or add more products to enable AI price prediction.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Price comparison */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 text-center">
                          <p className="text-xs text-surface-500 mb-1">Current Price</p>
                          <p className="text-xl font-bold font-mono text-surface-900 dark:text-white">${aiAnalysis.current_price?.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-center">
                          <p className="text-xs text-primary-600 dark:text-primary-400 mb-1 flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3" /> Suggested Price
                          </p>
                          <p className="text-xl font-bold font-mono text-primary-700 dark:text-primary-300">${aiAnalysis.suggested_price?.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 text-center">
                          <p className="text-xs text-surface-500 mb-1">Expected Impact</p>
                          <p className={`text-xl font-bold font-mono ${aiAnalysis.expected_revenue_change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {aiAnalysis.expected_revenue_change >= 0 ? '+' : ''}{aiAnalysis.expected_revenue_change?.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Confidence + model */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700">
                        <div className="flex-1 mr-6">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-surface-500">Confidence Score</span>
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{aiAnalysis.confidence_score?.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                            <div className="bg-primary-500 h-2 rounded-full transition-all duration-700" style={{ width: `${aiAnalysis.confidence_score || 0}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-surface-500">Best Model</p>
                          <p className="text-sm font-semibold text-surface-900 dark:text-white">{aiAnalysis.best_model}</p>
                        </div>
                      </div>

                      {/* Factors */}
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white mb-2">Key Factors</p>
                        <div className="space-y-2">
                          {aiAnalysis.factors?.map((factor, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/40 text-sm text-surface-600 dark:text-surface-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              {factor}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendation text */}
                      <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                        <p className="text-sm text-primary-700 dark:text-primary-300 leading-relaxed">{aiAnalysis.recommendation}</p>
                      </div>

                      {/* Actions */}
                      {!aiAnalysis.saved && (
                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button onClick={() => { setAiProduct(null); setAiAnalysis(null); }} className="btn-secondary">Close</button>
                          <button onClick={saveAiRecommendation} disabled={applying} className="btn-primary">
                            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Send for Approval
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-sm text-surface-500">
                  {aiAnalysis === null && !aiLoading ? 'Click a product to run AI analysis' : 'No analysis available'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      {selectedProduct && priceHistory.length > 0 && !modalOpen && !aiProduct && (
        <div className="modal-overlay" onClick={() => { setPriceHistory([]); setSelectedProduct(null); }}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Price Timeline: {selectedProduct.name}
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
                <div className="relative pl-6 border-l-2 border-surface-200 dark:border-surface-700 space-y-5">
                  {priceHistory.map((entry, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white dark:border-surface-800"></div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-500 line-through">${entry.old_price?.toFixed(2)}</span>
                          <ArrowRight className="w-4 h-4 text-surface-400" />
                          <span className="text-sm font-semibold text-surface-900 dark:text-white">${entry.new_price?.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-surface-500">{entry.change_reason || 'Price update'}</p>
                          <p className="text-xs text-surface-400">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve confirm */}
      <ConfirmDialog
        open={approveConfirm !== null}
        title="Approve AI recommendation?"
        message={approveConfirm
          ? `Apply the price change for "${approveConfirm.product_name}" from $${approveConfirm.current_price?.toFixed(2)} to $${approveConfirm.recommended_price?.toFixed(2)}?`
          : ''}
        confirmLabel="Apply Price"
        danger={false}
        loading={applying}
        onConfirm={handleApproveRecommendation}
        onCancel={() => setApproveConfirm(null)}
      />
    </div>
  );
}
