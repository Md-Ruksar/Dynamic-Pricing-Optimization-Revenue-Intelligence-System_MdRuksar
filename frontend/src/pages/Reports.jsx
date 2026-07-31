import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, downloadBlob } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  FileText, FileSpreadsheet, FileDown, Loader2, TrendingUp, DollarSign,
  Package, Users, Database, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';

const REPORT_TYPES = [
  { key: 'revenue', label: 'Revenue Analysis', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { key: 'pricing', label: 'Pricing Performance', icon: TrendingUp, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-primary-900/30' },
  { key: 'products', label: 'Product Performance', icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { key: 'users', label: 'Users Summary', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { key: 'datasets', label: 'Dataset Summary', icon: Database, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
];

const FORMATS = [
  { key: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { key: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', icon: FileDown },
];

export default function Reports() {
  const toast = useToast();
  const [activeType, setActiveType] = useState('revenue');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = {
        revenue: reportsAPI.revenue,
        pricing: reportsAPI.pricing,
        products: reportsAPI.products,
        users: reportsAPI.users,
        datasets: reportsAPI.datasets,
      };
      const res = await endpoints[activeType]();
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load report', err.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  }, [activeType, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await reportsAPI.export(activeType, format);
      downloadBlob(res, `${activeType}_report.${format}`);
      toast.success('Export complete', `Report downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed', err.response?.data?.detail || 'Could not generate file');
    } finally {
      setExporting(null);
    }
  };

  const activeMeta = REPORT_TYPES.find((r) => r.key === activeType);
  const ActiveIcon = activeMeta?.icon || FileText;

  const renderMetrics = () => {
    if (!data) return null;
    if (activeType === 'revenue') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="stat-card">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">${data.total_revenue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span className="stat-description">Across all transactions</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{data.total_transactions ?? 0}</span>
            <span className="stat-description">Sales records</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg Transaction Value</span>
            <span className="stat-value">${data.average_transaction_value?.toFixed(2)}</span>
            <span className="stat-description">Revenue per transaction</span>
          </div>
        </div>
      );
    }
    if (activeType === 'pricing') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat-card"><span className="stat-label">Total Products</span><span className="stat-value">{data.total_products}</span><span className="stat-description">In catalog</span></div>
          <div className="stat-card"><span className="stat-label">Overpriced</span><span className="stat-value text-red-500">{data.overpriced}</span><span className="stat-description">{'&gt;20% above base'}</span></div>
          <div className="stat-card"><span className="stat-label">Underpriced</span><span className="stat-value text-emerald-500">{data.underpriced}</span><span className="stat-description">{'&lt;20% below base'}</span></div>
          <div className="stat-card"><span className="stat-label">Avg Deviation</span><span className="stat-value">{data.avg_price_deviation}%</span><span className="stat-description">From base price</span></div>
        </div>
      );
    }
    if (activeType === 'users') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat-card"><span className="stat-label">Total Users</span><span className="stat-value">{data.total_users}</span><span className="stat-description">All accounts</span></div>
          <div className="stat-card"><span className="stat-label">Active</span><span className="stat-value text-emerald-500">{data.active_users}</span><span className="stat-description">Enabled accounts</span></div>
          <div className="stat-card"><span className="stat-label">Inactive</span><span className="stat-value text-red-500">{data.inactive_users}</span><span className="stat-description">Disabled accounts</span></div>
          <div className="stat-card">
            <span className="stat-label">Roles</span>
            <span className="text-base font-bold text-surface-900 dark:text-white">
              Admin {data.role_breakdown?.admin} · PM {data.role_breakdown?.pricing_manager} · BU {data.role_breakdown?.business_user}
            </span>
            <span className="stat-description">Admin / Pricing Manager / Business User</span>
          </div>
        </div>
      );
    }
    if (activeType === 'datasets') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="stat-card"><span className="stat-label">Total Datasets</span><span className="stat-value">{data.total_datasets}</span><span className="stat-description">Processed uploads</span></div>
          <div className="stat-card"><span className="stat-label">Total Rows</span><span className="stat-value">{data.datasets?.reduce((s, d) => s + (d.rows || 0), 0)}</span><span className="stat-description">Across datasets</span></div>
          <div className="stat-card"><span className="stat-label">Avg Health</span><span className="stat-value">{data.datasets?.length ? (data.datasets.reduce((s, d) => s + (d.health_score || 0), 0) / data.datasets.length).toFixed(0) : 0}%</span><span className="stat-description">Data quality score</span></div>
        </div>
      );
    }
    if (activeType === 'products') {
      const products = data.products || [];
      const totalRev = products.reduce((s, p) => s + (p.revenue || 0), 0);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="stat-card"><span className="stat-label">Top Products Shown</span><span className="stat-value">{products.length}</span><span className="stat-description">By revenue</span></div>
          <div className="stat-card"><span className="stat-label">Top 20 Revenue</span><span className="stat-value">${totalRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className="stat-description">Best performers</span></div>
          <div className="stat-card"><span className="stat-label">Avg Margin</span><span className="stat-value">{products.length ? (products.reduce((s, p) => s + (p.margin || 0), 0) / products.length).toFixed(1) : 0}%</span><span className="stat-description">Top products</span></div>
        </div>
      );
    }
    return null;
  };

  const renderTable = () => {
    if (!data) return null;
    if (activeType === 'revenue') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-surface-50 dark:bg-surface-800/50"><th className="table-header">Category</th><th className="table-header text-right">Revenue</th></tr></thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {(data.top_categories || []).map((c, i) => (
                <tr key={i} className="table-row"><td className="table-cell font-medium">{c.category}</td><td className="table-cell text-right font-mono">${c.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
              ))}
              {(!data.top_categories || data.top_categories.length === 0) && (
                <tr><td colSpan={2} className="table-cell text-center text-surface-400 py-8">No category data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeType === 'products') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">Product</th><th className="table-header">Category</th>
                <th className="table-header text-right">Price</th><th className="table-header text-right">Stock</th>
                <th className="table-header text-right">Revenue</th><th className="table-header text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {(data.products || []).map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell"><span className="badge-neutral">{p.category || '—'}</span></td>
                  <td className="table-cell text-right font-mono">${p.current_price?.toFixed(2)}</td>
                  <td className="table-cell text-right">{p.stock_quantity}</td>
                  <td className="table-cell text-right font-mono">${p.revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="table-cell text-right font-mono">{p.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeType === 'users') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">User</th><th className="table-header">Email</th>
                <th className="table-header">Role</th><th className="table-header">Status</th><th className="table-header">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {(data.users || []).map((u, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium">{u.full_name || u.username}</td>
                  <td className="table-cell text-surface-500">{u.email}</td>
                  <td className="table-cell"><span className="badge-info">{u.role.replace('_', ' ')}</span></td>
                  <td className="table-cell"><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="table-cell text-xs text-surface-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeType === 'datasets') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">Dataset</th><th className="table-header">Type</th>
                <th className="table-header text-right">Rows</th><th className="table-header text-right">Missing</th>
                <th className="table-header text-right">Health</th><th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {(data.datasets || []).map((d, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium">{d.name}</td>
                  <td className="table-cell"><span className="badge-info">{d.type}</span></td>
                  <td className="table-cell text-right font-mono">{d.rows}</td>
                  <td className="table-cell text-right">{d.missing_values}</td>
                  <td className="table-cell text-right font-mono">{d.health_score?.toFixed(0)}%</td>
                  <td className="table-cell"><span className="badge-success">{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeType === 'pricing') {
      return (
        <div className="p-6 flex items-center gap-3 rounded-xl bg-surface-50 dark:bg-surface-700/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <p className="text-sm text-surface-600 dark:text-surface-300">
            Pricing performance summary: {data.optimally_priced} products optimally priced out of {data.total_products} total.
            {data.avg_price_deviation > 0 && ` Average deviation from base price is ${data.avg_price_deviation}%.`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Reports</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Generate revenue, pricing, product, user, and dataset reports
          </p>
        </div>
        <button onClick={fetchReport} className="btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Report type tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {REPORT_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => setActiveType(type.key)}
              className={`p-4 rounded-xl border transition-all text-left ${
                activeType === type.key
                  ? 'bg-white dark:bg-surface-800 border-primary-500 shadow-md ring-2 ring-primary-500/20'
                  : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:shadow-sm'
              }`}
            >
              <div className={`p-2 rounded-lg w-fit ${type.bg}`}>
                <Icon className={`w-5 h-5 ${type.color}`} />
              </div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white mt-3">{type.label}</p>
            </button>
          );
        })}
      </div>

      {/* Export bar */}
      <div className="card">
        <div className="card-body flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${activeMeta?.bg}`}>
              <ActiveIcon className={`w-5 h-5 ${activeMeta?.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{activeMeta?.label} Report</h3>
              <p className="text-xs text-surface-500">Export as CSV, Excel, or PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              return (
                <button
                  key={fmt.key}
                  onClick={() => handleExport(fmt.key)}
                  disabled={exporting !== null || loading}
                  className="btn-outline btn-sm"
                >
                  {exporting === fmt.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  {exporting === fmt.key ? 'Exporting...' : `Export ${fmt.label}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-4 w-24 mb-3"></div>
              <div className="skeleton h-8 w-20"></div>
            </div>
          ))}
        </div>
      ) : (
        renderMetrics()
      )}

      {/* Detail table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Report Details</h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full"></div>)}
            </div>
          ) : data ? (
            renderTable()
          ) : (
            <div className="empty-state py-12">
              <AlertCircle className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
              <p className="text-sm text-surface-500 dark:text-surface-400">No report data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
