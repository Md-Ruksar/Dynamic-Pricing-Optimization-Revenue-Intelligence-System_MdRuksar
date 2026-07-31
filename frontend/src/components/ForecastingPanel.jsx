import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { aiAPI, productsAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  LineChart as LineChartIcon, TrendingUp, TrendingDown, Minus, Loader2,
  RefreshCw, CalendarRange, BarChart3, AlertCircle, Sparkles, ArrowRight,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Legend,
} from 'recharts';

const CHART_COLORS = { actual: '#2563eb', forecast: '#8b5cf6', band: '#8b5cf6' };

const HORIZONS = [7, 14, 30, 60, 90];

function formatMoney(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Custom tooltip: only the meaningful series (Actual / Forecast / 80% bounds) are
// shown — the stacked band and boundary helper series are filtered out.
function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  // Filter to the meaningful series and dedupe: the stacked band + dashed
  // boundary helpers can share dataKeys (e.g. cover Area and boundary Line
  // both use 'yhat_lower'), which would otherwise render duplicate rows.
  const seen = new Set();
  const series = payload.filter((p) => {
    if (!['actual', 'yhat', 'yhat_lower', 'yhat_upper'].includes(p.dataKey)) return false;
    if (seen.has(p.dataKey)) return false;
    seen.add(p.dataKey);
    return true;
  });
  if (!series.length) return null;
  const labels = { actual: 'Actual', yhat: 'Forecast', yhat_lower: 'Lower (80%)', yhat_upper: 'Upper (80%)' };
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3.5 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-surface-900 dark:text-white mb-1.5">{label}</p>
      <div className="space-y-1">
        {series.map((s) => (
          <div key={s.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || (s.dataKey === 'actual' ? CHART_COLORS.actual : CHART_COLORS.forecast) }} />
              {labels[s.dataKey] || s.dataKey}
            </span>
            <span className="font-mono font-medium text-surface-900 dark:text-white">{formatMoney(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendBadge({ trend, growth }) {
  if (trend === 'up') {
    return <span className="badge-success"><TrendingUp className="w-3 h-3" /> +{growth}%</span>;
  }
  if (trend === 'down') {
    return <span className="badge-danger"><TrendingDown className="w-3 h-3" /> {growth}%</span>;
  }
  if (trend === 'stable') {
    return <span className="badge-neutral"><Minus className="w-3 h-3" /> {growth}%</span>;
  }
  return <span className="badge-neutral">Unavailable</span>;
}

export default function ForecastingPanel({ onUseInOptimization }) {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [horizon, setHorizon] = useState(30);
  const [forecast, setForecast] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  // Guards against stale responses when the product/horizon changes quickly
  const requestSeq = useRef(0);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsAPI.list({ limit: 100 });
      const items = res.data.items || [];
      setProducts(items);
      if (items.length > 0) setSelectedId((prev) => prev || items[0].id);
    } catch (err) {
      toast.error('Failed to load products', err.response?.data?.detail);
    }
  }, [toast]);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await aiAPI.forecastPortfolio(horizon);
      setPortfolio(res.data);
    } catch { /* portfolio is auxiliary */ } finally {
      setLoading(false);
    }
  }, [horizon]);

  const runForecast = useCallback(async (productId, h, forceRetrain) => {
    if (!productId) return;
    const seq = ++requestSeq.current;
    setLoadingForecast(true);
    try {
      const res = await aiAPI.forecast(productId, h, forceRetrain);
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setForecast(res.data);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      toast.error('Forecast failed', err.response?.data?.detail);
      setForecast(null);
    } finally {
      if (seq === requestSeq.current) setLoadingForecast(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-run forecast whenever the selected product or horizon changes
  useEffect(() => {
    if (selectedId) runForecast(selectedId, horizon, false);
  }, [selectedId, horizon, runForecast]);

  const handleRetrain = () => {
    if (!selectedId) return;
    runForecast(selectedId, horizon, true);
    toast.info('Retraining Prophet model', 'Fresh forecast requested — this can take a few seconds');
  };

  const handleUseInOptimization = () => {
    if (!selectedId || !forecast?.points?.length) {
      toast.error('Forecast unavailable', 'Run a forecast for this product first');
      return;
    }
    const product = products.find((p) => p.id === selectedId);
    if (product && onUseInOptimization) {
      onUseInOptimization(product, forecast);
    }
  };

  // Merge history + forecast into a single chart series (keep last 45 history days)
  const chartData = useMemo(() => {
    const merged = [];
    const history = forecast?.history || [];
    const recent = history.slice(-45);
    recent.forEach((h) => merged.push({ date: h.date, actual: h.actual }));
    (forecast?.points || []).forEach((p) =>
      merged.push({
        date: p.date,
        yhat: p.yhat,
        yhat_lower: p.yhat_lower,
        yhat_upper: p.yhat_upper,
        band: p.yhat_upper - p.yhat_lower, // band height for the stacked confidence area
      })
    );
    return merged;
  }, [forecast]);

  const metrics = forecast?.metrics || {};
  const avgBandWidth = useMemo(() => {
    const pts = forecast?.points || [];
    if (!pts.length) return 0;
    return pts.reduce((acc, p) => acc + (p.yhat_upper - p.yhat_lower) / Math.max(p.yhat, 1), 0) / pts.length * 100;
  }, [forecast]);

  const kpis = [
    {
      label: 'Forecast Revenue',
      value: formatMoney(metrics.forecast_revenue_total),
      sub: `next ${horizon} days`,
      icon: BarChart3, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      label: 'Growth vs Trailing',
      value: `${metrics.growth_pct ?? 0}%`,
      sub: metrics.source === 'prophet' ? 'Prophet model' : 'Trend estimate',
      icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Avg Daily Revenue',
      value: formatMoney(metrics.avg_daily_revenue),
      sub: `last actual ${formatMoney(metrics.last_actual)}`,
      icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: '80% CI Width',
      value: `±${avgBandWidth.toFixed(0)}%`,
      sub: 'avg prediction interval',
      icon: CalendarRange, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  const selectedProduct = products.find((p) => p.id === selectedId);
  const insufficient = forecast?.insufficient_data;
  const isFallback = forecast?.fallback;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[240px]">
              <label className="label">Product</label>
              <select
                className="input"
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                disabled={loadingForecast}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Forecast Horizon</label>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-100 dark:bg-surface-700/60">
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      horizon === h
                        ? 'bg-white dark:bg-surface-600 text-primary-600 dark:text-primary-300 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-200'
                    }`}
                  >
                    {h}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => runForecast(selectedId, horizon, false)} disabled={loadingForecast} className="btn-primary">
                {loadingForecast ? <Loader2 className="w-4 h-4 animate-spin" /> : <LineChartIcon className="w-4 h-4" />}
                Run Forecast
              </button>
              <button onClick={handleRetrain} disabled={loadingForecast} className="btn-secondary btn-sm" title="Force Prophet retrain (ignore cache)">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingForecast ? 'animate-spin' : ''}`} />
                Retrain
              </button>
            </div>
          </div>
          {isFallback && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {forecast?.fallback_reason === 'prophet_unavailable'
                ? 'Prophet STAN backend is unavailable in this environment — showing a fast trend estimate with confidence bounds instead.'
                : 'Limited sales history — showing a fast trend estimate instead of a full Prophet fit.'}
            </p>
          )}
        </div>
      </div>

      {insufficient ? (
        <div className="card">
          <div className="card-body">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{forecast?.recommendation}</p>
            </div>
          </div>
        </div>
      ) : forecast ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="stat-label">{k.label}</span>
                    <div className={`p-2 rounded-lg ${k.bg}`}>
                      <Icon className={`w-4 h-4 ${k.color}`} />
                    </div>
                  </div>
                  <span className="stat-value">{k.value}</span>
                  <span className="stat-description">{k.sub}</span>
                </div>
              );
            })}
          </div>

          {/* Demand trend banner */}
          <div className="card overflow-hidden border-l-4 border-l-violet-500">
            <div className="card-body flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">Demand Signal — {selectedProduct?.name}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {metrics.source === 'prophet' ? 'Prophet model' : 'Linear trend'} · trained on {forecast.history?.length} days of sales history
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:ml-auto">
                <TrendBadge trend={metrics.trend} growth={metrics.growth_pct} />
                <button onClick={handleUseInOptimization} className="btn-primary btn-sm">
                  <Sparkles className="w-3.5 h-3.5" /> Use in Optimization
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Confidence band chart */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                  Revenue Forecast — {horizon}-Day Horizon
                </h3>
                <span className="text-xs text-surface-400">80% confidence interval</span>
              </div>
            </div>
            <div className="card-body">
              {chartData.length === 0 ? (
                <div className="empty-state py-12">
                  <AlertCircle className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
                  <p className="text-sm text-surface-500 dark:text-surface-400">No forecast points generated</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                    <Tooltip content={<ForecastTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine
                      x={forecast?.history?.length ? forecast.history[forecast.history.length - 1]?.date : undefined}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ value: 'Today', fontSize: 10, fill: '#94a3b8', position: 'insideTopRight' }}
                    />
                    {/* Stacked band: lower bound (cover) + band height = upper bound, so the
                        shaded region renders exactly between the two bounds. */}
                    <Area dataKey="yhat_lower" stackId="band" stroke="none" className="forecast-cover" legendType="none" />
                    <Area dataKey="band" stackId="band" stroke="none" fill="url(#forecastBand)" legendType="none" />
                    <Line type="monotone" dataKey="yhat_lower" stroke={CHART_COLORS.forecast} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5} dot={false} legendType="none" />
                    <Line type="monotone" dataKey="yhat_upper" stroke={CHART_COLORS.forecast} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5} dot={false} legendType="none" />
                    <Line type="monotone" dataKey="yhat" name="Forecast" stroke={CHART_COLORS.forecast} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke={CHART_COLORS.actual} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Forecast table */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Forecast Points</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50">
                    <th className="table-header">Date</th>
                    <th className="table-header text-right">Forecast</th>
                    <th className="table-header text-right">Lower (80%)</th>
                    <th className="table-header text-right">Upper (80%)</th>
                    <th className="table-header text-right">Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {(forecast?.points || []).map((p) => (
                    <tr key={p.date} className="table-row">
                      <td className="table-cell font-mono text-xs">{p.date}</td>
                      <td className="table-cell text-right font-mono font-semibold text-violet-600 dark:text-violet-400">
                        {formatMoney(p.yhat)}
                      </td>
                      <td className="table-cell text-right font-mono">{formatMoney(p.yhat_lower)}</td>
                      <td className="table-cell text-right font-mono">{formatMoney(p.yhat_upper)}</td>
                      <td className="table-cell text-right">
                        <span className="text-xs text-surface-500">
                          {formatMoney(p.yhat_upper - p.yhat_lower)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body flex items-center justify-center py-16">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            ) : (
              <div className="empty-state">
                <LineChartIcon className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-sm text-surface-500 dark:text-surface-400">Select a product and run a forecast</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portfolio outlook */}
      {portfolio && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Top Growing Demand
              </h3>
            </div>
            <div className="card-body space-y-3">
              {portfolio.top_growing?.length === 0 ? (
                <p className="text-sm text-surface-400">No products with rising demand right now.</p>
              ) : (
                portfolio.top_growing?.map((r) => (
                  <div key={r.product_id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{r.product_name}</p>
                      <p className="text-xs text-surface-400">{r.category}</p>
                    </div>
                    <TrendBadge trend="up" growth={r.growth_pct} />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Softening Demand
              </h3>
            </div>
            <div className="card-body space-y-3">
              {portfolio.top_declining?.length === 0 ? (
                <p className="text-sm text-surface-400">No products with declining demand right now.</p>
              ) : (
                portfolio.top_declining?.map((r) => (
                  <div key={r.product_id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{r.product_name}</p>
                      <p className="text-xs text-surface-400">{r.category}</p>
                    </div>
                    <TrendBadge trend="down" growth={r.growth_pct} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
