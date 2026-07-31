"""
PricePilot AI - Machine Learning Service
Real AI price optimization engine.

Trains Random Forest, XGBoost, and Linear Regression models on real pricing
data (products table + processed datasets), selects the best performing model,
and predicts optimal prices with confidence scores.
"""

import numpy as np
import pandas as pd
from typing import Optional, List, Dict

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.dataset import Dataset
from app.models.recommendation import Recommendation
from app.models.activity_log import ActivityLog
from app.services.forecast_service import ForecastService


class PricingMLService:
    """AI Pricing Optimization Engine - Core service for price recommendations."""

    MIN_SAMPLES = 10  # minimum data points to train

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Data preparation
    # ------------------------------------------------------------------
    def _build_training_frame(self) -> pd.DataFrame:
        """Build a training DataFrame from the product catalog."""
        products = self.db.query(Product).all()
        rows = []
        for p in products:
            if not p.current_price or p.current_price <= 0:
                continue
            rows.append({
                "product_id": p.id,
                "name": p.name,
                "category": p.category or "Uncategorized",
                "base_price": p.base_price or p.current_price,
                "current_price": p.current_price,
                "cost_price": p.cost_price or 0,
                "stock_quantity": p.stock_quantity or 0,
                "revenue": p.revenue or 0,
                "price_deviation": ((p.current_price - (p.base_price or p.current_price)) /
                                    (p.base_price or p.current_price)) * 100,
                "margin_pct": ((p.current_price - (p.cost_price or 0)) / p.current_price * 100)
                              if p.cost_price and p.cost_price > 0 else 0,
            })
        df = pd.DataFrame(rows)
        if df.empty:
            return df
        # One-hot encode category
        df = pd.get_dummies(df, columns=["category"], prefix="cat")
        return df

    def _train_models(self, df: pd.DataFrame):
        """Train candidate models, return the best one and its metadata."""
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.linear_model import LinearRegression
        from sklearn.model_selection import cross_val_score
        from sklearn.preprocessing import StandardScaler
        from sklearn.pipeline import Pipeline
        import xgboost as xgb

        feature_cols = [
            c for c in df.columns
            if c not in ("product_id", "name", "current_price", "revenue")
        ]
        X = df[feature_cols].astype(float).values
        y = df["revenue"].astype(float).values

        # Guard against zero variance / constant targets
        if np.std(y) < 1e-9 or X.shape[0] < self.MIN_SAMPLES:
            return None, None, None, "Insufficient data"

        # Ensure X is finite
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        candidates = {
            "Linear Regression": Pipeline([
                ("scaler", StandardScaler()),
                ("model", LinearRegression()),
            ]),
            "Random Forest": RandomForestRegressor(
                n_estimators=80, max_depth=6, random_state=42, n_jobs=-1
            ),
            "XGBoost": xgb.XGBRegressor(
                n_estimators=100, max_depth=5, learning_rate=0.1,
                random_state=42, n_jobs=-1, verbosity=0,
            ),
        }

        best_model, best_name, best_score = None, None, -np.inf
        scores = {}
        for name, model in candidates.items():
            try:
                cv = cross_val_score(
                    model, X, y, cv=min(5, X.shape[0]), scoring="neg_mean_absolute_error"
                )
                score = float(np.mean(cv))
                scores[name] = round(abs(score), 2)
                # Prefer the lowest absolute error
                if -score > best_score:
                    best_score = -score
                    best_name = name
                    best_model = model
            except Exception:
                continue

        if best_model is None:
            return None, None, None, "All models failed to train"

        # Fit best model on full data
        best_model.fit(X, y)
        return best_model, feature_cols, {"best_model": best_name, "cv_errors": scores, "samples": X.shape[0]}, None

    def _predict_optimal_price(self, product: Product, model, feature_cols: List[str],
                               df: pd.DataFrame) -> Dict:
        """Grid-search candidate prices to maximize predicted revenue."""
        if model is None:
            return None

        # Candidate prices around the current price
        price = product.current_price or 1.0
        candidate_prices = np.linspace(price * 0.7, price * 1.4, 15)

        best_price, best_revenue = price, 0.0
        revenue_curve = []
        for candidate in candidate_prices:
            row = {
                "base_price": product.base_price or candidate,
                "cost_price": product.cost_price or 0,
                "stock_quantity": product.stock_quantity or 0,
                "price_deviation": ((candidate - (product.base_price or candidate)) /
                                    (product.base_price or candidate)) * 100,
                "margin_pct": ((candidate - (product.cost_price or 0)) / candidate * 100)
                              if product.cost_price and product.cost_price > 0 else 0,
            }
            # Rebuild one-hot category features matching training columns
            full = pd.DataFrame([row])
            for col in feature_cols:
                if col.startswith("cat_") and col not in full.columns:
                    full[col] = 0
            # Encode the product's actual category so the model is category-aware
            cat_col = f"cat_{str(product.category or 'Uncategorized')}"
            if cat_col in full.columns:
                full[cat_col] = 1
            full = full.reindex(columns=feature_cols, fill_value=0)
            pred = float(model.predict(full.astype(float).values)[0])
            pred = max(0, pred)
            revenue_curve.append({"price": round(float(candidate), 2), "revenue": round(pred, 2)})
            if pred > best_revenue:
                best_revenue, best_price = pred, candidate

        return {
            "optimal_price": round(float(best_price), 2),
            "expected_revenue": round(float(best_revenue), 2),
            "revenue_curve": revenue_curve,
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def analyze_product(self, product_id: int, include_forecast: bool = False) -> dict:
        """Analyze a product and return pricing intelligence from real ML models.

        When ``include_forecast`` is True (or a fresh Prophet forecast is cached)
        the demand forecast is folded into the recommendation as a demand signal.
        """
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")

        demand_forecast = None
        if include_forecast:
            demand_forecast = ForecastService(self.db).get_demand_signal(product_id)

        df = self._build_training_frame()
        if len(df) < self.MIN_SAMPLES:
            return {
                "product_id": product_id,
                "product_name": product.name,
                "current_price": round(product.current_price, 2),
                "suggested_price": None,
                "confidence_score": 0,
                "expected_revenue_change": None,
                "factors": [],
                "recommendation": (
                    f"Insufficient data to train AI models. Need at least {self.MIN_SAMPLES} products "
                    f"with pricing/revenue data; currently have {len(df)}. "
                    "Upload a pricing dataset or add more products to enable AI predictions."
                ),
                "insufficient_data": True,
                "best_model": None,
                "model_metrics": None,
                "revenue_curve": [],
                "demand_forecast": demand_forecast,
            }

        model, feature_cols, metrics, error = self._train_models(df)
        if model is None:
            return {
                "product_id": product_id,
                "product_name": product.name,
                "current_price": round(product.current_price, 2),
                "suggested_price": None,
                "confidence_score": 0,
                "expected_revenue_change": None,
                "factors": [],
                "recommendation": f"AI model training failed: {error}. Add more pricing data and try again.",
                "insufficient_data": True,
                "best_model": None,
                "model_metrics": None,
                "revenue_curve": [],
                "demand_forecast": demand_forecast,
            }

        result = self._predict_optimal_price(product, model, feature_cols, df)
        if result is None:
            raise ValueError("Could not generate price recommendation")

        optimal_price = result["optimal_price"]
        current_price = product.current_price or 0

        # Fold the demand forecast into the recommendation when available.
        demand_factor_text = None
        if demand_forecast and demand_forecast.get("trend") != "unavailable":
            trend = demand_forecast.get("trend", "stable")
            growth = demand_forecast.get("growth_pct", 0)
            forecast_total = demand_forecast.get("forecast_revenue_total")
            src = "Prophet" if demand_forecast.get("source") == "prophet" else "trend analysis"
            if trend == "up" and growth > 3:
                optimal_price = round(optimal_price * 1.03, 2)  # room to test a higher price
                demand_factor_text = (f"Demand forecast ({src}) projects +{growth:.1f}% revenue growth "
                                      f"— supports testing a slightly higher price")
            elif trend == "down" and growth < -3:
                optimal_price = round(optimal_price * 0.985, 2)  # conservative in soft demand
                demand_factor_text = (f"Demand forecast ({src}) projects {growth:.1f}% revenue decline "
                                      f"— recommend conservative pricing to protect volume")
            else:
                demand_factor_text = (f"Demand forecast ({src}) shows a stable trend "
                                      f"— no demand-side adjustment")
            if forecast_total:
                demand_factor_text += f"; projected next 30-day revenue ${forecast_total:,.0f}"

        change_pct = ((optimal_price - current_price) / current_price * 100) if current_price else 0

        # Confidence: lower when few samples, lower when model error high (relative to mean price)
        samples = metrics["samples"]
        sample_factor = min(1.0, samples / 50)
        # Use relative error (MAE / mean price in the training set) so the penalty reflects
        # model quality rather than a single product's price.
        mean_price = df["current_price"].mean() if "current_price" in df.columns else current_price
        mae = metrics["cv_errors"].get(metrics["best_model"], 0)
        rel_error = mae / max(mean_price, 1)
        error_penalty = min(0.25, rel_error / 3)
        confidence = round(max(45, min(98, (70 * sample_factor) + 28 - error_penalty * 100)), 2)

        factors = []
        if product.cost_price and product.cost_price > 0:
            margin = ((optimal_price - product.cost_price) / optimal_price * 100)
            factors.append(f"Optimized margin at suggested price: {margin:.1f}%")
        if change_pct > 3:
            factors.append("Model detects upward price elasticity — revenue grows with price")
        elif change_pct < -3:
            factors.append("Model detects price sensitivity — lower price unlocks more volume")
        else:
            factors.append("Optimal price aligns closely with current price — market equilibrium")
        if product.stock_quantity and product.stock_quantity < 50:
            factors.append("Limited inventory — avoid discounting below suggested price")
        factors.append(f"Trained on {samples} product records with cross-validation")
        if demand_factor_text:
            factors.append(demand_factor_text)

        recommendation_text = (
            f"Model '{metrics['best_model']}' suggests setting price to ${optimal_price:.2f} "
            f"(from ${current_price:.2f}), a {change_pct:+.1f}% change, expected to maximize revenue "
            f"at ~${result['expected_revenue']:,.2f}. "
        )

        return {
            "product_id": product_id,
            "product_name": product.name,
            "current_price": round(current_price, 2),
            "suggested_price": optimal_price,
            "confidence_score": confidence,
            "expected_revenue_change": round(change_pct, 2),
            "expected_revenue": result["expected_revenue"],
            "price_difference": round(optimal_price - current_price, 2),
            "factors": factors,
            "recommendation": recommendation_text,
            "insufficient_data": False,
            "best_model": metrics["best_model"],
            "model_metrics": metrics["cv_errors"],
            "revenue_curve": result["revenue_curve"],
            "demand_forecast": demand_forecast,
        }

    def batch_analyze(self, category: Optional[str] = None, include_forecast: bool = False) -> list:
        """Analyze all products (optionally filtered by category)."""
        query = self.db.query(Product)
        if category:
            query = query.filter(Product.category == category)
        products = query.all()
        return [self.analyze_product(p.id, include_forecast=include_forecast) for p in products]

    def save_recommendation(self, analysis: dict, user_id: int) -> Recommendation:
        """Persist an AI recommendation for approval workflow."""
        product_id = analysis["product_id"]
        rec = Recommendation(
            product_id=product_id,
            recommended_price=analysis.get("suggested_price") or analysis["current_price"],
            current_price=analysis["current_price"],
            confidence_score=analysis.get("confidence_score", 0),
            expected_revenue_impact=analysis.get("expected_revenue_change", 0),
            factors_considered=" | ".join(analysis.get("factors", [])),
            status="pending",
        )
        self.db.add(rec)
        self.db.add(ActivityLog(
            action=f"AI recommendation generated for product #{product_id}",
            resource_type="product",
            resource_id=product_id,
            details=f"Suggested ${rec.recommended_price:.2f} (confidence {rec.confidence_score:.0f}%)",
            user_id=user_id,
        ))
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def get_revenue_prediction(self, product_id: int, new_price: float) -> dict:
        """Predict revenue impact of a specific price change using the trained model."""
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")

        df = self._build_training_frame()
        if len(df) < self.MIN_SAMPLES:
            elasticity = -1.2
            current_units = max(10, (product.revenue or 0) / max(product.current_price, 1))
            price_change_pct = ((new_price - product.current_price) / product.current_price) * 100
            demand_change = price_change_pct * elasticity / 100
            expected_units = max(0, current_units * (1 + demand_change))
            expected_revenue = expected_units * new_price
            return {
                "product_id": product_id,
                "product_name": product.name,
                "current_price": round(product.current_price, 2),
                "suggested_price": round(new_price, 2),
                "expected_units_sold": round(expected_units, 1),
                "expected_revenue": round(expected_revenue, 2),
                "current_revenue": round(current_units * product.current_price, 2),
                "revenue_change_pct": round(((expected_revenue - current_units * product.current_price) /
                                             max(current_units * product.current_price, 1)) * 100, 2),
                "confidence": 40,
                "mode": "elasticity_estimate",
            }

        model, feature_cols, metrics, _ = self._train_models(df)
        if model is None:
            raise ValueError("Model training failed")

        # Simulate: price change affects revenue through the trained model
        current = self._predict_optimal_price(product, model, feature_cols, df)
        base_revenue = current["expected_revenue"] if current else (product.revenue or 0)

        # Re-run grid with the specific price included
        row = {
            "base_price": product.base_price or new_price,
            "cost_price": product.cost_price or 0,
            "stock_quantity": product.stock_quantity or 0,
            "price_deviation": ((new_price - (product.base_price or new_price)) /
                                (product.base_price or new_price)) * 100,
            "margin_pct": ((new_price - (product.cost_price or 0)) / new_price * 100)
                          if product.cost_price and product.cost_price > 0 else 0,
        }
        full = pd.DataFrame([row])
        for col in feature_cols:
            if col.startswith("cat_") and col not in full.columns:
                full[col] = 0
        # Encode the product's actual category so the model is category-aware
        cat_col = f"cat_{str(product.category or 'Uncategorized')}"
        if cat_col in full.columns:
            full[cat_col] = 1
        full = full.reindex(columns=feature_cols, fill_value=0)
        expected_revenue = max(0, float(model.predict(full.astype(float).values)[0]))
        expected_units = expected_revenue / max(new_price, 0.01)

        change_pct = ((expected_revenue - base_revenue) / max(base_revenue, 1)) * 100

        return {
            "product_id": product_id,
            "product_name": product.name,
            "current_price": round(product.current_price, 2),
            "suggested_price": round(new_price, 2),
            "expected_units_sold": round(expected_units, 1),
            "expected_revenue": round(expected_revenue, 2),
            "current_revenue": round(base_revenue, 2),
            "revenue_change_pct": round(change_pct, 2),
            "confidence": round(min(95, 40 + metrics["samples"]), 2),
            "mode": f"ml_model_{metrics['best_model'].lower().replace(' ', '_')}",
        }

    def get_model_status(self) -> dict:
        """Report AI engine status: data availability, trained models, last predictions."""
        df = self._build_training_frame()
        samples = len(df)
        ready = samples >= self.MIN_SAMPLES

        pending = self.db.query(Recommendation).filter(Recommendation.status == "pending").count()
        applied = self.db.query(Recommendation).filter(Recommendation.status == "applied").count()
        rejected = self.db.query(Recommendation).filter(Recommendation.status == "rejected").count()

        status = {
            "status": "ready" if ready else "insufficient_data",
            "samples": samples,
            "min_samples_required": self.MIN_SAMPLES,
            "models_available": ["Linear Regression", "Random Forest", "XGBoost"],
            "recommendations_pending": pending,
            "recommendations_applied": applied,
            "recommendations_rejected": rejected,
            "forecasting": {
                "engine": "Prophet (weekly seasonality)",
                "forecastable_products": ForecastService(self.db).forecastable_count(),
                "min_history_days": ForecastService.MIN_HISTORY_DAYS,
            },
        }
        if ready:
            model, _, metrics, _ = self._train_models(df)
            if model is not None:
                status["best_model"] = metrics["best_model"]
                status["cv_errors"] = metrics["cv_errors"]
        return status
