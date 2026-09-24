// Concept questions: Data modeling, Constraints, Pagination & large data, Aggregation & reporting,
// Performance debugging.
export default {
  // ---------- Data modeling ----------
  "sql-c-table-design": {
    scenario: "What do you think about when designing a new table? Which data type do you use for money, and why?",
    answer: {
      summary:
        "Choose the smallest correct types, a sensible primary key, NOT NULL by default, and timestamps. Store money as DECIMAL (or integer paise), never FLOAT or DOUBLE, because binary floating point can't represent most decimal fractions exactly.",
      points: [
        "INT vs BIGINT: BIGINT for ids that may exceed ~2.1 billion; UNSIGNED when negatives are impossible.",
        "VARCHAR(n) sized to real data; TEXT for long free text (not indexable fully).",
        "DECIMAL(12,2) for amounts: 0.1 + 0.2 = 0.30000000000000004 in FLOAT, and rounding errors add up across invoices.",
        "DATETIME vs TIMESTAMP: TIMESTAMP converts to/from the session time zone and ends in 2038; many teams store DATETIME in UTC.",
        "Primary key: AUTO_INCREMENT BIGINT is simple and compact; use UUIDs (as BINARY(16), time-ordered) when ids are generated outside the DB or must not be guessable.",
        "utf8mb4 character set, created_at/updated_at columns, and indexes for known query patterns.",
      ],
      code: `CREATE TABLE invoices (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'INR',
  status      ENUM('draft','sent','paid','void') NOT NULL DEFAULT 'draft',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_customer_created (customer_id, created_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) DEFAULT CHARSET = utf8mb4;`,
    },
  },

  "sql-c-normalization": {
    scenario: "Explain 1NF, 2NF and 3NF with an example. Normalise an orders table that repeats customer and product details in every row.",
    answer: {
      summary:
        "Normalisation stores each fact once so updates can't leave contradictory copies. 1NF: atomic values, no repeating groups. 2NF: every non-key column depends on the whole key. 3NF: non-key columns depend only on the key, not on other non-key columns.",
      points: [
        "1NF violation: a phone_numbers column holding '98..., 99...'. Fix with a separate phones table.",
        "2NF violation: order_items(order_id, product_id, quantity, product_name); product_name depends only on product_id, part of the key. Move it to products.",
        "3NF violation: orders(id, customer_id, customer_city); city depends on customer_id, not the order. Move it to customers.",
        "Result: customers, products, orders(customer_id), order_items(order_id, product_id, quantity, unit_price).",
        "Update anomaly avoided: a customer's address changes in one row, not in 10,000 orders.",
        "unit_price stays on order_items on purpose: it's the price at purchase time, a different fact from the current product price.",
      ],
    },
  },

  "sql-c-denormalization": {
    scenario: "When would you deliberately denormalize? How do you keep a denormalized like_count correct under heavy concurrent likes?",
    answer: {
      summary:
        "Denormalize when reads are far more frequent than writes and the normalized query (many joins or big aggregates) is too slow. You trade write complexity and some risk of drift for fast reads.",
      points: [
        "Common forms: counters (posts.like_count), cached aggregates (daily summary tables), copied fields for display, and snapshots (price at purchase).",
        "Keep counters atomic: UPDATE posts SET like_count = like_count + 1 WHERE id = ?, in the same transaction as inserting the like row.",
        "UNIQUE(user_id, post_id) on likes prevents double-counting.",
        "At very high write rates the counter row becomes a hot spot: batch increments (Redis, then flush) or sharded counter rows summed on read.",
        "Run a periodic reconciliation job that recomputes counts from the source rows and fixes drift.",
      ],
    },
  },

  "sql-c-model-ecommerce": {
    scenario: "Design the core MySQL schema for an e-commerce site: users, addresses, products, orders, order items and payments. Explain your key decisions.",
    answer: {
      summary:
        "Normalize the core entities, snapshot anything that must not change after purchase (prices, shipping address), model order status as a controlled state, and index around the main access paths.",
      points: [
        "users(id, email UNIQUE, …); addresses(id, user_id, …); products(id, sku UNIQUE, name, price, stock); categories and a product_categories junction if many-to-many.",
        "orders(id, user_id, status, total, shipping_address_snapshot JSON or copied columns, created_at).",
        "order_items(order_id, product_id, quantity, unit_price): unit_price at time of purchase.",
        "payments(id, order_id, provider, provider_ref UNIQUE, amount, status): several attempts per order are normal.",
        "Status transitions enforced with conditional updates (UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'paid').",
        "Indexes: orders(user_id, created_at) for 'my orders', payments(order_id), order_items(order_id).",
        "Variants follow-up: product_variants(id, product_id, size, colour, sku, price, stock) and order_items reference the variant.",
      ],
    },
  },

  "sql-c-soft-delete-audit": {
    scenario: "What are the trade-offs of soft deletes? How would you keep an audit trail of changes?",
    answer: {
      summary:
        "Soft delete marks rows deleted (deleted_at) instead of removing them, so data can be restored and history kept. The cost is that every query must exclude deleted rows, unique constraints get harder, and tables keep growing.",
      points: [
        "Forgetting WHERE deleted_at IS NULL in one query leaks 'deleted' data; ORMs help (Sequelize paranoid: true).",
        "UNIQUE(email) blocks re-registering after soft delete. Fix: a generated column active_email = IF(deleted_at IS NULL, email, NULL) with a UNIQUE index (NULLs don't collide).",
        "Audit trail: a history table (entity, entity_id, changed_by, changed_at, old/new values as JSON), written by the application or triggers.",
        "Privacy laws may require real deletion or anonymisation; soft delete alone isn't compliance.",
        "Archive old soft-deleted rows to keep hot tables small.",
      ],
    },
  },

  "sql-c-json-columns": {
    scenario: "When is a JSON column a good idea in MySQL, and when is it a mistake? Design product attributes that vary by category.",
    answer: {
      summary:
        "JSON columns suit flexible, sparse data that's mostly read as a whole: product specs, settings, raw payloads. They're a mistake for core relational data you filter, join or constrain, because JSON contents get no types, foreign keys or plain indexes.",
      points: [
        "Filter on a JSON field efficiently by adding a generated column (or MySQL 8 functional index) on the extracted value.",
        "Multi-valued indexes (MySQL 8.0.17+) index arrays inside JSON for MEMBER OF queries.",
        "Validation must happen in the app (or CHECK with JSON_SCHEMA_VALID).",
        "Product attributes: common, filterable fields (brand, price) as real columns; long-tail specs as JSON; frequently filtered attributes promoted to generated indexed columns.",
        "EAV tables (entity, attribute, value) are the older alternative; flexible but painful to query.",
      ],
      code: `ALTER TABLE products
  ADD COLUMN ram_gb INT GENERATED ALWAYS AS (attributes->>'$.ram_gb') STORED,
  ADD INDEX idx_ram (ram_gb);`,
    },
  },

  // ---------- Constraints & data integrity ----------
  "sql-c-constraints": {
    scenario: "Which constraints does MySQL support, and what does each protect against?",
    answer: {
      summary:
        "PRIMARY KEY (unique row identity), UNIQUE (no duplicate values), NOT NULL (value required), CHECK (rule on column values), FOREIGN KEY (reference must exist) and DEFAULT (value when none given). They enforce rules no matter who writes: app, script, or admin.",
      points: [
        "UNIQUE allows multiple NULLs in MySQL, because NULL isn't equal to NULL.",
        "CHECK constraints are only enforced from MySQL 8.0.16; before that they were parsed and silently ignored.",
        "Foreign keys require InnoDB, matching types and signedness, and an index on the referencing column.",
        "Strict SQL mode (STRICT_TRANS_TABLES) makes invalid or too-long values fail instead of being silently truncated or zeroed.",
      ],
      code: `CREATE TABLE bookings (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  room_id    INT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  CONSTRAINT chk_dates CHECK (end_date > start_date),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);`,
    },
  },

  "sql-c-cascade-rules": {
    scenario: "Explain ON DELETE CASCADE, SET NULL and RESTRICT. Deleting a user must keep their orders for accounting. What do you use?",
    answer: {
      summary:
        "These actions decide what happens to child rows when the referenced parent is deleted or its key updated. CASCADE deletes the children too, SET NULL clears their reference, and RESTRICT/NO ACTION refuses to delete a parent that still has children.",
      points: [
        "For orders, use RESTRICT (the default): you can't hard-delete a user with orders. Soft-delete or anonymise the user instead.",
        "SET NULL would orphan orders and lose who placed them; not acceptable for accounting.",
        "CASCADE fits true ownership: deleting a post deletes its likes and comments.",
        "Cascades can chain and delete far more than expected; InnoDB cascades also don't fire triggers.",
        "ON UPDATE CASCADE matters only if primary keys change, which they shouldn't.",
      ],
    },
  },

  "sql-c-db-vs-app": {
    scenario: "Your app checks 'is this email already registered?' before inserting, yet duplicate accounts still appear. Why, and what's the correct fix?",
    answer: {
      summary:
        "Check-then-insert is a race: two sign-up requests both run the SELECT, both see no user, and both INSERT. Only the database can enforce uniqueness atomically: add a UNIQUE index and handle the duplicate-key error.",
      points: [
        "With UNIQUE(email), the second INSERT fails with ER_DUP_ENTRY (1062); map it to a friendly 409 'email already registered'.",
        "Keep the app check too, for a nice error in the common case, but never rely on it for correctness.",
        "The same applies to any invariant: foreign keys, CHECK constraints, conditional updates for stock.",
        "Other writers (admin scripts, other services, manual fixes) bypass app validation entirely.",
        "Normalise before comparing (e.g. lowercase emails, or a case-insensitive collation) so 'A@x.com' and 'a@x.com' collide.",
      ],
    },
  },

  "sql-c-nulls": {
    scenario: "What are the NULL behaviours that cause bugs in SQL, and when should a column be nullable?",
    answer: {
      summary:
        "NULL means 'unknown', and comparisons with unknown give UNKNOWN rather than true or false. That quietly changes filters, NOT IN, counts and sums.",
      points: [
        "col = NULL is never true: use IS NULL, or the NULL-safe <=> operator.",
        "WHERE col <> 'x' drops rows where col is NULL.",
        "NOT IN (subquery) returns nothing if the subquery yields any NULL.",
        "COUNT(col) skips NULLs; COUNT(*) counts rows. AVG ignores NULLs (changes the denominator). SUM of no rows is NULL: wrap with COALESCE(SUM(x), 0).",
        "In ORDER BY ascending, MySQL sorts NULLs first.",
        "Make columns NOT NULL unless 'unknown/not applicable' is a real state (e.g. deleted_at, manager_id of the CEO).",
      ],
    },
  },

  "sql-c-safety-patterns": {
    scenario: "Design a wallet table structure so the balance can always be proven correct, and duplicate requests can't double-credit.",
    answer: {
      summary:
        "Use an append-only ledger as the source of truth, idempotency keys enforced by UNIQUE constraints, and conditional updates for the cached balance, all in one transaction.",
      points: [
        "ledger_entries(id, wallet_id, amount (+/−), type, reference_id, idempotency_key UNIQUE, created_at): never updated or deleted.",
        "wallets.balance is a cached sum updated in the same transaction: UPDATE wallets SET balance = balance + ? WHERE id = ? AND balance + ? >= 0.",
        "A retried request with the same idempotency key fails the UNIQUE insert, so it can't apply twice.",
        "State machines via conditional updates: UPDATE withdrawals SET status = 'paid' WHERE id = ? AND status = 'approved'.",
        "A nightly reconciliation compares SUM(ledger) with wallets.balance and with the payment provider's reports.",
      ],
    },
  },

  // ---------- Pagination & large data ----------
  "sql-c-offset-problem": {
    scenario: "Why does LIMIT 20 OFFSET 200000 get slow, and why do users see duplicate items while paging through a feed?",
    answer: {
      summary:
        "MySQL can't jump to row 200,000; it reads and throws away all the rows before it, so the cost grows with the page number. And if new rows are inserted while a user pages, everything shifts: items from page 1 reappear on page 2, or some are skipped.",
      points: [
        "Deep pages can take seconds even with an index, because the skipped rows are still traversed (and looked up, if not covered).",
        "Deleted rows shift the pages the other way: items are skipped.",
        "Always ORDER BY a unique combination (created_at, id), otherwise order between equal values is undefined.",
        "Mitigations: keyset pagination, 'deferred join' (page through ids in a covering index, then join for full rows), capping max page depth.",
        "OFFSET is fine for small result sets and admin tables with modest depth.",
      ],
      code: `-- Deferred join: scan only the narrow index, then fetch 20 full rows
SELECT o.*
FROM orders o
JOIN (
  SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 200000
) page ON page.id = o.id
ORDER BY o.created_at DESC, o.id DESC;`,
    },
  },

  "sql-c-keyset": {
    scenario: "Explain keyset (cursor) pagination and how you'd expose it in a REST API.",
    answer: {
      summary:
        "Instead of saying 'skip N rows', the client sends the sort values of the last row it saw, and the query asks for rows after that point. With an index on the sort columns, every page costs the same no matter how deep.",
      points: [
        "Query: WHERE (created_at, id) < (:last_created_at, :last_id) ORDER BY created_at DESC, id DESC LIMIT 21 (one extra row tells you if there's a next page).",
        "Index (created_at, id), or (user_id, created_at, id) when filtered by user.",
        "API: return next_cursor = base64(JSON of the last row's sort values); the client passes it back; don't expose raw SQL values' meaning.",
        "Stable under inserts: new rows land before the cursor and don't shift later pages.",
        "Limitations: no 'jump to page 57', and the total count needs a separate (expensive or approximate) query.",
        "Previous page: flip the comparison and sort direction, then reverse the rows.",
      ],
    },
  },

  "sql-c-count-large": {
    scenario: "The admin dashboard shows 'Total orders: 48,213,907' and the page takes 8 seconds. Why is COUNT(*) slow on InnoDB, and what can you do?",
    answer: {
      summary:
        "InnoDB doesn't store an exact row count, because MVCC means different transactions can see different counts. COUNT(*) must scan an index (the smallest one it can find), so its time grows with the table.",
      points: [
        "Filtered counts (WHERE status = 'paid') need an index on the filter columns, and still scan every matching entry.",
        "Options: cache the count (refresh every few minutes), maintain a counter table updated with each insert/delete (or by a job), or show approximate numbers.",
        "information_schema.TABLES.TABLE_ROWS is only an estimate, sometimes off by 40%+.",
        "Many UIs don't need exact totals: '10,000+ results' or 'load more' instead of numbered pages.",
        "For dashboards, precompute daily counts in a summary table and add today's live count.",
      ],
    },
  },

  "sql-c-batch-writes": {
    scenario: "You need to update a column for 30 million rows and import 5 million new ones, without hurting production traffic. How?",
    answer: {
      summary:
        "Do it in small batches with pauses, each in its own short transaction. One giant statement holds locks for a long time, bloats the undo log, and causes huge replication lag.",
      points: [
        "Batch by primary key range: UPDATE ... WHERE id BETWEEN ? AND ? (e.g. 5,000 rows), commit, sleep briefly, move to the next range.",
        "Walking the PK is better than LIMIT with OFFSET, and better than 'WHERE new_col IS NULL LIMIT 5000' on an unindexed column.",
        "Watch replica lag and pause if it grows; tools like pt-archiver or gh-ost-style throttling help.",
        "Imports: multi-row INSERT (hundreds to thousands of rows per statement), or LOAD DATA INFILE for the fastest bulk load.",
        "Drop/rebuild secondary indexes only for offline loads; online, keep them.",
        "Make the job resumable (store the last processed id) and idempotent.",
      ],
      code: `-- Repeat until no rows are affected
UPDATE users
SET email_normalized = LOWER(TRIM(email))
WHERE id > :last_id AND id <= :last_id + 5000;`,
    },
  },

  "sql-c-archiving": {
    scenario: "A logs table has 2 billion rows and you only need 90 days of data. How do you keep it under control?",
    answer: {
      summary:
        "Use range partitioning by date so old data can be dropped a whole partition at a time (instant, no row-by-row delete), or move old rows to an archive table or cold storage in batches.",
      points: [
        "PARTITION BY RANGE (TO_DAYS(created_at)) with one partition per day/week/month.",
        "Retention: ALTER TABLE logs DROP PARTITION p2024_01 is a metadata operation, versus DELETE of millions of rows which generates huge undo/redo and replication traffic.",
        "Every unique key (including the primary key) must include the partition column.",
        "Queries benefit only when they filter on the partition column (partition pruning); others scan every partition.",
        "Archive instead of drop when data must be kept: copy to S3/Parquet or a cheaper database, then drop.",
      ],
    },
  },

  // ---------- Aggregation & reporting ----------
  "sql-c-group-by-rules": {
    scenario: "Why is SELECT department, name, MAX(salary) FROM employees GROUP BY department wrong? What does ONLY_FULL_GROUP_BY do?",
    answer: {
      summary:
        "A group has many names but the query asks for one. Old MySQL returned the name from an arbitrary row, not the one with the MAX salary: a silent bug. ONLY_FULL_GROUP_BY (default since 5.7) rejects queries whose selected columns aren't grouped, aggregated, or functionally dependent on the group key.",
      points: [
        "Every selected column must be in GROUP BY, inside an aggregate, or determined by the GROUP BY columns (e.g. grouping by primary key lets you select that row's other columns).",
        "To get the row with the max value, use a window function (RANK() = 1) or join back to the max.",
        "ANY_VALUE(col) explicitly says 'any value is fine', e.g. a name that's the same for all rows in the group.",
        "Turning the mode off hides bugs; leave it on.",
      ],
    },
  },

  "sql-c-where-vs-having": {
    scenario: "What's the difference between WHERE and HAVING? Describe the logical order in which SQL clauses are evaluated.",
    answer: {
      summary:
        "WHERE filters individual rows before they are grouped; HAVING filters groups after aggregation. The logical order is FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT (including window functions) → DISTINCT → ORDER BY → LIMIT.",
      points: [
        "Aggregates can't appear in WHERE because groups don't exist yet.",
        "Put row filters in WHERE even though HAVING could technically do some of them: fewer rows get grouped.",
        "SELECT aliases aren't visible in WHERE (SELECT runs later); MySQL allows them in GROUP BY, HAVING and ORDER BY as an extension.",
        "Window functions are computed in the SELECT stage, so you can't filter on them in WHERE or HAVING; wrap them in a subquery/CTE.",
      ],
    },
  },

  "sql-c-dashboard-queries": {
    scenario: "The sales dashboard aggregates 500 million order rows on every page load and times out. How do you make it fast and near real time?",
    answer: {
      summary:
        "Stop aggregating raw data on every request. Pre-aggregate into summary tables (per day/hour, per dimension), refresh them incrementally, and combine them with a small live query for the current period.",
      points: [
        "daily_sales(day, store_id, category_id, orders, revenue) updated every few minutes by a job, or on each order write.",
        "Dashboard reads = history from the summary table + today from the raw table (small, indexed by created_at).",
        "Run reporting against a read replica so it can't slow down checkout.",
        "Cache dashboard responses for a short time.",
        "At larger scale, stream changes (binlog/CDC) into a columnar analytics store (ClickHouse, BigQuery, Redshift) built for aggregates.",
      ],
    },
  },

  "sql-c-window-vs-groupby": {
    scenario: "When do you use a window function instead of GROUP BY? Show each order next to its customer's total spend.",
    answer: {
      summary:
        "GROUP BY collapses each group into one row. A window function computes an aggregate (or rank, running total, previous value) over related rows but keeps every row, so you can show row detail and group-level values side by side.",
      points: [
        "PARTITION BY defines the group for the window; ORDER BY inside OVER defines order for ranks and running totals.",
        "Typical uses: rankings and top-N per group, running totals, moving averages, percent of total, LAG/LEAD comparisons with previous rows.",
        "Windows can't be used in WHERE; filter them in an outer query.",
        "Available from MySQL 8.0.",
      ],
      code: `SELECT id, customer_id, total,
       SUM(total) OVER (PARTITION BY customer_id) AS customer_total_spend,
       ROUND(100 * total / SUM(total) OVER (PARTITION BY customer_id), 1) AS pct_of_customer
FROM orders;`,
    },
  },

  // ---------- Performance debugging ----------
  "sql-c-slow-query-log": {
    scenario: "How do you find which queries are hurting your MySQL server?",
    answer: {
      summary:
        "Enable the slow query log and use performance_schema's statement digests, then rank queries by total time consumed (count × average duration), not just by the slowest single execution.",
      points: [
        "slow_query_log = ON, long_query_time = 0.5 (or lower briefly), log_queries_not_using_indexes for discovery.",
        "pt-query-digest groups similar queries and reports total time, calls, rows examined vs sent.",
        "sys.statement_analysis / performance_schema.events_statements_summary_by_digest give the same live, without log files.",
        "A 5 ms query called 10,000 times per second uses 50 CPU-seconds per second: it matters far more than one 3 s report query per hour.",
        "Look at rows_examined / rows_sent: a high ratio means scanning much more than returning (missing index).",
      ],
    },
  },

  "sql-c-common-issues": {
    scenario: "Database CPU jumps to 100% and the API slows down. What are the most common causes, and what do you check in the first 10 minutes?",
    answer: {
      summary:
        "Usually a query doing far too much work (missing index, new query from a deploy, a plan change), a traffic spike multiplying normal queries (N+1, cache failure), or lock contention. Find what's running and what changed.",
      points: [
        "SHOW PROCESSLIST / sys.processlist: what's running now, for how long, in what state.",
        "Top statements by total time since the spike (performance_schema digests).",
        "What changed: a deploy, a new feature, a migration, a cache flush, a batch job, a marketing push?",
        "Common culprits: full table scans, filesort/temporary on big tables, N+1 loops, SELECT * returning huge rows, deep OFFSET, long transactions.",
        "Mitigate first (roll back the deploy, disable the feature, kill the runaway query, scale reads), then fix root cause.",
      ],
    },
  },

  "sql-c-locks-debugging": {
    scenario: "Every write to the orders table suddenly hangs. How do you find what's blocking it?",
    answer: {
      summary:
        "Something holds locks the writers need: usually a long transaction, a big batch update, or a DDL waiting on a metadata lock. Find the blocking transaction, decide whether to kill it, and fix the code that left it open.",
      points: [
        "sys.innodb_lock_waits: waiting query, blocking query, and the blocking connection id.",
        "information_schema.innodb_trx: open transactions and how long they've run. An idle connection with an old open transaction ('Sleep' in processlist) is a classic culprit.",
        "'Waiting for table metadata lock' in the processlist: an ALTER is queued behind a long transaction, and everything else is queued behind the ALTER.",
        "SHOW ENGINE INNODB STATUS for lock and deadlock details.",
        "KILL <id> the blocker if safe (its transaction rolls back, which can itself take time for large transactions).",
      ],
    },
  },

  "sql-c-explain-analyze": {
    scenario: "After a large data import, a query that was fast becomes slow because MySQL picks a different index. Why, and how do you fix it?",
    answer: {
      summary:
        "The optimizer chooses plans from statistics (estimated rows per index value). After big data changes, the estimates may be stale or wrong, so a worse plan looks cheaper. Refresh statistics and compare estimated against actual rows.",
      points: [
        "EXPLAIN ANALYZE shows actual rows and time for each step next to the estimates; a large mismatch points to bad statistics.",
        "ANALYZE TABLE recalculates index statistics (cheap in InnoDB).",
        "Histograms (ANALYZE TABLE t UPDATE HISTOGRAM ON col) help the optimizer with skewed, non-indexed columns.",
        "innodb_stats_persistent_sample_pages increases sampling accuracy for big tables.",
        "Last resort: FORCE INDEX or optimizer hints; they pin the plan even when data changes again, so document why.",
      ],
    },
  },

  "sql-c-debugging-flow": {
    scenario: "A manager says 'the database is slow'. Describe your step-by-step approach.",
    answer: {
      summary:
        "Narrow it down from symptoms to one cause: which requests are slow, whether the server is saturated, which queries or locks are responsible, then fix, verify and add monitoring.",
      points: [
        "Scope: all endpoints or one? Since when? Correlate with deploys, jobs, traffic.",
        "Server health: CPU, IO wait, memory/buffer pool hit rate, connections, replication lag, disk space.",
        "Queries: top digests by total time, current processlist, slow log since the incident.",
        "Locks: lock waits, long transactions, metadata locks.",
        "Fix the biggest contributor (index, query rewrite, rollback, kill a runaway job), then confirm latency recovers.",
        "Prevent: alerts on slow queries, lock waits, replica lag; query review for new features.",
        "Slow only at 2–3 am: backups, batch jobs, analytics exports or index rebuilds running then.",
      ],
    },
  },
};
