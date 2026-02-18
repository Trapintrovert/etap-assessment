# Project improvements – task list

Use this list to fix gaps one by one. Check off items as you complete them.

---

## 1. User module authorization

- [x] **1.1** Restrict **GET /users** to admin only (e.g. add `@Roles(UserRole.ADMIN)` and ensure `RolesGuard` is applied).
- [x] **1.2** Restrict **GET /users/:id** so a user can only read their own profile, unless they are admin (self or admin).
- [x] **1.3** Restrict **PUT /users/:id** so only the same user or admin can update (compare `req.user.id` with `:id` or check role).
- [x] **1.4** Restrict **DELETE /users/:id** so only the same user or admin can delete (same check as 1.3).

---

## 2. Duplicate / overlapping user-creation APIs

- [x] **2.1** Decide semantics: is **POST /users** for admin-only user creation, or should it be removed in favor of **POST /auth/register**?
- [x] **2.2** If keeping both: make **POST /users** admin-only and document in README/Swagger (e.g. “Admin creates user without auto-login”). If removing: delete route and point docs to register only.

---

## 3. E2E tests

- [x] **3.1** In e2e test bootstrap, apply the same global prefix as production (e.g. `app.setGlobalPrefix('api')`) so **GET /api** is tested instead of **GET /**.
- [x] **3.2** Add at least one e2e flow for a critical path (e.g. register → login → create wallet, or auth + one protected route) using the real app module and test DB.

---

## 4. Transfer approval concurrency

- [x] **4.1** Prevent double execution when two admins approve the same pending transfer (e.g. use `SELECT ... FOR UPDATE` when loading the transfer for approval, or a unique constraint + status transition so each transfer can be completed only once).
- [x] **4.2** Add or adjust tests to cover concurrent approval behavior if possible.

---

## 5. Validation and error messages

- [x] **5.1** Review all DTOs used in API endpoints; ensure they have appropriate `class-validator` rules.
- [x] **5.2** Where useful, add custom `message` in validators so API responses are clear and user-friendly.

---

## 6. Logging and observability

- [ ] **6.1** Add structured logging (e.g. Nest `Logger`) for important business events (e.g. transfer created/approved, webhook processed, login success) without logging passwords or secrets.
- [ ] **6.2** Optionally add a simple request log (method + path + status) for 4xx/5xx if not already covered.

---

## 7. API documentation (Swagger)

- [ ] **7.1** In Swagger, document **POST /users** vs **POST /auth/register** (who should use which; e.g. “Admin-only user creation” vs “Self-registration”).
- [ ] **7.2** Add short descriptions for **GET /users** and **GET /users/:id** (e.g. “Admin only” or “Own profile or admin”) once authorization is implemented.

---

## 8. Security (webhook / payload logging)

- [ ] **8.1** Ensure the Paystack webhook handler (and any global logging) does not log full request body or payment metadata that could leak sensitive data.

---

## 9. User delete and data consistency

- [ ] **9.1** Confirm TypeORM relations for User (wallets, etc.) – either cascade on delete or explicitly delete/handle related entities so no orphaned or inconsistent data remains.
- [ ] **9.2** Document or add a test that verifies user deletion behavior (e.g. wallets/transfers are handled as intended).

---

## 10. Tests (coverage and confidence)

- [ ] **10.1** Add at least one e2e test that runs a full flow (e.g. register → login → create wallet) with the `api` prefix and test DB so deployment behavior is validated.
- [ ] **10.2** Optionally add unit tests for new authorization logic (e.g. user controller guards and self/admin checks).

---

## Summary

| # | Area                    | Priority | Notes                          |
|---|-------------------------|----------|--------------------------------|
| 1 | User authz              | High     | Security; do first             |
| 2 | Duplicate APIs          | Medium   | Clarity and consistency        |
| 3 | E2E tests               | High     | Confidence in deployment      |
| 4 | Transfer concurrency    | Medium   | Data correctness               |
| 5 | Validation              | Low      | UX and API clarity             |
| 6 | Logging                 | Medium   | Operations and audit           |
| 7 | Swagger docs            | Low      | After 1 & 2                    |
| 8 | Webhook logging         | Low      | Quick check                    |
| 9 | User delete             | Medium   | Data integrity                 |
|10 | Tests                   | High     | Overlaps with 3 & 10.1         |

Suggested order: **1** → **2** → **3 / 10** → **4** → **6** → **9** → **5** → **7** → **8**.
