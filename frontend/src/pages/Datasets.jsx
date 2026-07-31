import { useState, useEffect, useCallback } from 'react';
import { datasetsAPI, loadersAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Database, Upload, FileSpreadsheet, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Download, BarChart3, Table2, Import, X,
  Sparkles, FileDown, Boxes,
} from 'lucide-react';

export default function Datasets() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [selectedType, setSelectedType] = useState('custom');
  const [preview, setPreview] = useState(null); // { preview, column_names, pipeline_steps, stats }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importTarget, setImportTarget] = useState(null);
  const [importing, setImporting] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'pricing_manager';

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes, typesRes] = await Promise.all([
        datasetsAPI.getStats(),
        datasetsAPI.list(),
        datasetsAPI.getTypes(),
      ]);
      setStats(statsRes.data);
      setDatasets(listRes.data.datasets || []);
      setTypes(typesRes.data.types || []);
    } catch (err) {
      toast.error('Failed to load datasets', err.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingAction('upload');
    try {
      const res = await datasetsAPI.upload(file, selectedType);
      toast.success('Dataset processed', `${res.data.message} — ${res.data.rows} rows, health ${res.data.health_score}%`);
      setPreview(res.data);
      fetchStats();
    } catch (err) {
      toast.error('Processing failed', err.response?.data?.detail);
    } finally {
      setLoadingAction(null);
      e.target.value = '';
    }
  };

  const handleLegacyLoad = async (which) => {
    setLoadingAction(which);
    try {
      const fn = which === 'retail' ? loadersAPI.loadRetailPricing : loadersAPI.loadEcommerceSales;
      const res = await fn();
      toast.success('Dataset loaded', res.data.message);
      fetchStats();
    } catch (err) {
      toast.error('Load failed', err.response?.data?.detail);
    } finally {
      setLoadingAction(null);
    }
  };

  const showPreview = async (id) => {
    setPreviewLoading(true);
    try {
      const res = await datasetsAPI.preview(id);
      setPreview(res.data);
    } catch (err) {
      toast.error('Could not load preview', err.response?.data?.detail);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importTarget) return;
    setImporting(true);
    try {
      const res = await datasetsAPI.importDataset(importTarget);
      toast.success('Import complete', res.data.message);
      fetchStats();
    } catch (err) {
      toast.error('Import failed', err.response?.data?.detail);
    } finally {
      setImporting(false);
      setImportTarget(null);
    }
  };

  const healthColor = (score) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dataset Management</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Upload, validate, clean, and analyze pricing datasets — CSV and Excel supported
        </p>
      </div>

      {/* Upload Panel */}
      {canManage && (
        <div className="card overflow-hidden border-l-4 border-l-primary-500">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Process New Dataset</h3>
                <p className="text-xs text-surface-500">Validate → clean missing values → remove duplicates → compute statistics</p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-surface-300" />
          </div>
          <div className="card-body">
            <div className="flex flex-wrap items-center gap-4">
              <select
                className="input w-auto min-w-[220px]"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">Select dataset type...</option>
                {types.map((t) => (
                  <option key={t.type} value={t.type}>{t.name}</option>
                ))}
              </select>
              <label className="btn-primary cursor-pointer">
                {loadingAction === 'upload' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {loadingAction === 'upload' ? 'Processing...' : 'Upload CSV / Excel'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={loadingAction === 'upload'}
                />
              </label>
              {selectedType && (
                <p className="text-xs text-surface-400">
                  Expected columns: {types.find((t) => t.type === selectedType)?.expected_columns?.join(', ')}
                </p>
              )}
            </div>

            {/* Legacy quick loads */}
            <div className="mt-4 flex flex-wrap items-center gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
              <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">Quick load:</span>
              <button
                onClick={() => handleLegacyLoad('retail')}
                disabled={loadingAction !== null}
                className="btn-outline btn-sm"
              >
                {loadingAction === 'retail' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Retail Pricing CSV
              </button>
              <button
                onClick={() => handleLegacyLoad('ecommerce')}
                disabled={loadingAction !== null}
                className="btn-outline btn-sm"
              >
                {loadingAction === 'ecommerce' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                E-commerce Sales CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Products</span>
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <span className="stat-value">{stats?.total_products ?? 0}</span>
          <span className="stat-description">Products in database</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Categories</span>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <span className="stat-value">{stats?.total_categories ?? 0}</span>
          <span className="stat-description">Product categories</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Datasets Processed</span>
            <div className={`p-2 rounded-lg ${stats?.total_datasets > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {stats?.total_datasets > 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                : <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            </div>
          </div>
          <span className={`text-lg font-bold ${stats?.total_datasets > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {stats?.total_datasets ?? 0}
          </span>
          <span className="stat-description">{stats?.status || 'No dataset loaded'}</span>
        </div>
      </div>

      {/* Processed Datasets List */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Processed Datasets</h3>
          <button onClick={fetchStats} className="btn-ghost btn-sm p-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">Dataset</th>
                <th className="table-header">Type</th>
                <th className="table-header">Rows</th>
                <th className="table-header">Columns</th>
                <th className="table-header">Missing</th>
                <th className="table-header">Duplicates</th>
                <th className="table-header">Avg Price</th>
                <th className="table-header">Health</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <FileSpreadsheet className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-sm text-surface-500 dark:text-surface-400">No datasets processed yet</p>
                  </td>
                </tr>
              ) : (
                datasets.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell">
                      <p className="font-medium text-surface-900 dark:text-white">{d.name}</p>
                      <p className="text-xs text-surface-400">{d.file_name}</p>
                    </td>
                    <td className="table-cell">
                      <span className="badge-info">{d.dataset_type}</span>
                    </td>
                    <td className="table-cell font-mono text-sm">{d.rows}</td>
                    <td className="table-cell font-mono text-sm">{d.columns}</td>
                    <td className="table-cell">{d.missing_values}</td>
                    <td className="table-cell">{d.duplicate_count}</td>
                    <td className="table-cell font-mono text-sm">${d.avg_price?.toFixed(2)}</td>
                    <td className="table-cell">
                      <span className={`font-semibold ${healthColor(d.health_score)}`}>{d.health_score?.toFixed(0)}%</span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => showPreview(d.id)} className="btn-ghost btn-sm p-1.5" title="Preview">
                          <Table2 className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button onClick={() => setImportTarget(d.id)} className="btn-secondary btn-sm">
                            <Import className="w-4 h-4" />
                            Import
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{preview.name}</h2>
                <p className="text-xs text-surface-500">
                  {preview.rows} rows · {preview.column_names?.length} columns · Health {preview.stats?.health_score?.toFixed(0)}%
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {previewLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              )}

              {/* Pipeline steps */}
              {preview.pipeline_steps?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white mb-2">Processing Pipeline</p>
                  <div className="space-y-1.5">
                    {preview.pipeline_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Missing Values', value: preview.stats?.missing_values },
                  { label: 'Duplicates', value: preview.stats?.duplicate_count },
                  { label: 'Categories', value: preview.stats?.category_count },
                  { label: 'Avg Price', value: `$${preview.stats?.avg_price?.toFixed(2)}` },
                  { label: 'Total Revenue', value: `$${(preview.stats?.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-surface-50 dark:bg-surface-700/40 text-center">
                    <p className="text-base font-bold text-surface-900 dark:text-white">{s.value}</p>
                    <p className="text-xs text-surface-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {preview.preview?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white mb-2">Data Preview</p>
                  <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-50 dark:bg-surface-800/50">
                          {(preview.column_names || []).slice(0, 10).map((col) => (
                            <th key={col} className="table-header whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {preview.preview.slice(0, 8).map((row, i) => (
                          <tr key={i}>
                            {(preview.column_names || []).slice(0, 10).map((col) => (
                              <td key={col} className="table-cell whitespace-nowrap">{row[col] ?? '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setPreview(null)} className="btn-secondary">Close</button>
                {canManage && (
                  <button onClick={() => { setImportTarget(preview.id); setPreview(null); }} className="btn-primary">
                    <Import className="w-4 h-4" /> Import into Catalog
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import confirm */}
      <ConfirmDialog
        open={importTarget !== null}
        title="Import dataset into catalog?"
        message="This will add all products from this dataset to your product catalog. Products with duplicate SKUs will be skipped."
        confirmLabel="Import Products"
        danger={false}
        loading={importing}
        onConfirm={handleImport}
        onCancel={() => setImportTarget(null)}
      />

      {/* Import Logs */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Import Logs</h3>
        </div>
        <div className="card-body">
          {!stats?.import_logs || stats.import_logs.length === 0 ? (
            <div className="empty-state py-8">
              <RefreshCw className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
              <p className="text-sm text-surface-500 dark:text-surface-400">No import logs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.import_logs.slice(0, 15).map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-surface-600 dark:text-surface-300 truncate">{log.detail}</p>
                  </div>
                  <span className="text-xs text-surface-400 flex-shrink-0">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
