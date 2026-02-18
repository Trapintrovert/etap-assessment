# Wallet System REST API

A NestJS REST API for a wallet system with user authentication, multi-currency wallets, Paystack payments, wallet-to-wallet transfers, admin approval for large transfers, and monthly payment summaries.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Running the Application](#running-the-application)
- [API Documentation (Swagger)](#api-documentation-swagger)
- [Testing](#testing)
- [API Overview](#api-overview)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Authentication**: Register and login with phone number + password (Nigerian format: +234... or 0...). JWT-based auth.
- **Wallets**: Create multiple wallets per user (one per currency, e.g. NGN, USD).
- **Credits (Paystack)**: Initialize Paystack payments to credit a wallet. Webhook handles charge.success and updates balance.
- **Transfers**: Wallet-to-wallet transfers. Amounts above a threshold require admin approval before execution.
- **Transactions**: List transactions by wallet, user, or reference. Admin can view all transactions.
- **Admin**: Approve/reject pending transfers. Monthly payment summaries (aggregate by type and currency).
- **Users**: Get profile, update, delete (JWT required).
- **Security**: CORS (configurable), Helmet security headers, global rate limiting (configurable; webhook excluded), consistent error responses.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement  | Version / Notes                                  |
|-------------|---------------------------------------------------|
| **Node.js** | 18.x or 20.x (LTS recommended)                    |
| **npm**     | 9.x or later (comes with Node.js)                 |
| **PostgreSQL** | 14+ (for database)                            |

To check versions:

```bash
node -v   # e.g. v20.10.0
npm -v    # e.g. 10.2.0
psql --version   # e.g. PostgreSQL 14.10
```

---

## Quick Start

If you want to run the project in under 5 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and edit (set DB_* and JWT_SECRET at minimum)
cp .env.example .env

# 3. Create a PostgreSQL database (e.g. name: wallet_db)

# 4. Run migrations
npm run migration:run

# 5. Seed an admin user
npm run seed:admin

# 6. Start the app
npm run start:dev
```

Then open **Swagger**: `http://localhost:{PORT}/api/docs` (default PORT is 8000; `.env.example` uses 3000)  
Register via `POST /api/auth/register`, then use the returned JWT in Swagger's "Authorize" to call protected endpoints.

---

## Detailed Setup

### 1. Clone or download the project

```bash
cd etap-assessment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the values. **At minimum** you must configure:

- **Database**: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- **JWT**: `JWT_SECRET` (use a strong secret in production)

See [Environment Variables](#environment-variables) for all options.

### 4. Create the PostgreSQL database

Create a database that matches your `DB_NAME`:

```bash
# Using psql
psql -U postgres -h localhost -p 5432
CREATE DATABASE wallet_db;
\q

# Or using createdb
createdb -U postgres -h localhost wallet_db
```

Replace `wallet_db` with your `DB_NAME` if different.

### 5. Run database migrations

This creates the tables (users, wallets, transactions, transfers):

```bash
npm run migration:run
```

If migrations fail (e.g. "relation already exists"), you can:

- Use **synchronize** for local dev: set `DB_SYNCHRONIZE=true` in `.env` and skip migrations, or
- Drop and recreate the database, then run migrations again.

### 6. Seed the admin user

Creates the first admin user for approving large transfers and viewing summaries:

```bash
npm run seed:admin
```

Default credentials (or set `ADMIN_PHONE` and `ADMIN_PASSWORD` in `.env`):

- Phone: `+2348000000000`
- Password: `Admin@123`

---

## Running the Application

### Development (with hot reload)

```bash
npm run start:dev
```

The API starts at `http://localhost:PORT` (default port: `8000`, or `PORT` from `.env`).

### Production

```bash
npm run build
npm run start:prod
```

### Other commands

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run start`| Start without watch            |
| `npm run build`| Build for production           |
| `npm run lint` | Run ESLint                     |

---

## API Documentation (Swagger)

Interactive API docs are available at:

**http://localhost:{PORT}/api/docs**

Default PORT is 8000; `.env.example` sets PORT=3000. Use the port from your `.env`.

### How to use Swagger

1. Open the link in your browser.
2. **Register**: `POST /api/auth/register` with `phone` and `password`.
3. Copy the `accessToken` from the response.
4. Click **Authorize**, paste the token (with or without `Bearer ` prefix), and authorize.
5. You can now call protected endpoints (wallets, transfers, etc.).

### Base URL

All API routes are prefixed with `/api`, e.g.:

- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Wallets: `GET /api/wallets`, `POST /api/wallets`, `GET /api/wallets/:id`
- Transfers: `POST /api/transfers`, `GET /api/transfers/pending`, etc.
- Transactions: `GET /api/transactions`, `GET /api/transactions/summaries/monthly?year=2025&month=1`
- Payments: `POST /api/payments/initialize`, `POST /api/payments/webhook` (called by Paystack)

---

## Testing

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

---

## API Overview

### Auth (no JWT required)

- `POST /api/auth/register` — Create account, returns user + JWT
- `POST /api/auth/login` — Login, returns user + JWT

### Wallets (JWT required)

- `POST /api/wallets` — Create wallet (currency: NGN, USD, etc.)
- `GET /api/wallets` — List user's wallets
- `GET /api/wallets/:id` — Get wallet by id (owner only)

### Transfers (JWT required)

- `POST /api/transfers` — Create transfer (immediate if under threshold; pending if over)
- Admin: `GET /api/transfers/pending`, `PATCH /api/transfers/:id/approve`, `PATCH /api/transfers/:id/reject`

### Transactions (JWT required)

- `GET /api/transactions` — All transactions (admin only)
- `GET /api/transactions/summaries/monthly?year=2025&month=1` — Monthly summary (admin only)
- `GET /api/transactions/reference/:reference` — By reference (owner only)
- `GET /api/transactions/user/:userId` — By user (own user only)
- `GET /api/transactions/wallet/:walletId` — By wallet (owner only)
- `GET /api/transactions/:id` — By id (owner only)

### Payments (JWT required except webhook)

- `POST /api/payments/initialize` — Start Paystack payment to credit a wallet
- `POST /api/payments/webhook` — Paystack webhook (uses `x-paystack-signature`)

### Users (JWT required)

- `POST /api/users` — Create user (public)
- `GET /api/users` — All users
- `GET /api/users/:id` — User profile
- `PUT /api/users/:id` — Update profile
- `DELETE /api/users/:id` — Delete user

---

## Environment Variables

| Variable                  | Required | Description                                                |
|---------------------------|----------|------------------------------------------------------------|
| `NODE_ENV`                | No       | `development` or `production` (default: development)       |
| `PORT`                    | No       | Server port (default: 8000)                                |
| `DB_HOST`                 | Yes      | PostgreSQL host (e.g. localhost)                           |
| `DB_PORT`                 | Yes      | PostgreSQL port (default: 5432)                            |
| `DB_USERNAME`             | Yes      | Database username                                          |
| `DB_PASSWORD`             | Yes      | Database password                                          |
| `DB_NAME`                 | Yes      | Database name                                              |
| `DB_SYNCHRONIZE`          | No       | `true` to auto-sync schema (dev only; avoid in production) |
| `JWT_SECRET`              | Yes      | Secret for signing JWT tokens                              |
| `JWT_EXPIRES_IN`          | No       | Token expiry (default: 7d)                                 |
| `PAYSTACK_API_KEY`        | No*      | Paystack API key (needed for payments/webhooks)           |
| `PAYSTACK_WEBHOOK_SECRET` | No       | Optional webhook secret                                    |
| `APP_URL`                 | No       | Base URL (for Paystack callback, default: http://localhost:3000) |
| `LARGE_TRANSFER_THRESHOLD`| No       | Amount (NGN) above which admin approval required (default: 1000000) |
| `ADMIN_PHONE`             | No       | Phone for seed admin (default: +2348000000000)             |
| `ADMIN_PASSWORD`          | No       | Password for seed admin (default: Admin@123)               |
| `CORS_ORIGIN`             | No       | CORS allowed origins: `*` or comma-separated list (default: `*`) |
| `THROTTLE_TTL`            | No       | Rate limit window in ms (default: 60000)                    |
| `THROTTLE_LIMIT`          | No       | Max requests per IP per window (default: 100)              |

\* If `PAYSTACK_API_KEY` is empty, payment init and webhook will fail. For local testing without Paystack, you can still use auth, wallets, transfers, and transactions.

---

## Troubleshooting

### App fails to start: "Missing required environment variables"

Ensure `.env` exists and contains at least: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`.

### Database connection refused

- Check PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Verify `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` in `.env`
- Ensure the database exists: `psql -U postgres -l`

### Migration fails: "relation already exists"

- If you used `DB_SYNCHRONIZE=true` before, the schema may already exist. Run `npm run migration:revert` to undo, or drop the database and recreate.
- For fresh dev: set `DB_SYNCHRONIZE=true`, drop DB, recreate, and start the app (skip migrations).

### 401 Unauthorized on protected endpoints

- Obtain a token via `POST /api/auth/login` or `POST /api/auth/register`
- In Swagger: Authorize with the token (or `Bearer <token>`)
- In curl: `-H "Authorization: Bearer <token>"`

### Paystack webhook returns 400 "Invalid webhook signature"

- Ensure `PAYSTACK_API_KEY` in `.env` matches your Paystack dashboard API key
- Webhook body must be raw; the app uses `rawBody` for verification

### Port 8000 already in use

Set a different port in `.env`: `PORT=3000`

### 429 Too Many Requests (rate limit)

By default the API allows 100 requests per minute per IP. Adjust `THROTTLE_TTL` and `THROTTLE_LIMIT` in `.env` if needed. The Paystack webhook endpoint is excluded from rate limiting.

---

## License

UNLICENSED (private project).
