# UniForm POS — Complete Setup Guide
# School Uniform Management System — Kenya

## System Requirements

- **Node.js** 20+ (LTS)
- **PostgreSQL** 15+
- **Git**
- **Windows 10/11** (for shop desktop)
- **Internet** (for initial setup and cloud sync)

---

## PHASE 1: Database Setup

### Option A — Local PostgreSQL (shop computer only)
```bash
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Then create database:
psql -U postgres
CREATE DATABASE uniformpos_db;
CREATE USER uniformpos WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE uniformpos_db TO uniformpos;
\q
```

### Option B — Cloud PostgreSQL (recommended — enables remote monitoring)
Use one of these free/cheap options:
- **Neon** (https://neon.tech) — free PostgreSQL
- **Supabase** (https://supabase.com) — free tier PostgreSQL
- **Railway** (https://railway.app) — easy deployment

Get your `DATABASE_URL` from the provider.

---

## PHASE 2: API Server Setup

```bash
# 1. Clone and enter project
cd uniform-pos/packages/api

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your database URL and secrets

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate deploy
# OR for development:
npx prisma migrate dev --name init

# 6. Seed sample data
npx ts-node prisma/seed.ts

# 7. Start the API
npm run dev
# API runs at http://localhost:4000
# Swagger docs at http://localhost:4000/api/docs
```

---

## PHASE 3: Desktop App Setup (Shop Computer)

```bash
cd uniform-pos/packages/desktop

# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000/api/v1

# 3. Run in development
npm run electron:dev

# 4. Build Windows installer
npm run build
# Output: release/UniForm POS Setup 1.0.0.exe
```

---

## PHASE 4: Cloud Deployment (Remote Monitoring)

### Deploy API to Railway
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway init
railway add postgresql
railway up

# 3. Set environment variables in Railway dashboard
# DATABASE_URL is auto-set by Railway PostgreSQL addon
# Set JWT_SECRET, MPESA_*, WEB_ADMIN_URL
```

### Deploy API to Render
```bash
# 1. Go to https://render.com
# 2. New > Web Service > Connect GitHub repo
# 3. Build command: cd packages/api && npm install && npx prisma generate && npx prisma migrate deploy
# 4. Start command: cd packages/api && npm start
# 5. Add environment variables in Render dashboard
```

---

## PHASE 5: Desktop App connecting to Cloud

Edit `packages/desktop/.env`:
```
VITE_API_URL=https://your-api-on-railway.up.railway.app/api/v1
```

Rebuild the desktop app:
```bash
npm run build
```

The shop will:
- Work fully offline using local SQLite (if configured)
- Sync to cloud when internet is available
- Show "Offline mode" indicator when disconnected

---

## Login Credentials (after seeding)

| Role | Email | Password | PIN |
|------|-------|----------|-----|
| Admin | admin@uniformpos.co.ke | Admin@1234 | 1234 |
| Manager | manager@uniformpos.co.ke | Manager@1234 | 2345 |
| Cashier | cashier@uniformpos.co.ke | Cashier@1234 | 3456 |
| Storekeeper | store@uniformpos.co.ke | Storekeeper@1234 | 4567 |
| Embroidery Op | embroidery@uniformpos.co.ke | Operator@1234 | 5678 |

**Change all passwords immediately after first login!**

---

## M-Pesa Setup (Safaricom Daraja)

1. Register at https://developer.safaricom.co.ke
2. Create an app and get Consumer Key + Secret
3. For sandbox testing: use sandbox credentials
4. For production: apply for Go-Live
5. Set `MPESA_CALLBACK_URL` to your API's public URL
   - e.g. `https://your-api.railway.app`
6. The callback endpoint is: `POST /api/v1/sales/mpesa-callback`

---

## Backup Strategy

### Automatic daily backup (add to cron):
```bash
# Run daily at 11 PM
0 23 * * * pg_dump $DATABASE_URL > /backups/uniformpos_$(date +%Y%m%d).sql

# Keep last 30 days
find /backups -name "uniformpos_*.sql" -mtime +30 -delete
```

### Manual backup:
```bash
pg_dump postgresql://uniformpos:password@localhost/uniformpos_db > backup.sql

# Restore:
psql postgresql://uniformpos:password@localhost/uniformpos_db < backup.sql
```

---

## Receipt Printer Setup

1. Connect USB thermal printer (80mm, ESC/POS compatible)
2. Install printer driver on Windows
3. Set as default printer
4. The app prints using the browser/Electron print dialog
5. Tested with: Epson TM-T20, Xprinter XP-80C, GOOJPRT PT-210

---

## File Structure

```
uniform-pos/
├── packages/
│   ├── api/                     ← NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma    ← Database schema
│   │   │   └── seed.ts          ← Sample data
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/        ← JWT login, refresh tokens
│   │       │   ├── users/       ← Staff management
│   │       │   ├── products/    ← Product + variant CRUD
│   │       │   ├── inventory/   ← Stock movements, alerts
│   │       │   ├── sales/       ← POS, M-Pesa, returns
│   │       │   ├── embroidery/  ← Job tracking
│   │       │   ├── customers/   ← CRM
│   │       │   ├── reports/     ← Analytics
│   │       │   └── sync/        ← Offline sync
│   │       └── common/
│   │           ├── guards/      ← JWT + RBAC guards
│   │           ├── filters/     ← Error handling
│   │           └── interceptors/← Response transform
│   │
│   ├── desktop/                 ← Electron + React app
│   │   ├── electron/
│   │   │   ├── main.js          ← Electron main process
│   │   │   └── preload.js       ← IPC bridge
│   │   └── src/
│   │       ├── pages/           ← All UI pages
│   │       ├── components/      ← Reusable components
│   │       ├── store/           ← Zustand state management
│   │       └── lib/
│   │           ├── api.ts       ← Axios client + auth
│   │           └── utils.tsx    ← Formatting, receipt HTML
│   │
│   └── shared/                  ← Shared types (future)
│
├── scripts/                     ← Deployment scripts
└── docs/                        ← Documentation
```

---

## API Endpoints Reference

```
AUTH
  POST /api/v1/auth/login          ← Email + password login
  POST /api/v1/auth/pin-login      ← PIN-based quick login
  POST /api/v1/auth/refresh        ← Refresh access token
  POST /api/v1/auth/logout         ← Revoke tokens
  GET  /api/v1/auth/me             ← Get current user

PRODUCTS
  GET  /api/v1/products            ← List (search, filter, paginate)
  POST /api/v1/products            ← Create product
  GET  /api/v1/products/:id        ← Get product with variants
  PUT  /api/v1/products/:id        ← Update product
  GET  /api/v1/products/barcode/:b ← Lookup by barcode
  GET  /api/v1/products/low-stock  ← Low stock items
  GET  /api/v1/products/schools    ← List schools
  GET  /api/v1/products/categories ← List categories

INVENTORY
  POST /api/v1/inventory/adjust    ← Stock adjustment
  POST /api/v1/inventory/bulk-in   ← Bulk stock receive
  GET  /api/v1/inventory/transactions ← Movement history
  GET  /api/v1/inventory/alerts    ← Low stock alerts
  GET  /api/v1/inventory/summary   ← Stock summary stats

SALES
  POST /api/v1/sales/draft         ← Create draft sale
  POST /api/v1/sales/:id/complete  ← Complete sale + deduct stock
  POST /api/v1/sales/:id/cancel    ← Cancel draft
  POST /api/v1/sales/return        ← Process return/refund
  GET  /api/v1/sales               ← List sales (filter, paginate)
  GET  /api/v1/sales/:id           ← Sale detail + items
  GET  /api/v1/sales/receipt/:no   ← Lookup by receipt number
  GET  /api/v1/sales/daily-summary ← Today's totals
  POST /api/v1/sales/mpesa/initiate ← STK push
  POST /api/v1/sales/mpesa-callback ← Safaricom webhook

EMBROIDERY
  POST /api/v1/embroidery          ← Create job
  GET  /api/v1/embroidery          ← List jobs (filter, paginate)
  GET  /api/v1/embroidery/stats    ← Job counts by status
  GET  /api/v1/embroidery/:id      ← Job detail
  PUT  /api/v1/embroidery/:id      ← Update job
  PATCH /api/v1/embroidery/:id/status   ← Change status
  PATCH /api/v1/embroidery/:id/assign   ← Assign operator

CUSTOMERS
  POST /api/v1/customers           ← Create customer
  GET  /api/v1/customers           ← List customers
  GET  /api/v1/customers/:id       ← Customer + history
  PUT  /api/v1/customers/:id       ← Update customer
  POST /api/v1/customers/:id/credit ← Adjust credit balance

REPORTS
  GET  /api/v1/reports/dashboard   ← Live dashboard data
  GET  /api/v1/reports/sales       ← Sales report (date range)
  GET  /api/v1/reports/inventory   ← Inventory valuation
  GET  /api/v1/reports/embroidery  ← Embroidery analytics
  GET  /api/v1/reports/customers/top ← Top customers

SYNC
  POST /api/v1/sync/push           ← Push offline operations
  GET  /api/v1/sync/pull           ← Pull server changes
```

---

## Role Permissions Matrix

| Feature | Admin | Manager | Cashier | Storekeeper | Emb. Operator |
|---------|-------|---------|---------|-------------|---------------|
| POS / Sales | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Sales History | ✅ | ✅ | ✅ | ❌ | ❌ |
| Process Returns | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Inventory | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Stock | ✅ | ✅ | ❌ | ✅ | ❌ |
| Add/Edit Products | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Embroidery | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create Emb. Jobs | ✅ | ✅ | ✅ | ❌ | ✅ |
| Update Emb. Status | ✅ | ✅ | ❌ | ❌ | ✅ |
| View Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Customers | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Staff | ✅ | ❌ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Troubleshooting

**"Cannot connect to API"**
- Check API is running: `curl http://localhost:4000/api/v1/auth/me`
- Check VITE_API_URL in desktop .env
- Check firewall allows port 4000

**"Prisma migration failed"**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Run: `npx prisma db push` (bypasses migrations for dev)

**"M-Pesa STK push not working"**
- Verify MPESA_CONSUMER_KEY and SECRET are correct
- For sandbox, use test phone: 254708374149
- Check MPESA_CALLBACK_URL is publicly accessible (use ngrok for testing)

**Receipt not printing**
- Set the thermal printer as default Windows printer
- Check it's 80mm paper, ESC/POS compatible
- Try print from browser first: Ctrl+P

---
Built for Kenyan school uniform businesses.
Prices in KES · M-Pesa integrated · Works offline
