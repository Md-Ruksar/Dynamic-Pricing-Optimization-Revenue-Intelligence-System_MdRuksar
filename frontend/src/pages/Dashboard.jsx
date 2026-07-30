import { useState, useEffect } from 'react';
import { dashboardAPI, activityAPI, productsAPI } from '../api/client';
import {
  Package, TrendingUp, FolderOpen, DollarSign, Database,
  Activity, ArrowRight, RefreshCw, Loader2, AlertCircle,
  PackageCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, activityRes] = await Promise.all([
        dashboardAPI.getDashboard(),
        activityAPI.getLogs({ limit: 5 }).catch(() => ({ data: [] })),
      ]);
      setData(dashRes.data);
      setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    {
      label: 'Total Products',
      value: data?.total_products ?? 0,
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      desc: 'Products in catalog',
    },
    {
      label: 'Active Products',
      value: data?.active_products ?? 0,
      icon: PackageCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      desc: 'Currently active',
    },
    {
      label: 'Categories',
      value: data?.total_categories ?? 0,
      icon: FolderOpen,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      desc: 'Product categories',
    },
    {
      label: 'Avg. Price',
      value: data?.average_price ? `$${data.average_price.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      desc: 'Average product price',
    },
  ];

  if (loading) {
    return (
      <div className="page-transition">
        <div className="mb-8">
          <div className="skeleton h-8 w-64 mb-2"></div>
          <div className="skeleton h-5 w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-4 w-24 mb-3"></div>
              <div className="skeleton h-8 w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dashboard</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Welcome back, {user?.full_name || user?.username || 'User'}
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary btn-sm" title="Refresh data">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="stat-label">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-description">{stat.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Dataset Status</h3>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${data?.total_products > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <Database className={`w-5 h-5 ${data?.total_products > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">Retail Pricing Data</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {data?.product_count > 0 ? `${data.product_count} products loaded` : 'No dataset loaded'}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (data?.product_count || 0) / 10)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Recent Activity</h3>
            <Activity className="w-4 h-4 text-surface-400" />
          </div>
          <div className="card-body">
            {activity.length === 0 ? (
              <div className="empty-state py-8">
                <Activity className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-sm text-surface-500 dark:text-surface-400">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((log, i) => (
                  <div key={log.id || i} className="flex items-start gap-3 pb-3 border-b border-surface-100 dark:border-surface-700 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-sm text-surface-700 dark:text-surface-300">{log.action}</p>
                      <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                        {log.details || `${log.resource_type || 'System'} #${log.resource_id || ''}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/products" className="flex items-center justify-between p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Manage Products</span>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link to="/pricing" className="flex items-center justify-between p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Update Pricing</span>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link to="/datasets" className="flex items-center justify-between p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Load Datasets</span>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link to="/users" className="flex items-center justify-between p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Manage Users</span>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
