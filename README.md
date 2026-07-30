# PricePilot AI – Dynamic Pricing Optimization & Revenue Intelligence System

**PricePilot AI** is an enterprise SaaS platform for dynamic pricing optimization, product catalog management, and revenue intelligence. Built as part of the Infosys 8-Week Virtual Internship, this system provides a production-ready solution for managing products, pricing, datasets, and users with a modern, professional UI.

---

## 🚀 Live Preview

The application is currently running:

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | `http://127.0.0.1:5173` | ✅ Vite Dev Server |
| **Backend API** | `http://127.0.0.1:8000` | ✅ FastAPI |
| **API Docs** | `http://127.0.0.1:8000/docs` | ✅ Swagger UI |
| **Database** | SQLite (`backend/dynamic_pricing.db`) | ✅ Auto-seeded |

---

## 📋 Table of Contents

- [What We Built Today](#-what-we-built-today)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Backend API](#-backend-api)
- [Frontend Pages](#-frontend-pages)
- [Database Schema](#-database-schema)
- [Sample Products](#-sample-products)
- [Dynamic Dataset Loading](#-dynamic-dataset-loading)
- [Enterprise Color Scheme](#-enterprise-color-scheme)
- [Feature Flags](#-feature-flags)
- [Setup & Installation](#-setup--installation)
- [Running the Application](#-running-the-application)
- [API Credentials](#-api-credentials)
- [Project Structure](#-project-structure)

---

## 🎯 What We Built Today

### 1. Product Images That Match Their Names
Replaced generic placeholder images with **curated Unsplash product photos** that visually match each product. Now every product card shows a real photo of what it is — headphones show headphones, running shoes show running shoes, coffee makers show coffee makers.

### 2. Enterprise SaaS Color Scheme
Rebranded the entire UI from indigo/purple to a **professional enterprise blue** palette (`#3b82f6`). The new scheme is clean, professional, and consistent with enterprise SaaS platforms like Salesforce, HubSpot, and Stripe.

### 3. Dynamic Dataset Loading
Created **27 sample products** across two CSV files that can be dynamically loaded into the database via the Dataset Management page. The "Load from Server" buttons now work immediately, and you can upload your own CSV files with product data including image URLs.

### 4. Real-Time CRUD Operations
Full **Create, Read, Update, Delete** operations for all products with instant UI updates. Products can be added with image URLs, edited in a modal, searched by name/SKU, filtered by category, and paginated.

### 5. Auto-Seeding on Startup
The database automatically seeds **16 realistic products** with pricing history and activity logs every time the backend starts (if the database is empty). No manual setup required.

---

## 💻 Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.12+ | Core language |
| FastAPI | 0.115.6 | Web framework & REST API |
| SQLAlchemy | 2.0.36 | ORM & database management |
| Pydantic | 2.13.4 | Data validation & schemas |
| Passlib + bcrypt | 1.7.4 | Password hashing |
| python-jose | 3.3.0 | JWT token generation |
| Uvicorn | 0.34.0 | ASGI server |
| Pandas | 2.2.3 | CSV & data processing |
| SQLite | — | Development database |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.8 | UI framework |
| Vite | 6.4.3 | Build tool & dev server |
| Tailwind CSS | 3.4.19 | Utility-first CSS |
| React Router | 7.18.1 | Client-side routing |
| Axios | 1.18.1 | HTTP client |
| React Hook Form | 7.83.0 | Form validation |
| Lucide React | 0.469.0 | Icon library |
| Recharts | 2.15.4 | Charts & graphs |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Dashboard│ │ Products │ │ Pricing  │ │ Datasets │  │
│  │   Page   │ │   Page   │ │   Page   │ │   Page   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │            │            │         │
│  ┌────┴────────────┴────────────┴────────────┴────┐    │
│  │           API Client (Axios)                    │    │
│  │     Interceptors → JWT Token → Proxy /api      │    │
│  └───────────────────────┬─────────────────────────┘    │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTP (via Vite proxy or direct)
┌──────────────────────────┼──────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth    │ │ Products │ │ Dashboard│ │ Pricing  │  │
│  │  Router  │ │  Router  │ │  Router  │ │  Router  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │            │            │         │
│  ┌────┴────────────┴────────────┴────────────┴────┐    │
│  │           Service Layer                          │    │
│  │  AuthService  ProductService  DashboardService   │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────┴─────────────────────────┐    │
│  │        SQLAlchemy ORM → SQLite Database          │    │
│  │  Users │ Products │ PricingHistory │ ActivityLog │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Vite Dev Proxy**: In development, the frontend runs on port 5173 and Vite proxies `/api` and `/loaders` requests to the backend on port 8000 — no CORS issues.
2. **JWT Authentication**: All API routes (except register/login) require a JWT bearer token. The frontend stores the token in `localStorage` and attaches it via Axios interceptor.
3. **Feature Flags**: Future modules (AI pricing, forecasting, reports, analytics) have their backend APIs intact but are hidden from the frontend UI via `src/config/features.js`. Enabling them is a single flag flip.
4. **Auto-Seed**: The backend automatically seeds 16 sample products with pricing history and activity logs on first startup. The seed is idempotent — it only runs once.

---

## 🔌 Backend API

### Milestone 1 (Active) — 18 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Register a new user |
| `POST` | `/api/v1/auth/login` | Public | Login, returns JWT token |
| `GET` | `/api/v1/auth/me` | JWT | Get current user info |
| `GET` | `/api/v1/dashboard/` | JWT | Dashboard statistics |
| `GET` | `/api/v1/products/` | JWT | List products (paginated, searchable) |
| `GET` | `/api/v1/products/{id}` | JWT | Get single product |
| `POST` | `/api/v1/products/` | JWT | Create product |
| `PUT` | `/api/v1/products/{id}` | JWT | Update product |
| `DELETE` | `/api/v1/products/{id}` | JWT | Delete product |
| `GET` | `/api/v1/products/categories/all` | JWT | List all categories |
| `PUT` | `/api/v1/pricing/products/{id}/price` | JWT | Update product price |
| `GET` | `/api/v1/pricing/products/{id}/history` | JWT | Get price history |
| `GET` | `/api/v1/datasets/` | JWT | List datasets |
| `GET` | `/api/v1/datasets/stats` | JWT | Dataset statistics |
| `GET` | `/api/v1/users/` | JWT | List users (admin) |
| `POST` | `/api/v1/users/` | JWT | Create user (admin) |
| `PUT` | `/api/v1/users/{id}/status` | JWT | Toggle user status |
| `DELETE` | `/api/v1/users/{id}` | JWT | Delete user (admin) |

### Data Loaders — 4 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/loaders/retail-pricing` | JWT | Load retail CSV from server |
| `POST` | `/loaders/retail-pricing/upload` | JWT | Upload retail CSV file |
| `POST` | `/loaders/ecommerce-sales` | JWT | Load e-commerce CSV from server |
| `POST` | `/loaders/ecommerce-sales/upload` | JWT | Upload e-commerce CSV file |

### System — 1 Endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | Public | Health check |

---

## 🖥 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | JWT authentication with username/password |
| **Register** | `/register` | New user registration with role selection |
| **Dashboard** | `/dashboard` | Stats: total products, active products, categories, avg price, dataset status, recent activity, quick actions |
| **Products** | `/products` | Full CRUD with card grid view (images, prices, stock, margin, revenue), list view, search, category filter, pagination |
| **Pricing** | `/pricing` | Manual price updates with change indicators, price history modal |
| **Datasets** | `/datasets` | Load retail/e-commerce CSVs from server or upload your own, view stats and import logs |
| **Users** | `/users` | Admin-only: create/edit users, assign roles, activate/deactivate |
| **Settings** | `/settings` | Profile editing, password change, theme toggle (dark/light), system config |

### UI Features
- **Dark/Light Mode** — Persisted to localStorage, respects system preference
- **Responsive Layout** — Works on desktop and tablet
- **Grid/List View Toggle** — Switch between card and table views on Products page
- **Animated Transitions** — Fade-in, slide-in, scale-in animations
- **Glassmorphism Hover Effects** — Product card hover overlays
- **Skeleton Loading States** — Placeholder UI while data loads
- **Enterprise Typography** — Inter font family with JetBrains Mono for code/prices

---

## 🗄 Database Schema

### Users
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `username` | String(50) | Unique login name |
| `email` | String(100) | Unique email |
| `hashed_password` | String | bcrypt hash |
| `full_name` | String(100) | Display name |
| `role` | String(20) | admin, pricing_manager, business_user |
| `is_active` | Boolean | Account status |

### Products
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `name` | String(200) | Product name |
| `sku` | String(50) | Unique SKU |
| `description` | Text | Product description |
| `category` | String(100) | Product category |
| `base_price` | Float | Original price |
| `current_price` | Float | Current selling price |
| `cost_price` | Float | Cost price (for margin calc) |
| `image_url` | String(500) | Product image URL |
| `stock_quantity` | Integer | Current inventory |
| `revenue` | Float | Total revenue |
| `status` | String(20) | active/inactive |

### Pricing History
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `product_id` | Integer (FK) | Reference to products |
| `old_price` | Float | Previous price |
| `new_price` | Float | Updated price |
| `change_reason` | String(200) | Reason for change |
| `changed_by` | Integer | User who made change |
| `changed_at` | DateTime | Timestamp |

### Activity Log
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Auto-increment |
| `action` | String(200) | Action description |
| `resource_type` | String(50) | Type of resource |
| `resource_id` | Integer | Resource identifier |
| `details` | Text | Additional context |
| `user_id` | Integer | User who performed action |
| `created_at` | DateTime | Timestamp |

---

## 📦 Sample Products

The database auto-seeds **16 realistic products** across **6 categories** on first startup:

| # | Product | Category | Price | Stock | Image |
|---|---------|----------|-------|-------|-------|
| 1 | Wireless Noise-Cancelling Headphones Pro | Electronics | $199.99 | 145 | ✅ |
| 2 | Organic Cotton Casual Shirt | Clothing | $39.99 | 320 | ✅ |
| 3 | Smart Fitness Watch Ultra | Electronics | $279.99 | 89 | ✅ |
| 4 | Professional Chef's Knife Set | Home & Kitchen | $89.99 | 67 | ✅ |
| 5 | Ergonomic Office Chair Pro | Furniture | $399.99 | 34 | ✅ |
| 6 | Stainless Steel Water Bottle 32oz | Sports & Outdoors | $29.99 | 512 | ✅ |
| 7 | Bluetooth Portable Speaker Boom | Electronics | $69.99 | 203 | ✅ |
| 8 | Bamboo Cutting Board Set | Home & Kitchen | $34.99 | 178 | ✅ |
| 9 | Ultralight Running Shoes | Clothing | $89.99 | 156 | ✅ |
| 10 | Smart LED Desk Lamp | Electronics | $49.99 | 234 | ✅ |
| 11 | Premium Yoga Mat | Sports & Outdoors | $34.99 | 289 | ✅ |
| 12 | French Press Coffee Maker | Home & Kitchen | $32.99 | 167 | ✅ |
| 13 | Minimalist Leather Wallet | Accessories | $44.99 | 198 | ✅ |
| 14 | Mechanical Gaming Keyboard RGB | Electronics | $129.99 | 92 | ✅ |
| 15 | Himalayan Salt Lamp | Home & Kitchen | $24.99 | 412 | ✅ |
| 16 | Canvas Backpack Travel Pro | Accessories | $74.99 | 123 | ✅ |

All images are sourced from **Unsplash** with curated photos that visually match each product name.

---

## 📊 Dynamic Dataset Loading

The system supports dynamic dataset loading via the **Dataset Management** page:

### Server-Loaded Datasets

| Dataset | File | Products | How to Load |
|---------|------|----------|-------------|
| Retail Pricing | `backend/data_uploaded/retail_pricing.csv` | 15 products | Click "Load from Server" on Retail card |
| E-commerce Sales | `backend/data_uploaded/ecommerce_sales.csv` | 12 products | Click "Load from Server" on E-commerce card |

### Custom CSV Upload

You can upload your own CSV files with these supported column names:

| CSV Column(s) | Maps To | Required |
|---------------|---------|----------|
| `name`, `product_name` | Product name | ✅ |
| `sku`, `product_sku` | SKU | ✅ |
| `category`, `product_category` | Category | Optional |
| `current_price`, `price`, `selling_price` | Current price | ✅ |
| `base_price`, `original_price` | Base price | Optional |
| `cost_price`, `cost` | Cost price | Optional |
| `description` | Description | Optional |
| `stock_quantity`, `stock`, `quantity` | Stock count | Optional |
| `revenue` | Revenue | Optional |
| `image_url`, `image`, `product_image` | Image URL | Optional |

**Note**: Duplicate SKUs are automatically skipped during import.

---

## 🎨 Enterprise Color Scheme

The UI uses a professional **enterprise blue** primary palette (`#3b82f6`):

```css
/* Primary palette (Tailwind) */
primary: {
  50:  '#eff6ff',   /* Lightest */
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',   /* Primary */
  600: '#2563eb',   /* Buttons */
  700: '#1d4ed8',   /* Hover */
  800: '#1e40af',   /* Active */
  900: '#1e3a8a',
  950: '#172554',   /* Darkest */
}
```

### Design System
- **Cards**: White background, subtle borders, hover shadow elevation
- **Buttons**: Blue primary with subtle blue shadow, clean secondary/ghost variants
- **Forms**: Rounded inputs with blue focus ring, consistent spacing
- **Badges**: Color-coded (green = success, amber = warning, red = danger, blue = info)
- **Typography**: Inter for body text, JetBrains Mono for prices/code
- **Dark Mode**: Full dark theme with slate-based surfaces
- **Animations**: Subtle fade/slide/scale transitions on page load and interactions

---

## 🚩 Feature Flags

All future modules are preserved in the codebase but hidden from the UI. Controlled via `frontend/src/config/features.js`:

```javascript
// Milestone 1 — Active
DASHBOARD:     true    ✅
PRODUCTS:      true    ✅
PRICING:       true    ✅
DATASETS:      true    ✅
USERS:         true    ✅
SETTINGS:      true    ✅

// Future — Hidden (set to true to enable)
AI_PRICING:           false  ❌
FORECASTING:          false  ❌
REPORTS:              false  ❌
ANALYTICS:            false  ❌
REVENUE_INTELLIGENCE: false  ❌
RECOMMENDATIONS:      false  ❌
ADVANCED_ANALYTICS:   false  ❌
BUSINESS_INTELLIGENCE:false  ❌
PREDICTIVE_INSIGHTS:  false  ❌
```

---

## 🔧 Setup & Installation

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
source venv/Scripts/activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env if needed (SQLite is used by default)
```

### Frontend Setup

```bash
cd frontend
npm install
```

---

## 🚀 Running the Application

### Start Backend

```bash
cd backend
source venv/Scripts/activate
python -m uvicorn app.main:app --reload --port 8000

# The database auto-seeds on first startup.
# API available at: http://localhost:8000
# Swagger docs at: http://localhost:8000/docs
```

### Start Frontend

```bash
cd frontend
npm run dev

# Available at: http://localhost:5173
# Vite proxies /api and /loaders to backend at port 8000
```

---

## 🔐 API Credentials

On first startup, register a new admin user:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@pricepilot.io",
    "password": "admin123",
    "full_name": "System Admin",
    "role": "admin"
  }'
```

Then log in with these credentials on the login page:
- **Username**: `admin`
- **Password**: `admin123`

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI entry point
│   ├── config.py              # Pydantic settings
│   ├── database.py            # SQLAlchemy setup
│   ├── mongodb.py             # MongoDB connector
│   ├── dependencies.py        # Auth guards & dependencies
│   ├── utils.py               # Helpers (hashing, JWT)
│   ├── seed_data.py           # 16 sample products with images
│   ├── models/                # SQLAlchemy models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── pricing_history.py
│   │   ├── activity_log.py
│   │   ├── sales.py
│   │   └── recommendation.py
│   ├── schemas/               # Pydantic schemas
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── pricing.py
│   │   ├── dashboard.py
│   │   ├── sales.py
│   │   └── common.py
│   ├── services/              # Business logic
│   │   ├── auth.py
│   │   ├── product.py
│   │   ├── dashboard.py
│   │   ├── pricing_service.py
│   │   ├── activity_service.py
│   │   ├── sales_service.py
│   │   └── ml_service.py
│   ├── routers/               # API route handlers
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── dashboard.py
│   │   ├── pricing.py
│   │   ├── datasets.py
│   │   ├── users.py
│   │   ├── activity.py
│   │   ├── ai.py
│   │   ├── reports.py
│   │   └── sales.py
│   └── loaders/               # CSV data loaders
│       ├── base_loader.py
│       ├── retail_loader.py
│       └── ecommerce_loader.py
├── data_uploaded/             # Sample CSV datasets
│   ├── retail_pricing.csv     # 15 products
│   └── ecommerce_sales.csv    # 12 products
├── .env                       # Environment config
├── .env.example               # Template for .env
└── requirements.txt           # Python dependencies

frontend/
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                 # Routes & auth guards
│   ├── index.css               # Tailwind + design system
│   ├── api/
│   │   └── client.js           # Axios client & API wrappers
│   ├── config/
│   │   └── features.js         # Feature flags
│   ├── context/
│   │   ├── AuthContext.jsx      # Auth state management
│   │   └── ThemeContext.jsx     # Dark/light mode
│   ├── components/
│   │   ├── Layout.jsx           # App shell
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   └── Header.jsx          # Top header bar
│   ├── pages/
│   │   ├── Login.jsx           # Login page
│   │   ├── Register.jsx        # Registration page
│   │   ├── Dashboard.jsx       # Statistics dashboard
│   │   ├── Products.jsx        # Product CRUD with images
│   │   ├── Pricing.jsx         # Manual pricing
│   │   ├── Datasets.jsx        # Dataset management
│   │   ├── Users.jsx           # User management (admin)
│   │   └── Settings.jsx        # Profile & config
│   └── modules/future/         # Future module placeholders
│       ├── ai/
│       ├── forecasting/
│       ├── reports/
│       ├── analytics/
│       └── revenue/
├── tailwind.config.js          # Tailwind config with enterprise colors
├── vite.config.ts              # Vite config with API proxy
└── package.json                # Frontend dependencies
```

---

## 🧪 Verification

```bash
# Check backend health
curl http://localhost:8000/health

# Register admin user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@pricepilot.io","password":"admin123","full_name":"Admin","role":"admin"}'

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# List products (should return 16 seeded products)
curl -s http://localhost:8000/api/v1/products/ \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# View dashboard stats
curl -s http://localhost:8000/api/v1/dashboard/ \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Load dynamic retail dataset
curl -s -X POST http://localhost:8000/loaders/retail-pricing \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
```

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ for the Infosys 8-Week Virtual Internship</sub>
</div>
