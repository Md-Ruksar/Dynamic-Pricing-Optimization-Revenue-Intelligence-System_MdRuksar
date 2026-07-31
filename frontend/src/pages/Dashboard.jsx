import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, activityAPI, aiAPI } from '../api/client';
import {
  Package, TrendingUp, FolderOpen, DollarSign, Database, Activity,
  ArrowRight, RefreshCw, Loader2, AlertCircle, PackageCheck, PackageX,
  BrainCircuit, FileSpreadsheet, Boxes,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

const CHART_COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#14b8a6'];

function SkeletonCards() {
  return (
    <div className="page-transition">
      <div className="mb-8">
        <div className="skeleton h-8 w-64 mb-2"></div>
        <div className="skeleton h-5 w-96"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="card p-6">
            <div className="skeleton h-4 w-24 mb-3"></div>
            <div className="skeleton h-8 w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, activityRes, aiRes] = await Promise.all([
        dashboardAPI.getDashboard(),
        activityAPI.getLogs({ limit: 8 }).catch(() => ({ data: [] })),
        aiAPI.getStatus().catch(() => null),
      ]);
      setData(dashRes.data);
      setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      setAiStatus(aiRes?.data || null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <SkeletonCards />;

  const stats = [
    {
      label: 'Total Products', value: data?.total_products ?? 0, icon: Package,
      color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30',
      desc: 'Products in catalog',
    },
    {
      label: 'Active Products', value: data?.active_products ?? 0, icon: PackageCheck,
      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      desc: 'Currently active',
    },
    {
      label: 'In Stock', value: data?.in_stock ?? 0, icon: Boxes,
      color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      desc: 'Available inventory',
    },
    {
      label: 'Out of Stock', value: data?.out_of_stock ?? 0, icon: PackageX,
      color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30',
      desc: 'Zero inventory',
    },
    {
      label: 'Total Revenue', value: `$${(data?.total_revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30',
      desc: `Margin ${data?.revenue_summary?.margin ?? 0}%`,
    },
    {
      label: 'Categories', value: data?.total_categories ?? 0, icon: FolderOpen,
      color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30',
      desc: 'Product categories',
    },
    {
      label: 'Datasets Loaded', value: data?.total_datasets ?? 0, icon: FileSpreadsheet,
      color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30',
      desc: data?.dataset_status || 'No dataset loaded',
    },
    {
      label: 'AI Prediction Status', value: aiStatus?.status === 'ready' ? 'Ready' : 'Needs Data',
      icon: BrainCircuit,
      color: aiStatus?.status === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      bg: aiStatus?.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30',
      desc: aiStatus ? `Trained on ${aiStatus.samples} records` : 'Check AI Pricing page',
    },
  ];

  const categoryData = data?.category_distribution || [];
  const priceData = data?.price_distribution || [];
  const trendData = data?.revenue_trend || [];
  const imports = data?.recent_imports || [];

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Revenue Intelligence Dashboard</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Welcome back, {user?.full_name || user?.username || 'User'}
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary btn-sm" title="Refresh data">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Charts row 1: Revenue trend + Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Revenue Trend</h3>
              <TrendingUp className="w-4 h-4 text-surface-400" />
            </div>
          </div>
          <div className="card-body">
            {trendData.length === 0 ? (
              <div className="empty-state py-12">
                <AlertCircle className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-sm text-surface-500 dark:text-surface-400">No sales data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Category Distribution</h3>
              <FolderOpen className="w-4 h-4 text-surface-400" />
            </div>
          </div>
          <div className="card-body">
            {categoryData.length === 0 ? (
              <div className="empty-state py-12">
                <AlertCircle className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-sm text-surface-500 dark:text-surface-400">No categories yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name?.slice(0, 8)}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Charts row 2: Price distribution + Recent imports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Price Distribution</h3>
              <DollarSign className="w-4 h-4 text-surface-400" />
            </div>
          </div>
          <div className="card-body">
            {priceData.length === 0 ? (
              <div className="empty-state py-12">
                <AlertCircle className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-sm text-surface-500 dark:text-surface-400">No products yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={priceData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Products" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Recent Imports</h3>
              <Database className="w-4 h-4 text-surface-400" />
            </div>
          </div>
          <div className="card-body">
            {imports.length === 0 ? (
              <div className="empty-state py-12">
                <Database className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-sm text-surface-500 dark:text-surface-400">No dataset imports yet</p>
                <Link to="/datasets" className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline">
                  Go to Dataset Management
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {imports.map((imp, i) => (
                  <div key={imp.id || i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
                        <FileSpreadsheet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{imp.name}</p>
                        <p className="text-xs text-surface-400">{imp.rows} rows · health {imp.health_score}%</p>
                      </div>
                    </div>
                    <span className="badge-success flex-shrink-0">Processed</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Latest Activities</h3>
          <Activity className="w-4 h-4 text-surface-400" />
        </div>
        <div className="card-body">
          {activity.length === 0 ? (
            <div className="empty-state py-8">
              <Activity className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
              <p className="text-sm text-surface-500 dark:text-surface-400">No recent activity</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activity.map((log, i) => (
                <div key={log.id || i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-sm text-surface-700 dark:text-surface-300">{log.action}</p>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">
                      {log.details || `${log.resource_type || 'System'} #${log.resource_id || ''}`}
                    </p>
                    <p className="text-[10px] text-surface-400 mt-0.5">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: '/products', icon: Package, label: 'Manage Products' },
              { to: '/pricing', icon: DollarSign, label: 'Update Pricing' },
              { to: '/ai', icon: BrainCircuit, label: 'AI Price Prediction' },
              { to: '/datasets', icon: Database, label: 'Load Datasets' },
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary-500" />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
