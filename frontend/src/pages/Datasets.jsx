import { useState, useEffect } from 'react';
import { datasetsAPI, loadersAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Database, Upload, FileSpreadsheet, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Download, BarChart3,
} from 'lucide-react';

export default function Datasets() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await datasetsAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dataset stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLoadRetail = async () => {
    setLoadingAction('retail');
    setMessage('');
    try {
      const res = await loadersAPI.loadRetailPricing();
      setMessage(res.data.message || 'Retail pricing dataset loaded successfully');
      setMessageType('success');
      fetchStats();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to load dataset');
      setMessageType('error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLoadEcommerce = async () => {
    setLoadingAction('ecommerce');
    setMessage('');
    try {
      const res = await loadersAPI.loadEcommerceSales();
      setMessage(res.data.message || 'E-commerce sales dataset loaded successfully');
      setMessageType('success');
      fetchStats();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to load dataset');
      setMessageType('error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingAction('upload');
    setMessage('');
    try {
      const res = await loadersAPI.uploadRetailPricing(file);
      setMessage(res.data.message || 'File uploaded and loaded successfully');
      setMessageType('success');
      fetchStats();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to upload file');
      setMessageType('error');
    } finally {
      setLoadingAction(null);
      e.target.value = '';
    }
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dataset Management</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Load and manage retail pricing and e-commerce sales datasets
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          messageType === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
        }`}>
          {messageType === 'success'
            ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          }
          <span className="text-sm">{message}</span>
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
            <span className="stat-label">Dataset Status</span>
            <div className={`p-2 rounded-lg ${stats?.total_products > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {stats?.total_products > 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                : <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              }
            </div>
          </div>
          <span className={`text-lg font-bold ${stats?.total_products > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {stats?.total_products > 0 ? 'Loaded' : 'No Data'}
          </span>
          <span className="stat-description">{stats?.status || 'No dataset loaded'}</span>
        </div>
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retail Pricing Dataset */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Retail Pricing Dataset</h3>
                  <p className="text-xs text-surface-500">Load retail pricing data from CSV</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleLoadRetail}
                disabled={loadingAction === 'retail'}
                className="btn-primary"
              >
                {loadingAction === 'retail' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Load from Server
              </button>
              <label className="btn-outline cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
              </label>
            </div>
            <p className="text-xs text-surface-400">
              Expected file: <code className="text-primary-500">retail_pricing.csv</code> or any CSV with
              product pricing data.
            </p>
          </div>
        </div>

        {/* E-commerce Sales Dataset */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">E-commerce Sales Dataset</h3>
                  <p className="text-xs text-surface-500">Load e-commerce sales transactions</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleLoadEcommerce}
                disabled={loadingAction === 'ecommerce'}
                className="btn-primary"
              >
                {loadingAction === 'ecommerce' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Load from Server
              </button>
              <label className="btn-outline cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
              </label>
            </div>
            <p className="text-xs text-surface-400">
              Expected file: <code className="text-primary-500">ecommerce_sales.csv</code> or any CSV with
              sales transaction data.
            </p>
          </div>
        </div>
      </div>

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
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                Import history will appear after loading datasets
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.import_logs.map((log, i) => (
                <div key={i} className="text-sm text-surface-600 dark:text-surface-300">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
