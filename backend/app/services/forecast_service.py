"""
PricePilot AI - Demand Forecasting Service
Prophet-based revenue forecasting engine.

Builds daily revenue time series from the sales ledger, trains a Facebook
Prophet model with weekly seasonality, and produces N-day demand forecasts
with 80% confidence intervals. Forecasts are cached in the forecast_runs
table and surfaced to the pricing engine as a "demand signal" so price
optimization accounts for expected demand shifts.
"""

import json
import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.sales import Sale
from app.models.product import Product
from app.models.forecast import ForecastRun


class ForecastService:
    """Prophet-based demand & revenue forecasting engine."""

    MIN_HISTORY_DAYS = 7      # minimum daily points required for a Prophet fit
    MIN_TREND_POINTS = 3      # minimum points for the fast linear-trend fallback
    CACHE_MAX_AGE_HOURS = 6   # re-train if the cached run is older than this
    DEFAULT_HORIZON = 30

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Data preparation
    # ------------------------------------------------------------------
    def _daily_series(self, product_id: int) -> pd.DataFrame:
        """Aggregate sales into a daily revenue series (indexed by date)."""
        sales = (
            self.db.query(Sale)
            .filter(Sale.product_id == product_id)
            .order_by(Sale.sale_date.asc())
            .all()
        )
        if not sales:
            return pd.DataFrame(columns=["date", "revenue", "units"])

        df = pd.DataFrame(
            [{"date": s.sale_date.date(), "revenue": s.total_amount or 0, "units": s.quantity or 0}
             for s in sales]
        )
        daily = df.groupby("date", as_index=False).agg(
            revenue=("revenue", "sum"),
            units=("units", "sum"),
        ).sort_values("date")
        return daily

    # ------------------------------------------------------------------
    # Fast statistical trend (portfolio views + signal fallback)
    # ------------------------------------------------------------------
    def _quick_trend(self, daily: pd.DataFrame, horizon: int, include_points: bool = False) -> dict:
        """Cheap linear-trend estimate used before/without a full Prophet fit."""
        if daily.empty or len(daily) < self.MIN_TREND_POINTS:
            return None

        x = np.arange(len(daily), dtype=float)
        y = daily["revenue"].astype(float).values
        # Normalize for stability
        scale = max(float(np.max(y)), 1e-9)
        slope, intercept = np.polyfit(x, y / scale, 1)
        slope = slope * scale  # revenue/day

        avg_daily = float(np.mean(y))
        last_actual = float(y[-1])
        x_future = x[-1] + 1 + np.arange(horizon)
        y_future = intercept * scale + slope * x_future
        forecast_total = max(0.0, float(np.sum(y_future)))

        growth_pct = ((forecast_total / horizon) / max(avg_daily, 1e-9) - 1) * 100 if avg_daily > 0 else 0.0
        trend = "up" if slope > avg_daily * 0.02 else ("down" if slope < -avg_daily * 0.02 else "stable")

        result = {
            "trend": trend,
            "growth_pct": round(growth_pct, 2),
            "avg_daily_revenue": round(avg_daily, 2),
            "forecast_revenue_total": round(forecast_total, 2),
            "last_actual": round(last_actual, 2),
            "daily_change": round(slope, 2),
            "source": "linear_trend",
            "points": None,
        }
        if include_points:
            last_date = daily["date"].iloc[-1]
            result["points"] = [
                {
                    "date": (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d"),
                    "yhat": round(float(max(v, 0)), 2),
                    "yhat_lower": round(float(max(v * 0.8, 0)), 2),
                    "yhat_upper": round(float(max(v * 1.2, 0)), 2),
                }
                for i, v in enumerate(y_future)
            ]
        return result

    # ------------------------------------------------------------------
    # Prophet fit
    # ------------------------------------------------------------------
    def _fit_prophet(self, daily: pd.DataFrame, horizon: int) -> dict:
        """Train Prophet on daily revenue and forecast `horizon` days ahead.

        Returns ``None`` when history is too short OR when the Prophet/STAN
        backend is unavailable (e.g. missing CmdStan binaries), so callers can
        degrade to the fast trend estimate instead of failing.
        """
        df = daily[["date", "revenue"]].rename(columns={"date": "ds", "revenue": "y"})
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

        if len(df) < self.MIN_HISTORY_DAYS:
            return None

        try:
            from prophet import Prophet  # imported lazily: heavy dependency

            model = Prophet(
                growth="linear",
                weekly_seasonality=True,
                yearly_seasonality=False,
                daily_seasonality=False,
                interval_width=0.8,  # 80% confidence interval
                seasonality_mode="additive",
            )
            model.fit(df)
            future = model.make_future_dataframe(periods=horizon, freq="D")
            forecast = model.predict(future)
        except Exception as exc:  # noqa: BLE001 - degrade gracefully on any backend failure
            logger.warning("Prophet fit failed, falling back to trend estimate: %s", exc)
            return None

        last_actual_date = df["ds"].max()
        history_points = []
        for _, row in df.iterrows():
            history_points.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "actual": round(float(row["y"]), 2),
            })

        forecast_points = []
        for _, row in forecast.iterrows():
            if row["ds"] <= last_actual_date:
                continue
            forecast_points.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "yhat": round(float(max(row["yhat"], 0)), 2),
                "yhat_lower": round(float(max(row["yhat_lower"], 0)), 2),
                "yhat_upper": round(float(max(row["yhat_upper"], 0)), 2),
            })

        actual_total = float(df["y"].sum())
        forecast_total = float(sum(p["yhat"] for p in forecast_points))
        avg_daily = actual_total / max(len(df), 1)

        # Growth vs the trailing average of the same length as the horizon
        window = min(horizon, len(df))
        trailing = float(df["y"].tail(window).mean()) if window > 0 else 0.0
        forecast_daily = forecast_total / max(len(forecast_points), 1)
        growth_pct = ((forecast_daily / max(trailing, 1e-9)) - 1) * 100 if trailing > 0 else 0.0

        trend = "up" if growth_pct > 3 else ("down" if growth_pct < -3 else "stable")

        return {
            "trend": trend,
            "growth_pct": round(growth_pct, 2),
            "avg_daily_revenue": round(avg_daily, 2),
            "forecast_revenue_total": round(forecast_total, 2),
            "last_actual": round(float(df["y"].iloc[-1]), 2),
            "source": "prophet",
            "points": forecast_points,
            "history": history_points,
            "trained_on_days": len(df),
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def _load_cached(self, product_id: int, horizon: int):
        """Return a fresh-enough cached forecast run for this product, if any."""
        run = (
            self.db.query(ForecastRun)
            .filter(ForecastRun.product_id == product_id, ForecastRun.horizon == horizon)
            .order_by(ForecastRun.created_at.desc())
            .first()
        )
        if not run:
            return None
        age = datetime.utcnow() - (run.created_at.replace(tzinfo=None) if run.created_at else datetime.utcnow())
        if age.total_seconds() > self.CACHE_MAX_AGE_HOURS * 3600:
            return None
        try:
            return {
                "points": json.loads(run.points),
                "history": json.loads(run.history),
                "metrics": json.loads(run.metrics),
                "created_at": run.created_at.isoformat() if run.created_at else None,
            }
        except (json.JSONDecodeError, TypeError):
            return None

    def forecast_product(self, product_id: int, horizon: int = DEFAULT_HORIZON,
                         force: bool = False, user_id: int = None) -> dict:
        """Forecast demand for one product with confidence intervals.

        Returns a dict with points (forecast), history (actuals), metrics and
        a flag describing whether a real Prophet fit or the fast fallback was used.
        """
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")

        horizon = max(7, min(horizon, 180))

        if not force:
            cached = self._load_cached(product_id, horizon)
            if cached:
                return {
                    "product_id": product_id,
                    "product_name": product.name,
                    "horizon": horizon,
                    "points": cached["points"],
                    "history": cached["history"],
                    "metrics": cached["metrics"],
                    "insufficient_data": False,
                    "cached": True,
                    "created_at": cached["created_at"],
                }

        daily = self._daily_series(product_id)
        if len(daily) < self.MIN_TREND_POINTS:
            return {
                "product_id": product_id,
                "product_name": product.name,
                "horizon": horizon,
                "points": [],
                "history": [],
                "metrics": {},
                "insufficient_data": True,
                "cached": False,
                "recommendation": (
                    f"Not enough sales history for '{product.name}' to run a demand forecast. "
                    f"Need at least {self.MIN_HISTORY_DAYS} days of sales data; currently "
                    f"available: {len(daily)} days. Generate sales activity or upload a dataset "
                    "with transactions to enable Prophet forecasting."
                ),
            }

        result = self._fit_prophet(daily, horizon)
        if result is None:
            # Fall back to the fast trend if Prophet cannot fit (too little history
            # or an unavailable STAN backend).
            fallback = self._quick_trend(daily, horizon, include_points=True)
            if fallback is None:
                return {
                    "product_id": product_id,
                    "product_name": product.name,
                    "horizon": horizon,
                    "points": [],
                    "history": [],
                    "metrics": {},
                    "insufficient_data": True,
                    "cached": False,
                    "recommendation": f"Insufficient sales history for '{product.name}' to forecast demand.",
                }
            points = fallback.pop("points") or []
            return {
                "product_id": product_id,
                "product_name": product.name,
                "horizon": horizon,
                "points": points,
                "history": [{"date": d.strftime("%Y-%m-%d"), "actual": round(float(v), 2)}
                            for d, v in zip(daily["date"], daily["revenue"])],
                "metrics": fallback,
                "insufficient_data": False,
                "cached": False,
                "fallback": True,
                "fallback_reason": (
                    "limited_history" if len(daily) < self.MIN_HISTORY_DAYS
                    else "prophet_unavailable"
                ),
            }

        # Persist the forecast run for caching
        run = ForecastRun(
            product_id=product_id,
            horizon=horizon,
            points=json.dumps(result["points"]),
            history=json.dumps(result["history"]),
            metrics=json.dumps({k: v for k, v in result.items()
                                if k not in ("points", "history")}),
            model_info=f"Prophet weekly-seasonality, {result['trained_on_days']} days history",
            created_by=user_id,
        )
        self.db.add(run)
        self.db.commit()

        return {
            "product_id": product_id,
            "product_name": product.name,
            "horizon": horizon,
            "points": result["points"],
            "history": result["history"],
            "metrics": {k: v for k, v in result.items() if k not in ("points", "history", "trained_on_days")},
            "insufficient_data": False,
            "cached": False,
        }

    def get_demand_signal(self, product_id: int, horizon: int = DEFAULT_HORIZON) -> dict:
        """Lightweight demand signal for the pricing engine.

        Prefers a fresh cached Prophet forecast; otherwise computes the fast
        linear trend. Never triggers a full Prophet re-fit (keeps optimize fast).
        """
        cached = self._load_cached(product_id, horizon)
        if cached:
            return {
                "trend": cached["metrics"].get("trend", "stable"),
                "growth_pct": cached["metrics"].get("growth_pct", 0),
                "avg_daily_revenue": cached["metrics"].get("avg_daily_revenue", 0),
                "forecast_revenue_total": cached["metrics"].get("forecast_revenue_total", 0),
                "source": "prophet",
            }
        daily = self._daily_series(product_id)
        trend = self._quick_trend(daily, horizon)
        if trend is None:
            return {"trend": "unavailable", "growth_pct": 0, "source": "none"}
        return trend

    def forecastable_count(self) -> int:
        """Count products with enough sales history to forecast (single cheap query)."""
        from sqlalchemy import func, distinct

        days_per_product = (
            self.db.query(Sale.product_id, func.count(distinct(Sale.sale_date)).label("days"))
            .group_by(Sale.product_id)
            .subquery()
        )
        return self.db.query(func.count(days_per_product.c.product_id))\
            .filter(days_per_product.c.days >= self.MIN_HISTORY_DAYS).scalar() or 0

    def portfolio_summary(self, horizon: int = DEFAULT_HORIZON) -> dict:
        """Quick demand outlook across the whole catalog (fast, no Prophet fits)."""
        horizon = max(7, min(horizon, 180))
        products = self.db.query(Product).all()
        rows = []
        total_forecast = 0.0
        for p in products:
            daily = self._daily_series(p.id)
            signal = self._quick_trend(daily, horizon)
            if signal is None:
                continue
            total_forecast += signal["forecast_revenue_total"]
            rows.append({
                "product_id": p.id,
                "product_name": p.name,
                "category": p.category or "Uncategorized",
                "current_price": round(p.current_price, 2),
                **{k: v for k, v in signal.items() if k != "points"},
            })

        rows.sort(key=lambda r: r["growth_pct"], reverse=True)
        top_growing = [r for r in rows if r["trend"] == "up"][:5]
        top_declining = [r for r in reversed(rows) if r["trend"] == "down"][:5]

        return {
            "horizon": horizon,
            "products_analyzed": len(rows),
            "total_forecast_revenue": round(total_forecast, 2),
            "top_growing": top_growing,
            "top_declining": top_declining,
            "products": rows,
        }
