# Wallet System REST API — Implementation Task Plan

A phased task plan for building a NestJS REST API that mocks a basic wallet system with Postgres (TypeORM), Paystack integration, user auth, wallets, credits, transfers, admin approval, and reporting.

---

## Technical Stack

| Component   | Technology        |
|------------|-------------------|
| Framework  | NestJS            |
| Database   | PostgreSQL        |
| ORM        | TypeORM           |
| Payments   | Paystack          |
| Auth       | JWT (phone + password) |
| Docs       | Swagger/OpenAPI   |
| Testing    | Jest              |

---

## Phase 1: Project Foundation & Infrastructure

### 1.1 Dependencies & Configuration

- [x] **1.1.1** Install and configure TypeORM and PostgreSQL
  - Add `@nestjs/typeorm`, `typeorm`, `pg`
  - Create `TypeOrmModule` config in `AppModule` (use env vars for connection)
  - Add database URL to `.env` and document in README

- [x] **1.1.2** Install and configure Paystack
  - Add HTTP client (e.g. `axios` or `@nestjs/axios`)
  - Create Paystack module with config (secret key from env)
  - Add `PAYSTACK_API_KEY` to `.env`

- [x] **1.1.3** Install auth and validation packages
  - Add `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` (or `@nestjs/bcrypt`)
  - Add `class-validator`, `class-transformer` for DTOs
  - Add `@nestjs/config` for env validation

- [x] **1.1.4** Install and configure Swagger
  - Add `@nestjs/swagger`
  - Bootstrap Swagger in `main.ts` (title, version, bearer auth)
  - Document global prefixes and tags

- [x] **1.1.5** Environment and validation
  - Create `.env.example` with all required keys (DB, JWT secret, Paystack, etc.)
  - Use `ConfigModule` with validation schema so app fails fast on missing/invalid env

---

### 1.2 Database Schema Design

- [x] **1.2.1** Design and create `User` entity
  - Fields: `id`, `phone` (unique), `passwordHash`, `role` (enum: `USER`, `ADMIN`), `createdAt`, `updatedAt`
  - Index on `phone` for login lookups

- [x] **1.2.2** Design and create `Wallet` entity
  - Fields: `id`, `userId` (FK), `currency` (e.g. string or enum), `balance`, `createdAt`, `updatedAt`
  - Unique constraint on `(userId, currency)` so one wallet per currency per user

- [x] **1.2.3** Design and create `Transaction` (or `Payment`) entity
  - Fields: `id`, `type` (e.g. `CREDIT`, `TRANSFER_IN`, `TRANSFER_OUT`), `walletId`, `amount`, `reference` (Paystack ref where applicable), `metadata` (JSON), `status`, `createdAt`
  - Optional: `fromWalletId`, `toWalletId` for transfers; or separate `Transfer` entity with two transaction records

- [x] **1.2.4** Design transfer-approval flow
  - Add `TransferRequest` or extend transaction with: `status` (e.g. `PENDING_APPROVAL`, `APPROVED`, `REJECTED`), `approvedBy` (admin user id), `approvedAt`
  - Ensure only transfers above N1,000,000 require approval

- [x] **1.2.5** Run and version migrations
  - Configure TypeORM migrations (or `synchronize: false` with explicit migrations)
  - Add migration scripts to `package.json` and document in README

---

## Phase 2: User & Authentication

### 2.1 User Module

- [x] **2.1.1** Create `User` module, service, controller
  - `UsersService`: create user (hash password), find by id, find by phone
  - `UsersController`: minimal endpoints if needed (e.g. get profile); avoid exposing password hashes

- [x] **2.1.2** Implement phone uniqueness
  - Validate phone format (e.g. Nigerian format) in DTO
  - On registration, ensure phone is unique; return clear error if duplicate

- [x] **2.1.3** Seed or create first ADMIN user
  - Script or migration to create at least one ADMIN user for testing approval flow

### 2.2 Auth Module

- [x] **2.2.1** Implement registration
  - `POST /auth/register`: body `{ phone, password }`, validate, hash password, create user with role `USER`, return user (no password) and optionally token

- [x] **2.2.2** Implement login
  - `POST /auth/login`: body `{ phone, password }`, validate credentials, return JWT (and optionally refresh token if required)

- [x] **2.2.3** JWT strategy and guards
  - Passport JWT strategy that loads user by id from token
  - `AuthGuard` and optional `@Roles()` decorator for ADMIN-only routes
  - Attach `user` to request for use in controllers

- [x] **2.2.4** Swagger for auth
  - Document register and login request/response DTOs
  - Document bearer auth and apply to protected routes

---

## Phase 3: Wallets

### 3.1 Wallet CRUD & Rules

- [x] **3.1.1** Create `Wallet` module, service, controller
  - `WalletsService`: create wallet (userId from token, currency in body), list wallets for user, get one wallet by id (ensure ownership)

- [x] **3.1.2** Create wallet endpoint
  - `POST /wallets`: body `{ currency }`, ensure currency is unique per user (one wallet per currency per user)

- [x] **3.1.3** List and get wallet(s)
  - `GET /wallets`: return all wallets for authenticated user
  - `GET /wallets/:id`: return single wallet if owned by user

- [x] **3.1.4** Swagger for wallets
  - DTOs for create and response; document 409 when currency already exists for user

---

## Phase 4: Wallet Credit (Paystack)

### 4.1 Paystack Integration

- [x] **4.1.1** Initialize Paystack transaction
  - Service method: create Paystack transaction (amount, email or reference, callback URL) using Paystack API
  - Return authorization URL or transaction reference to frontend for payment

- [x] **4.1.2** Webhook for successful payment
  - `POST /payments/webhook` (or similar): verify Paystack signature, handle `charge.success`, credit the correct wallet, create `Transaction` record with type `CREDIT`
  - Idempotency: use Paystack reference to avoid double-crediting

- [ ] **4.1.3** Optional: callback endpoint for redirect
  - If using redirect flow: verify transaction and credit wallet, then redirect user to success/failure page

- [x] **4.1.4** Swagger and security
  - Document webhook (and note it’s called by Paystack; auth may be signature-only)
  - Document any “initialize payment” endpoint for clients

---

## Phase 5: Wallet-to-Wallet Transfers

### 5.1 Transfer Logic

- [x] **5.1.1** Transfer service logic
  - Debit source wallet, credit destination wallet (same or different user) in a transaction
  - Validate: sufficient balance, source and destination wallets exist, source wallet belongs to current user
  - If amount > N1,000,000: create transfer in `PENDING_APPROVAL` state and do not move money until approved

- [x] **5.1.2** Transfer endpoint (user)
  - `POST /transfers`: body e.g. `{ fromWalletId, toWalletId, amount }` (or toWalletId + currency); apply business rules and either execute or create pending request

- [x] **5.1.3** Response and idempotency
  - Return clear response: executed vs pending approval; include transfer/request id for pending ones

### 5.2 Admin Approval for Large Transfers

- [x] **5.2.1** List pending transfers (admin only)
  - `GET /admin/transfers/pending`: return all transfers over N1,000,000 with status `PENDING_APPROVAL`

- [x] **5.2.2** Approve or reject (admin only)
  - `PATCH /admin/transfers/:id/approve` and `PATCH /admin/transfers/:id/reject`: update status and, on approve, run the actual debit/credit in a transaction

- [x] **5.2.3** Swagger for transfers
  - Document user transfer endpoint and admin approval endpoints; mark admin routes with role requirement

---

## Phase 6: Admin Monthly Payment Summaries

- [x] **6.1** Define “payment” and scope
  - Scope: all transactions (credits + transfers) in the system.

- [x] **6.2** Monthly summary endpoint (admin only)
  - `GET /transactions/summaries/monthly?year=2025&month=1`: aggregate all transactions (total count, total amount, breakdown by type and currency).

- [x] **6.3** Query implementation
  - TypeORM QueryBuilder filtering by `createdAt`; group by `type` and `currency`; return totals and breakdowns.

- [x] **6.4** Swagger for admin summaries
  - ApiQuery for year/month; ApiResponse with MonthlySummaryResponseDto.

---

## Phase 7: Unit Tests

- [x] **7.1** Auth module
  - Register: success, duplicate phone, invalid input
  - Login: success, wrong password, user not found
  - JWT strategy: valid token returns user; invalid/missing token fails

- [x] **7.2** User module
  - Find by phone, find by id; ensure no password in returned objects where applicable

- [x] **7.3** Wallet module
  - Create wallet: success, duplicate currency for same user
  - List/get: only owner can see wallets

- [x] **7.4** Transfer logic
  - Transfer under limit: success, balance updated
  - Transfer over limit: pending approval, no balance change until approved
  - Insufficient balance: error
  - Admin approve: balance updated; reject: no change

- [x] **7.5** Credit (Paystack) flow
  - Webhook: valid signature + charge.success credits wallet and creates transaction; invalid signature or duplicate reference handled

- [x] **7.6** Admin summary
  - Query returns correct totals for given month; filters by date correctly

- [x] **7.7** Coverage and CI
  - Run `npm run test:cov`; aim for high coverage on services and critical paths
  - Optionally add test script to CI (e.g. GitHub Actions)

---

## Phase 8: Swagger & Documentation

- [x] **8.1** Global Swagger setup
  - Title, description, version; Bearer JWT security scheme; tags for Auth, Wallets, Transfers, Payments, Admin

- [x] **8.2** Document all endpoints
  - Auth: register, login
  - Wallets: create, list, get one
  - Payments: initialize (if exposed), webhook (description only or minimal)
  - Transfers: create transfer
  - Admin: list pending transfers, approve, reject; monthly summary

- [x] **8.3** DTOs and examples
  - Use `@ApiProperty()` on all DTOs; add example values and descriptions where helpful
  - Document error responses (400, 401, 403, 404, 409) where applicable

- [x] **8.4** README
  - How to run (install, env, DB migrate, start)
  - Link to Swagger UI (e.g. `/api` or `/docs`)
  - How to run tests; brief overview of features (auth, wallets, credit, transfer, admin approval, monthly summary)

---

## Phase 9: Polish & Security

- [x] **9.1** Validation and error handling
  - All DTOs validated with `class-validator`; global validation pipe
  - Consistent error format via `HttpExceptionFilter`; appropriate HTTP status codes

- [x] **9.2** Security checks
  - No raw passwords in responses (User `@Exclude()` passwordHash); wallet ownership enforced
  - CORS configurable via `CORS_ORIGIN`; Helmet for security headers; global rate limiting (`@nestjs/throttler`); webhook excluded from throttle

- [ ] **9.3** E2E tests (optional)
  - At least one E2E flow: register → login → create wallet → credit (mock webhook) → transfer; admin approve large transfer; admin get monthly summary

---

## Suggested Implementation Order

1. **Phase 1** — Dependencies, DB, env, migrations, Swagger bootstrap  
2. **Phase 2** — Users and auth (register, login, JWT, guards)  
3. **Phase 3** — Wallets (create, list, get; unique currency per user)  
4. **Phase 4** — Paystack (initialize + webhook, credit wallet, transactions)  
5. **Phase 5** — Transfers (under/over limit, pending approval)  
6. **Phase 5.2** — Admin approval endpoints  
7. **Phase 6** — Admin monthly summaries  
8. **Phase 7** — Unit tests (can be written incrementally per module)  
9. **Phase 8** — Swagger completion and README  
10. **Phase 9** — Validation, security, optional E2E  

---

## Checklist Summary (High Level)

| # | Requirement | Phase / Tasks |
|---|-------------|----------------|
| 1 | User account + auth (phone + password) | Phase 2 |
| 2 | User can create many wallets (unique currency each) | Phase 3 |
| 3 | User can credit wallets | Phase 4 (Paystack) |
| 4 | User can transfer wallet-to-wallet | Phase 5 |
| 5 | Transfers > N1,000,000 require ADMIN approval | Phase 5.2 |
| 6 | Admin monthly payment summaries | Phase 6 |
| 7 | Unit tests | Phase 7 |
| 8 | Comprehensive Swagger documentation | Phase 8 |

---

*Document version: 1.0 — use this as a living plan and tick off tasks as they are completed.*
