# Roadmap

## Modules

### Node.js 100 (next)
The 100 most-asked Node.js interview questions, in two formats:

- **Concept questions** (~70): event loop phases, microtasks vs macrotasks, streams and backpressure, buffers, clustering vs worker threads, error handling, memory leaks, security (XSS, CSRF, injection, rate limiting), JWT vs sessions, Express middleware, testing. Each has a short model answer and an "explain it out loud" checklist. Progress: *Studied → Can explain → Interview-ready*, same as System Design.
- **Coding tasks** (~30): implement `promisify`, a concurrency-limited `Promise.all`, an event emitter, a debounce/throttle, an LRU cache, a retry with backoff, a stream transform, an Express middleware.

**How users solve the coding tasks in the browser:**
- Run the user's code in a **Web Worker** created from a Blob (separate thread, no DOM access), with a timeout that terminates the worker if it hangs.
- Each task ships with hidden test cases; the worker runs them and posts back pass/fail per test.
- Browser JS isn't Node, so pick tasks that don't need `fs`/`net`, or provide small in-browser stand-ins (e.g. a fake `EventEmitter` base, a mocked `setTimeout`).
- Later, for tasks that need real Node APIs, move execution to a server-side runner in a locked-down container (no network, CPU/memory/time limits). See the "Online Judge" HLD question for the design.

### SQL: run queries in the browser
The SQL module is live with write-then-reveal practice (60 query questions, 72 concepts). Next step: run the student's query against real data in the browser.

- Use **sql.js** (SQLite compiled to WebAssembly) to run queries client-side. Each question seeds a small schema (employees, orders, customers, …).
- **Checking answers:** run the user's query and the reference query on the same data, then compare result sets (ignore row order unless the question asks for `ORDER BY`).
- Topics: filtering, joins, `GROUP BY`/`HAVING`, subqueries, window functions (`ROW_NUMBER`, `RANK`, `LAG`), CTEs, NULL handling, "second highest salary"-style classics, plus theory questions on indexes, transactions, isolation levels and query plans.
- SQLite and MySQL differ in a few functions (dates, string functions); keep questions to the shared subset or note the MySQL equivalent in the answer.

### Later ideas
- MongoDB / Mongoose module, JavaScript fundamentals module, React interview module.
- Company-tagged practice lists.
- Mock interview timer mode.
- Public profile / shareable progress card (good for the "user shares link → others sign up" growth loop).

## Subscriptions

### Model
- **DSA 200 is free** and needs no payment: it's the entry point users share.
- Every other module is **₹200 one-time** (lifetime access to that module). Bundles can come later (e.g. all modules for ₹499).
- Keep `VITE_ENABLE_PAYWALL=false` until checkout works end to end.

### Important: the paywall must be enforced on the server
Right now all question content is bundled into the frontend JavaScript. A frontend-only lock is a UX hint; anyone can read the bundle. Before charging money:

1. Move paid module content (System Design, Node.js, MySQL questions and answers) into the backend database.
2. Serve it from endpoints like `GET /api/modules/:moduleId/content` that return `403` unless the user has the entitlement.
3. Keep only free content (DSA 200) and module metadata (`config/modules.js`) in the frontend.

### Payment flow (Razorpay)
1. User clicks **Unlock for ₹200** → frontend calls `POST /api/billing/orders { moduleId }`.
2. Backend creates a Razorpay order (amount from the server-side price list, never from the client) and returns `{ orderId, amount, keyId }`.
3. Frontend opens Razorpay Checkout with that order.
4. On success, the frontend sends `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `POST /api/billing/verify`. The backend verifies the signature with the key secret.
5. **Also** handle Razorpay's `payment.captured` webhook (verify the webhook signature) and grant the entitlement there too; this covers users who close the tab before step 4. Make granting idempotent.
6. Backend stores `Entitlement { user, moduleId, paymentId, grantedAt }` and returns entitlements in `GET /api/auth/me` as `user.entitlements: ["system-design", …]`. The frontend `AccessProvider` already reads this field.

### Backend additions needed
- `Entitlement` and `Payment` collections.
- `/api/billing/orders`, `/api/billing/verify`, `/api/billing/webhook`.
- `/api/modules/:moduleId/content` with an entitlement check.
- Admin view of payments and a way to grant access manually (for support).
