// Concept questions: Transactions & concurrency, Indexing & query optimization, Joins & relationships.
export default {
  // ---------- Transactions & concurrency ----------
  "sql-c-transaction-acid": {
    scenario: "What is a database transaction? Explain each ACID property using a bank transfer of 500 from A to B.",
    answer: {
      summary:
        "A transaction is a group of statements that succeed or fail as one unit. For a transfer, debiting A and crediting B must both happen or neither. ACID describes the guarantees: Atomicity, Consistency, Isolation and Durability.",
      points: [
        "Atomicity: if the credit to B fails after A was debited, the whole transaction rolls back. InnoDB uses the undo log for this.",
        "Consistency: the database moves from one valid state to another; constraints (balance >= 0, foreign keys) hold at commit.",
        "Isolation: concurrent transfers don't see each other's half-done work; how strictly depends on the isolation level.",
        "Durability: once COMMIT returns, the change survives a crash. InnoDB writes the redo log to disk at commit (innodb_flush_log_at_trx_commit = 1).",
        "MySQL runs in autocommit mode by default: each statement is its own transaction unless you START TRANSACTION.",
      ],
      code: `START TRANSACTION;
UPDATE accounts SET balance = balance - 500 WHERE id = 'A' AND balance >= 500;
UPDATE accounts SET balance = balance + 500 WHERE id = 'B';
COMMIT;  -- or ROLLBACK if anything failed`,
    },
  },

  "sql-c-commit-rollback-savepoint": {
    scenario: "Explain COMMIT, ROLLBACK and SAVEPOINT. What happens to a transaction when one statement inside it fails?",
    answer: {
      summary:
        "COMMIT makes the transaction's changes permanent, ROLLBACK undoes all of them, and SAVEPOINT marks a point you can roll back to without abandoning the whole transaction.",
      points: [
        "In InnoDB, a failed statement is rolled back on its own, but the transaction stays open with the earlier statements still applied. Your code must decide to ROLLBACK (usually) or continue.",
        "Exceptions: a deadlock or lock wait timeout (with innodb_rollback_on_timeout) roll back the whole transaction.",
        "SAVEPOINT s1 … ROLLBACK TO SAVEPOINT s1 undoes only the work after s1; useful for optional steps in a larger operation.",
        "DDL (CREATE, ALTER, DROP, TRUNCATE) causes an implicit commit in MySQL, so it can't be rolled back with the surrounding transaction.",
        "Closing the connection with an open transaction rolls it back.",
      ],
      code: `START TRANSACTION;
INSERT INTO orders (...) VALUES (...);
SAVEPOINT before_coupon;
UPDATE coupons SET used = used + 1 WHERE code = 'SAVE10' AND used < max_uses;
-- coupon no longer valid? undo just that part
ROLLBACK TO SAVEPOINT before_coupon;
COMMIT;`,
    },
  },

  "sql-c-read-anomalies": {
    scenario: "Explain dirty reads, non-repeatable reads and phantom reads, with an example of each.",
    answer: {
      summary:
        "They are the classic concurrency anomalies. A dirty read sees another transaction's uncommitted data; a non-repeatable read sees a row change between two reads; a phantom read sees new rows appear in a repeated range query.",
      points: [
        "Dirty read: T1 sets a price to 0 but hasn't committed; T2 reads 0 and creates an order at price 0; T1 rolls back. Prevented from READ COMMITTED upwards.",
        "Non-repeatable read: T1 reads a balance of 1000; T2 withdraws and commits; T1 reads again and gets 500 within the same transaction. Prevented from REPEATABLE READ upwards.",
        "Phantom read: T1 counts pending orders (10); T2 inserts a pending order and commits; T1 counts again and gets 11. Prevented by SERIALIZABLE, and in InnoDB's REPEATABLE READ by snapshots (plain reads) and next-key locks (locking reads).",
        "Lost update is a separate problem: two transactions read then overwrite each other's write. Isolation levels alone often don't stop it in app code.",
      ],
    },
  },

  "sql-c-isolation-levels": {
    scenario: "What are the four isolation levels? Which is MySQL's default, and how does InnoDB implement it?",
    answer: {
      summary:
        "READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ and SERIALIZABLE trade consistency for concurrency. InnoDB defaults to REPEATABLE READ and uses MVCC (multi-version concurrency control), so plain SELECTs read a consistent snapshot without blocking writers.",
      points: [
        "READ UNCOMMITTED: can see uncommitted changes (dirty reads). Almost never used.",
        "READ COMMITTED: each statement sees data committed before it started. Default in Postgres and Oracle.",
        "REPEATABLE READ (MySQL default): the whole transaction reads from the snapshot taken at its first read.",
        "SERIALIZABLE: InnoDB turns plain SELECTs into locking reads (FOR SHARE); safest, most blocking.",
        "Locking reads (FOR UPDATE, UPDATE, DELETE) always read the latest committed version and lock it, even in REPEATABLE READ.",
        "Many high-traffic setups use READ COMMITTED: fewer gap locks means fewer deadlocks and lock waits.",
      ],
      code: `SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT @@transaction_isolation;`,
    },
  },

  "sql-c-lost-update": {
    scenario: "Two users buy the last unit of a product at the same moment, and stock goes to -1. Explain the race and show three ways to prevent it.",
    answer: {
      summary:
        "Both requests read stock = 1, both decide there's enough, and both write stock - 1. The read-then-write in application code isn't atomic. Fix it with an atomic conditional update, a row lock, or optimistic locking.",
      points: [
        "Atomic update: UPDATE products SET stock = stock - 1 WHERE id = ? AND stock >= 1; if affected rows = 0, it's sold out. Simplest and fastest.",
        "Pessimistic: SELECT stock FROM products WHERE id = ? FOR UPDATE inside a transaction; the second request waits until the first commits, then sees 0.",
        "Optimistic: read stock and version; UPDATE ... SET stock = ?, version = version + 1 WHERE id = ? AND version = ?; retry if 0 rows changed.",
        "A CHECK (stock >= 0) constraint (MySQL 8.0.16+) is a final safety net.",
      ],
      code: `-- Atomic conditional update (preferred)
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock >= 1;
-- affectedRows = 1 → success, 0 → out of stock`,
    },
  },

  "sql-c-locks": {
    scenario: "Explain InnoDB's row locks, table locks, gap locks and next-key locks. Why can an UPDATE lock far more rows than it changes?",
    answer: {
      summary:
        "InnoDB locks index records, not rows in the abstract. Record locks lock specific index entries, gap locks lock the space between entries so nothing can be inserted there, and next-key locks are both together. Table locks lock the whole table.",
      points: [
        "Shared (S) locks allow other readers; exclusive (X) locks block other lockers. Plain SELECTs under MVCC take no row locks.",
        "Gap/next-key locks exist in REPEATABLE READ to stop phantom rows in locked ranges; READ COMMITTED mostly disables gap locking.",
        "InnoDB locks every index record it scans for a locking statement. With no usable index on the WHERE column, it scans and locks the whole table's rows.",
        "Intention locks (IS/IX) at the table level coordinate row locks with table locks (LOCK TABLES, DDL).",
        "Metadata locks: a long-running transaction blocks ALTER TABLE, and the waiting ALTER then blocks every new query on that table.",
      ],
      pitfalls: ["An UPDATE ... WHERE email = ? without an index on email locks every row it scans, blocking other writers on the whole table."],
    },
  },

  "sql-c-select-for-update": {
    scenario: "What does SELECT ... FOR UPDATE do? Show how you'd build a job queue table where 10 workers never pick the same job.",
    answer: {
      summary:
        "SELECT ... FOR UPDATE reads the latest committed rows and puts exclusive locks on them until the transaction ends, so other transactions that try to lock or modify them wait. With SKIP LOCKED, other workers skip locked rows instead of waiting, which makes a table safe to use as a queue.",
      points: [
        "Only meaningful inside a transaction; in autocommit mode the lock is released immediately.",
        "FOR SHARE takes shared locks: others can read-lock but not modify.",
        "NOWAIT fails immediately instead of waiting; SKIP LOCKED ignores locked rows (MySQL 8.0+).",
        "Needs an index on the WHERE/ORDER BY columns, or it locks far more rows than intended.",
        "Keep the transaction short: claim the job (update its status), commit, then do the work outside the transaction.",
      ],
      code: `START TRANSACTION;
SELECT id FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE jobs SET status = 'running', worker = 'w7', started_at = NOW() WHERE id = ?;
COMMIT;
-- process the job, then mark it done`,
    },
  },

  "sql-c-optimistic-pessimistic": {
    scenario: "Compare optimistic and pessimistic locking. Which would you use for booking seats in a cinema, and which for editing a user profile?",
    answer: {
      summary:
        "Pessimistic locking locks the row before changing it, so conflicting transactions wait. Optimistic locking doesn't lock: it checks at write time that nobody changed the row since it was read (with a version column) and retries or reports a conflict if they did.",
      points: [
        "Pessimistic: SELECT ... FOR UPDATE. Good when conflicts are frequent (hot rows like popular seats or inventory) and the transaction is short.",
        "Optimistic: UPDATE ... WHERE id = ? AND version = ?; 0 affected rows means a conflict. Good when conflicts are rare and you can't hold a DB transaction open (e.g. across a user's edit session).",
        "Cinema seats: pessimistic, or better an atomic INSERT into a bookings table with UNIQUE(show_id, seat_id): the database rejects the second booking.",
        "User profile edited in two tabs: optimistic, show 'this was changed elsewhere, reload'.",
        "Sequelize supports optimistic locking with version: true on the model.",
      ],
      code: `UPDATE profiles
SET bio = ?, version = version + 1
WHERE id = ? AND version = ?;   -- 0 rows → someone else saved first`,
    },
  },

  "sql-c-deadlocks": {
    scenario: "What is a deadlock in MySQL? Your payment service logs dozens of deadlocks per day. How do you investigate and reduce them?",
    answer: {
      summary:
        "A deadlock happens when two transactions each hold a lock the other needs, so neither can continue. InnoDB detects the cycle and rolls back one transaction (error 1213), which the application should retry.",
      points: [
        "Classic cause: T1 locks A then B; T2 locks B then A. Also gap-lock conflicts between concurrent inserts in REPEATABLE READ.",
        "Investigate: SHOW ENGINE INNODB STATUS shows the latest deadlock (both statements and locks); innodb_print_all_deadlocks logs every one to the error log.",
        "Reduce: lock rows in a consistent order (e.g. by id), keep transactions short, index the WHERE columns so fewer rows are locked, avoid user or network waits inside transactions.",
        "Consider READ COMMITTED to reduce gap locking.",
        "Always retry deadlocked transactions (with a small backoff) in application code; some deadlocks are unavoidable under concurrency.",
      ],
      code: `-- Transfers: always lock the lower account id first
SELECT id FROM accounts WHERE id IN (?, ?) ORDER BY id FOR UPDATE;`,
    },
  },

  "sql-c-lock-wait-retry": {
    scenario: "Requests fail with 'Lock wait timeout exceeded; try restarting transaction'. What causes it, and how should the application retry safely?",
    answer: {
      summary:
        "Error 1205 means a statement waited longer than innodb_lock_wait_timeout (50 s by default) for a lock held by another transaction, usually a long-running or forgotten open transaction. Find and fix the blocker; retry only if the operation is idempotent.",
      points: [
        "Find blockers: sys.innodb_lock_waits (who waits for whom), information_schema.innodb_trx (open transactions and their age), SHOW PROCESSLIST.",
        "Typical culprits: a transaction left open in code (missing commit/rollback on an error path), a big batch UPDATE, or an HTTP call made inside a transaction.",
        "By default only the timed-out statement is rolled back, not the whole transaction; roll back yourself before retrying.",
        "Retry with backoff, but make the operation idempotent (idempotency key with a UNIQUE constraint), or a retry after a timeout that actually succeeded creates duplicates.",
        "Lower the timeout for user-facing requests so they fail fast rather than hanging.",
      ],
    },
  },

  // ---------- Indexing & query optimization ----------
  "sql-c-index-basics": {
    scenario: "How does a database index work, and why does it make queries faster? What does it cost?",
    answer: {
      summary:
        "An InnoDB index is a B+tree: a sorted, balanced tree only 3–4 levels deep even for hundreds of millions of rows. Instead of scanning every row, MySQL walks the tree to the matching key and reads a range of sorted entries.",
      points: [
        "Lookup cost goes from O(n) (full scan) to about O(log n) plus the matching rows.",
        "Leaves are linked, so range queries (BETWEEN, >, ORDER BY) read neighbouring entries efficiently.",
        "Index the columns used in WHERE, JOIN ON, ORDER BY and GROUP BY of frequent queries.",
        "Costs: every INSERT/UPDATE/DELETE must update each index, indexes use disk and buffer pool memory, and too many indexes confuse the optimizer.",
        "Hash indexes only do equality lookups; B+trees handle equality, ranges and sorting, which is why they're the default.",
      ],
    },
  },

  "sql-c-clustered-secondary": {
    scenario: "What's the difference between the clustered (primary key) index and secondary indexes in InnoDB? Why does the primary key choice matter so much?",
    answer: {
      summary:
        "In InnoDB the table itself is stored as a B+tree ordered by the primary key (the clustered index): its leaves contain the full rows. Secondary indexes store the indexed columns plus the primary key value, so a secondary lookup finds the primary key and then does a second lookup in the clustered index.",
      points: [
        "A secondary-index query that needs other columns does two tree traversals (unless the index covers the query).",
        "Every secondary index includes the primary key, so a wide PK (e.g. a 36-char UUID string) bloats every index.",
        "Sequential PKs (AUTO_INCREMENT) append to the end of the tree; random PKs (UUIDv4) insert all over, causing page splits, fragmentation and poor cache use.",
        "If you need UUIDs, store them as BINARY(16) and use a time-ordered variant (UUIDv7, or UUID_TO_BIN(uuid, 1) for v1).",
        "No PK defined? InnoDB uses the first NOT NULL UNIQUE index or a hidden 6-byte row id. Always define one.",
      ],
    },
  },

  "sql-c-composite-leftmost": {
    scenario: "Explain composite indexes and the leftmost-prefix rule. Design an index for: WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 20.",
    answer: {
      summary:
        "A composite index on (a, b, c) is sorted by a, then b within a, then c within b. It can be used for conditions on a, (a, b) or (a, b, c), but not on b or c alone. For the query, INDEX(user_id, status, created_at) lets MySQL jump to the exact (user, status) block and read it already sorted by date.",
      points: [
        "Put equality columns first, then the column used for a range or sort.",
        "A range condition on a column stops the following columns from narrowing the search (they may still be checked via index condition pushdown).",
        "With the right index, EXPLAIN shows no 'Using filesort' and reads only ~20 index entries.",
        "(user_id, created_at) also serves 'all orders of a user by date'; plan indexes around your real queries.",
        "Column order by 'most selective first' is a myth; the query shape decides the order.",
      ],
      code: `CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at);

SELECT id, total, created_at
FROM orders
WHERE user_id = 42 AND status = 'paid'
ORDER BY created_at DESC
LIMIT 20;`,
    },
  },

  "sql-c-covering-index": {
    scenario: "What is a covering index? Make this frequent query as fast as possible: SELECT id, status FROM orders WHERE user_id = ?",
    answer: {
      summary:
        "An index covers a query when every column the query needs is in the index, so MySQL answers from the index alone without the extra lookup into the table rows. EXPLAIN shows 'Using index'.",
      points: [
        "INDEX(user_id, status) covers the query: user_id to filter, status to return, and id is included automatically because secondary indexes store the primary key.",
        "Removes the second (clustered index) lookup per row: big win for queries returning many rows.",
        "Also speeds COUNT(*) and aggregates over indexed columns.",
        "Trade-off: wider indexes use more memory and slow writes; cover only hot queries.",
        "SELECT * can never be covered, another reason to select only the columns you need.",
      ],
    },
  },

  "sql-c-index-not-used": {
    scenario: "There's an index on created_at, but EXPLAIN shows a full table scan for WHERE YEAR(created_at) = 2024. Why? What other things stop MySQL from using an index?",
    answer: {
      summary:
        "The index is sorted by created_at, not by YEAR(created_at). Wrapping the column in a function makes the condition non-sargable: MySQL must compute the function for every row. Rewrite it as a range on the raw column.",
      points: [
        "Functions or arithmetic on the column: DATE(col), LOWER(col), col + 1 = 5. Fix with ranges, or a functional index (MySQL 8.0.13+).",
        "Implicit type conversion: comparing a VARCHAR phone column with a number (phone = 9876543210) converts every row.",
        "Leading wildcard: LIKE '%gmail.com' can't use a B+tree; LIKE 'abc%' can.",
        "Composite index without its leftmost column in the condition.",
        "OR across different columns (may need index merge or UNION), and low selectivity: if a condition matches ~30% of rows, a scan can really be cheaper, so the optimizer chooses it.",
        "Collation or charset mismatch between joined columns.",
      ],
      code: `-- Non-sargable
WHERE YEAR(created_at) = 2024
-- Sargable
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'`,
    },
  },

  "sql-c-explain": {
    scenario: "Walk me through reading MySQL EXPLAIN output. What columns do you look at first?",
    answer: {
      summary:
        "EXPLAIN shows the plan for each table in the query: how it's accessed, which index is used, how many rows MySQL expects to read, and extra work like sorting or temporary tables.",
      points: [
        "type (best to worst): system/const → eq_ref → ref → range → index (full index scan) → ALL (full table scan).",
        "possible_keys vs key: which indexes were considered and which was chosen; key_len shows how many columns of a composite index are used.",
        "rows × filtered%: the estimated rows examined; compare with the rows actually returned.",
        "Extra: 'Using index' (covering, good), 'Using where', 'Using filesort' (sort without index), 'Using temporary' (temp table, often from GROUP BY/DISTINCT), 'Using index condition' (ICP).",
        "EXPLAIN ANALYZE (MySQL 8.0.18+) actually runs the query and shows real row counts and time per step.",
        "EXPLAIN FORMAT=TREE shows the plan as a readable tree.",
      ],
      code: `EXPLAIN ANALYZE
SELECT c.name, COUNT(*)
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2024-01-01'
GROUP BY c.name;`,
    },
  },

  "sql-c-index-cost": {
    scenario: "A write-heavy table has 14 indexes and inserts are getting slow. How do you decide which indexes to keep?",
    answer: {
      summary:
        "Every index is updated on every write and takes memory, so indexes must earn their place. Remove unused and redundant ones, and consolidate several into composite indexes that serve multiple queries.",
      points: [
        "Find unused indexes: sys.schema_unused_indexes (since the last restart; check over a full business cycle).",
        "Redundant: INDEX(a) is redundant if INDEX(a, b) exists (sys.schema_redundant_indexes).",
        "Check which queries rely on each index (slow log, performance_schema digests) before dropping.",
        "MySQL 8 invisible indexes: ALTER TABLE t ALTER INDEX idx INVISIBLE to test dropping safely, then drop or make visible again.",
        "Keep unique indexes that enforce business rules even if no query reads through them.",
      ],
    },
  },

  "sql-c-cardinality": {
    scenario: "What are cardinality and selectivity? Is an index on a boolean is_deleted column useful?",
    answer: {
      summary:
        "Cardinality is the number of distinct values in a column; selectivity is how small a fraction of rows a condition matches. Indexes help most when a condition picks a small fraction of the table.",
      points: [
        "email or order_id: very selective, great index candidates.",
        "is_deleted alone: if 99% of rows are 0, WHERE is_deleted = 0 matches almost everything, so the index is useless. But WHERE is_deleted = 1 (the rare value) can benefit.",
        "Low-cardinality columns are useful inside a composite index: (user_id, is_deleted, created_at).",
        "MySQL estimates cardinality from sampled statistics; after bulk changes, ANALYZE TABLE refreshes them, and MySQL 8 histograms help with skewed columns that aren't indexed.",
      ],
    },
  },

  "sql-c-optimize-slow-query": {
    scenario: "An API endpoint is slow and you've traced it to one SQL query. Walk through how you optimise it.",
    answer: {
      summary:
        "Measure, read the plan, fix the biggest cost, and verify. Most slow queries come down to scanning far more rows than they return, sorting without an index, or doing too much work in one query.",
      points: [
        "Reproduce with production-like data volume; time it and capture the exact SQL with real parameters.",
        "EXPLAIN / EXPLAIN ANALYZE: look for type ALL, big 'rows' estimates, filesort/temporary, and bad join order.",
        "Fixes: add or adjust a composite index to match WHERE + ORDER BY; make predicates sargable; select only needed columns; replace OFFSET with keyset; break up OR conditions; filter before joining.",
        "Check the app side: is it running the query in a loop (N+1)? Can the result be cached?",
        "Verify the plan changed, measure again, and watch for regressions on write speed.",
        "Fast in staging, slow in production: different data volume or distribution, stale statistics, cold buffer pool, or lock contention.",
      ],
    },
  },

  // ---------- Joins & relationships ----------
  "sql-c-relationship-types": {
    scenario: "How do you model one-to-one, one-to-many and many-to-many relationships in MySQL? Model students, courses and their grades.",
    answer: {
      summary:
        "One-to-many puts a foreign key on the 'many' side. Many-to-many needs a junction table holding two foreign keys. One-to-one is a foreign key that is also UNIQUE (or shares the primary key).",
      points: [
        "One-to-many: orders.customer_id → customers.id.",
        "Many-to-many: students ↔ courses through enrollments(student_id, course_id) with a composite primary or unique key.",
        "The junction table naturally holds relationship data: grade, enrolled_at, status.",
        "One-to-one: users and user_profiles with profiles.user_id UNIQUE; used to split rarely-read or sensitive columns.",
        "Index foreign key columns (InnoDB creates one automatically when you declare the FK).",
      ],
      code: `CREATE TABLE enrollments (
  student_id  INT NOT NULL,
  course_id   INT NOT NULL,
  grade       CHAR(2) NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id)  REFERENCES courses(id)
);`,
    },
  },

  "sql-c-join-types": {
    scenario: "Explain INNER, LEFT, RIGHT, CROSS and self joins. MySQL has no FULL OUTER JOIN; how do you get one?",
    answer: {
      summary:
        "INNER JOIN keeps only matching pairs. LEFT JOIN keeps every left row, filling the right side with NULLs when there's no match; RIGHT JOIN is the mirror. CROSS JOIN pairs every row with every row. A self join joins a table to itself.",
      points: [
        "Most teams write only LEFT JOINs (reordering tables) for readability.",
        "CROSS JOIN is useful for generating combinations (every student × every subject) or attaching a single-row result.",
        "Self join: employees with their managers, comparing rows in the same table.",
        "FULL OUTER JOIN = LEFT JOIN UNION RIGHT JOIN (UNION removes the duplicated matched rows; use UNION ALL with an IS NULL filter on the second part for speed).",
      ],
      code: `SELECT a.id, a.val, b.val
FROM a LEFT JOIN b ON b.id = a.id
UNION ALL
SELECT b.id, NULL, b.val
FROM b LEFT JOIN a ON a.id = b.id
WHERE a.id IS NULL;`,
    },
  },

  "sql-c-on-vs-where": {
    scenario: "Why does adding WHERE payments.status = 'success' to a LEFT JOIN drop orders without payments? And why did joining orders and payments double the revenue total?",
    answer: {
      summary:
        "WHERE runs after the join: for orders with no payment, payments.status is NULL, the condition is UNKNOWN, and the row is removed, turning the LEFT JOIN into an INNER JOIN. Put conditions on the right-hand table in ON. The doubled revenue is fan-out: an order with two payment rows appears twice, so SUM(orders.total) counts it twice.",
      points: [
        "LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'success' keeps every order.",
        "Conditions on the left table can stay in WHERE.",
        "Fan-out: joining a parent to a one-to-many child repeats the parent's columns once per child.",
        "Fix fan-out by aggregating the child first (in a subquery/CTE) and then joining, or by summing only the child's own values.",
        "Joining two different one-to-many children (items and payments) multiplies rows: items × payments per order.",
      ],
      code: `SELECT o.id, o.total, COALESCE(p.paid, 0) AS paid
FROM orders o
LEFT JOIN (
  SELECT order_id, SUM(amount) AS paid
  FROM payments
  WHERE status = 'success'
  GROUP BY order_id
) p ON p.order_id = o.id;`,
    },
  },

  "sql-c-join-vs-subquery": {
    scenario: "Is a JOIN faster than a subquery? When would you use each?",
    answer: {
      summary:
        "There's no fixed rule: MySQL 8's optimizer rewrites many IN/EXISTS subqueries into semi-joins and anti-joins, so equivalent forms often get the same plan. Choose the form that states intent clearly, then check EXPLAIN.",
      points: [
        "Need columns from the other table → JOIN.",
        "Only checking existence → EXISTS / IN (semi-join); it doesn't multiply rows the way a JOIN to a one-to-many table does.",
        "Correlated subqueries in SELECT or WHERE can execute once per outer row; rewrite them as joins or window functions if they're slow.",
        "Derived tables (subqueries in FROM) are the right tool to aggregate before joining, avoiding fan-out.",
        "Old MySQL (5.5 and earlier) handled IN subqueries badly; that's where the 'always use JOIN' advice comes from.",
      ],
    },
  },

  "sql-c-join-algorithms": {
    scenario: "How does MySQL actually execute a join between two big tables? What makes a join slow?",
    answer: {
      summary:
        "MySQL mainly uses nested-loop joins: for each row of the outer table, it looks up matching rows in the inner table, ideally via an index on the join column. Since 8.0.18 it can use a hash join when no suitable index exists.",
      points: [
        "Index nested-loop: cost ≈ outer rows × one index lookup. Fast when the inner join column is indexed.",
        "Without an index, each outer row would scan the inner table; hash join builds an in-memory hash table from one side instead (can spill to disk).",
        "The optimizer picks the join order, usually driving from the table that produces fewer rows after filters.",
        "First thing to check for a slow join: is the inner table's join column indexed, and do both columns have the same type and collation?",
        "STRAIGHT_JOIN or optimizer hints force a join order; use only when you've proven the optimizer wrong.",
      ],
    },
  },
};
