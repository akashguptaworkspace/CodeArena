// Concept questions: Scaling MySQL, Backup/migration & safety, Security, Sequelize + MySQL.
export default {
  // ---------- Scaling MySQL ----------
  "sql-c-vertical-scaling": {
    scenario: "Before adding replicas or sharding, how far can you get by scaling and tuning a single MySQL server?",
    answer: {
      summary:
        "Often very far. A single well-tuned server with enough RAM for the working set, fast SSDs and good indexes handles thousands of queries per second. The key setting is the InnoDB buffer pool, which caches data and index pages in memory.",
      points: [
        "innodb_buffer_pool_size ≈ 60–75% of RAM on a dedicated database server.",
        "Buffer pool too small: high disk reads (Innodb_buffer_pool_reads vs read_requests), IO wait, hit rate well below ~99%.",
        "Faster storage (NVMe, provisioned IOPS) helps write-heavy loads; innodb_log_file_size / redo capacity affects write bursts.",
        "Tune max_connections alongside app pool sizes; each connection costs memory.",
        "Limits: one machine has a ceiling, it's a single point of failure, and bigger instances cost disproportionately more.",
      ],
    },
  },

  "sql-c-read-replicas": {
    scenario: "You added read replicas to scale reads. A user updates their profile, refreshes, and sees the old data. Explain why and fix it.",
    answer: {
      summary:
        "Replication is asynchronous by default: the primary commits and returns, and replicas apply the change a little later (replication lag). A read routed to a replica during that window sees stale data.",
      points: [
        "Read-your-own-writes: route a user's reads to the primary for a few seconds after they write (session flag or timestamp).",
        "Or read critical data (balances, just-edited records) from the primary always, and use replicas for feeds, search and reports.",
        "GTID-based waiting: wait until the replica has applied the write's GTID before reading (WAIT_FOR_EXECUTED_GTID_SET).",
        "Monitor lag (Seconds_Behind_Source / performance_schema replication tables) and remove lagging replicas from the pool.",
        "Semi-synchronous replication guarantees at least one replica received the transaction, reducing data loss on failover, not read staleness.",
      ],
    },
  },

  "sql-c-sharding": {
    scenario: "Your orders table and write traffic have outgrown one MySQL primary. How would you shard it, and what gets harder?",
    answer: {
      summary:
        "Sharding splits rows across several independent databases by a shard key, so each holds a slice of the data and takes a slice of the writes. The shard key decides everything: it must spread load evenly and keep data that's queried together on the same shard.",
      points: [
        "Food delivery orders: shard by customer_id so 'my orders' hits one shard; restaurant dashboards then need a second copy/index keyed by restaurant (or a separate analytics store).",
        "Routing: hash(key) mod N is simple but resharding moves most data; consistent hashing or a lookup directory (key → shard) moves less.",
        "Harder: cross-shard joins, transactions (need sagas/outbox), global unique ids (Snowflake-style ids), global secondary indexes, reporting.",
        "Hot shards: a celebrity/merchant can overload one shard; plan for splitting.",
        "Try first: query and index fixes, caching, read replicas, vertical scaling, archiving, splitting by feature (separate databases per service). Tools like Vitess handle sharding for MySQL.",
      ],
    },
  },

  "sql-c-partitioning": {
    scenario: "What's the difference between partitioning and sharding? When does partitioning help, and when does it hurt?",
    answer: {
      summary:
        "Partitioning splits one table into pieces inside a single MySQL server; sharding spreads data across multiple servers. Partitioning mainly helps data lifecycle (dropping old data instantly) and queries that filter on the partition key; it doesn't add capacity beyond one machine.",
      points: [
        "Types: RANGE (dates), LIST (regions), HASH/KEY (even spread).",
        "Pruning: WHERE created_at >= '2024-06-01' reads only the matching partitions.",
        "Hurts: queries without the partition key scan every partition (more work than one index lookup); every unique key must include the partition column; foreign keys aren't supported on partitioned tables.",
        "Too many partitions add overhead for opening tables and planning.",
      ],
    },
  },

  "sql-c-connection-scaling": {
    scenario: "You scaled your API from 6 to 60 pods and MySQL started throwing 'Too many connections'. Explain and fix.",
    answer: {
      summary:
        "Each pod has its own connection pool, so total connections = pods × pool size. 60 × 20 = 1,200, above max_connections. Each MySQL connection is a thread using memory, so simply raising the limit has a cost.",
      points: [
        "Right-size pools: Node apps need small pools (5–10) because queries are async and short.",
        "Budget: pods × pool max + migrations + admin/monitoring < max_connections with headroom.",
        "A proxy (ProxySQL, RDS Proxy) multiplexes many client connections over fewer server connections.",
        "Serverless functions open connections per instance; always use a proxy there.",
        "Also look for leaked connections (not released on errors) and long transactions holding connections.",
      ],
    },
  },

  "sql-c-cache-scaling": {
    scenario: "How do you use caching to take load off MySQL? What must never be served from a cache?",
    answer: {
      summary:
        "Put a cache (usually Redis) in front of read-heavy, rarely changing data using cache-aside: read the cache, on a miss read MySQL and store the result with a TTL, and invalidate on writes.",
      points: [
        "Good candidates: product details, configuration, user profiles, computed aggregates, expensive query results.",
        "Invalidate (delete the key) after the DB write commits; TTL as a safety net.",
        "Stampede protection: single-flight rebuilds, locks, jittered TTLs, early refresh of hot keys.",
        "Never serve from cache: data where staleness is dangerous: balances when authorising a payment, stock at checkout, permissions right after revocation. Read these from the primary.",
        "MySQL 8 removed the built-in query cache because it scaled poorly under writes.",
      ],
    },
  },

  // ---------- Backup, migration & production safety ----------
  "sql-c-backups": {
    scenario: "How would you back up a production MySQL database? Compare logical and physical backups.",
    answer: {
      summary:
        "Logical backups (mysqldump, mydumper) export SQL statements: portable and simple, but slow to take and very slow to restore for large databases. Physical backups (Percona XtraBackup, disk or cloud snapshots) copy data files: fast to take and restore, but tied to the MySQL version and platform.",
      points: [
        "mysqldump --single-transaction takes a consistent InnoDB snapshot without locking tables.",
        "Combine full backups with binary logs for point-in-time recovery.",
        "Store backups off the server (and ideally another region/account), encrypted.",
        "Test restores regularly and time them: restore time is your real recovery time (RTO). A 2 TB mysqldump restore can take many hours.",
        "Managed databases (RDS, Cloud SQL) automate snapshots and PITR; still test restores.",
      ],
    },
  },

  "sql-c-pitr": {
    scenario: "Someone ran DELETE FROM orders without a WHERE clause at 14:03. How do you recover the data?",
    answer: {
      summary:
        "Point-in-time recovery: restore the most recent full backup to a separate server, then replay the binary logs from the backup's position up to just before the bad statement at 14:03. Then copy the lost rows back into production.",
      points: [
        "Find the exact position/GTID of the bad DELETE with mysqlbinlog; replay with --stop-position (or --stop-datetime) just before it.",
        "Restore to a separate instance rather than production, so you don't lose writes made after 14:03.",
        "Copy the missing rows back (INSERT ... SELECT or a dump of that table), carefully merging with anything changed since.",
        "Requires binlogs enabled, retained long enough and backed up.",
        "Prevention: sql_safe_updates for manual sessions, least-privilege accounts, reviewed scripts, and delayed replicas as a quick 'undo'.",
      ],
    },
  },

  "sql-c-online-migrations": {
    scenario: "You need to add a NOT NULL column with a default to a 200-million-row table in production. How do you do it safely?",
    answer: {
      summary:
        "Check whether MySQL can do it as an INSTANT or INPLACE online DDL; if not, use an online schema change tool that copies the table in the background. Either way, watch metadata locks and replication lag.",
      points: [
        "MySQL 8.0.12+ can add a column with ALGORITHM=INSTANT (8.0.29+ at any position): a metadata-only change.",
        "Specify ALGORITHM and LOCK explicitly (ALGORITHM=INSTANT or INPLACE, LOCK=NONE) so the statement fails instead of silently taking a blocking path.",
        "Every ALTER needs a brief metadata lock; a long-running transaction can make it wait and block all queries behind it. Set lock_wait_timeout low and retry.",
        "gh-ost / pt-online-schema-change create a shadow table, copy rows in chunks, keep it in sync, then atomically swap.",
        "Deploy in compatible steps (expand → migrate → contract) so old and new app versions both work during the rollout.",
      ],
      code: `ALTER TABLE orders
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'web',
  ALGORITHM = INSTANT;`,
    },
  },

  "sql-c-prod-safety": {
    scenario: "You're asked to fix one customer's data directly in the production database. What's your process?",
    answer: {
      summary:
        "Treat manual production changes like code: write the statement, preview its effect with a SELECT, get it reviewed, run it in a transaction, check the affected row count before committing, and record what you did.",
      points: [
        "Run SELECT with the exact same WHERE first and confirm the rows and count.",
        "START TRANSACTION; run the UPDATE/DELETE; compare 'rows affected' with the expected count; COMMIT or ROLLBACK.",
        "sql_safe_updates = 1 rejects UPDATE/DELETE without a key-based WHERE or LIMIT.",
        "Back up the rows you'll change (SELECT them into a file or backup table) so you can revert.",
        "Use a personal, audited account with only the privileges needed; avoid working on the primary during peak traffic.",
        "Afterwards, fix the bug that caused the bad data and add a check.",
      ],
    },
  },

  "sql-c-utf8mb4": {
    scenario: "Users with emoji in their names see them saved as '????'. Explain character sets and collations in MySQL, and fix it.",
    answer: {
      summary:
        "MySQL's legacy 'utf8' (utf8mb3) stores at most 3 bytes per character, but emoji and some scripts need 4. Use utf8mb4 end to end: server, database, tables, columns and the client connection.",
      points: [
        "utf8mb4 is the default in MySQL 8 with collation utf8mb4_0900_ai_ci.",
        "Fix: ALTER TABLE ... CONVERT TO CHARACTER SET utf8mb4 (a table rebuild: do it online for large tables), and set the connection charset (e.g. charset: 'utf8mb4' in the driver).",
        "Index length: 4 bytes per character means VARCHAR(255) indexes use more bytes; mostly fine with InnoDB's DYNAMIC row format.",
        "Collation controls comparison and sorting: _ci is case-insensitive, _as/_ai accent-sensitive/insensitive, _bin binary.",
        "Joining columns with different collations can stop index use or throw 'Illegal mix of collations'.",
      ],
    },
  },

  // ---------- Security ----------
  "sql-c-sql-injection": {
    scenario: "Explain SQL injection with an example. Show how it can happen even in an ORDER BY clause, and how to fix it.",
    answer: {
      summary:
        "SQL injection happens when user input is concatenated into SQL, letting an attacker change the query's structure. Prepared statements send values separately from the SQL text, so input can never become code. Identifiers like column names can't be parameters, so allowlist them.",
      points: [
        "Login bypass: \"WHERE email = '\" + email + \"'\" with email = ' OR '1'='1' -- returns every user.",
        "Placeholders: mysql2 execute('... WHERE email = ?', [email]); Sequelize replacements/bind.",
        "ORDER BY ?: a placeholder would sort by a constant string, so people concatenate, which is injectable. Map the input to a fixed set of columns instead.",
        "Also validate LIMIT/OFFSET as integers.",
        "Defence in depth: least-privilege DB user, no detailed SQL errors to clients, WAF rules.",
      ],
      code: `const SORT_COLUMNS = { newest: "created_at DESC", price: "price ASC" };
const orderBy = SORT_COLUMNS[req.query.sort] ?? "created_at DESC";

const [rows] = await db.execute(
  "SELECT id, name, price FROM products WHERE category = ? ORDER BY " + orderBy + " LIMIT 50",
  [req.query.category],
);`,
    },
  },

  "sql-c-access-control": {
    scenario: "What database accounts and privileges should a typical Node API have?",
    answer: {
      summary:
        "Follow least privilege: separate accounts for each purpose, each with only the privileges it needs on only the schemas it needs, so a compromised app or leaked password can do limited damage.",
      points: [
        "App user: SELECT, INSERT, UPDATE, DELETE on the app schema only. No DROP, ALTER, GRANT, FILE or SUPER.",
        "Migration user: DDL privileges, used only by the deployment pipeline.",
        "Read-only user for analytics/reporting, pointed at a replica.",
        "Personal accounts for engineers with audited access, instead of a shared admin login.",
        "Restrict connecting hosts, require TLS, store credentials in a secret manager and rotate them.",
        "MySQL 8 roles make granting consistent privilege sets easier.",
      ],
      code: `CREATE USER 'api'@'10.0.%' IDENTIFIED BY '...' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'api'@'10.0.%';`,
    },
  },

  "sql-c-sensitive-data": {
    scenario: "How do you protect sensitive data (passwords, PAN/Aadhaar numbers, phone numbers) stored in MySQL?",
    answer: {
      summary:
        "Don't store what you don't need, hash what you only need to verify, encrypt what you must read back, and limit who and what can see it: at rest, in transit, in logs, and in copies.",
      points: [
        "Passwords: slow salted hashes (bcrypt/argon2) computed in the app, never reversible encryption.",
        "Highly sensitive fields: application-level encryption with keys in a KMS; the DB only sees ciphertext. Store a keyed hash (HMAC) alongside if you need exact-match lookups.",
        "Encryption at rest (InnoDB tablespace encryption / cloud disk encryption) protects stolen disks and backups; TLS protects the network.",
        "Card data: don't store it; use the payment provider's tokens.",
        "Masking: show only the last 4 digits; keep PII out of logs and analytics.",
        "Non-production copies: anonymise or generate synthetic data, never raw production dumps on laptops.",
      ],
    },
  },

  "sql-c-safe-practices": {
    scenario: "In a multi-tenant SaaS on one MySQL database, how do you guarantee one tenant can never read another tenant's rows?",
    answer: {
      summary:
        "Every query must be scoped by tenant, and that scoping must be enforced centrally rather than remembered per query: a data-access layer that always adds tenant_id, plus database-level guards where possible.",
      points: [
        "tenant_id on every tenant-owned table, leading every relevant index (tenant_id, …).",
        "Repository/ORM layer adds WHERE tenant_id = ? automatically (e.g. Sequelize scopes or a query wrapper); the tenant comes from the authenticated session, never from request input.",
        "Tests that try to access another tenant's ids through every endpoint.",
        "Stronger isolation for large or regulated customers: schema-per-tenant or database-per-tenant.",
        "Also: parameterised queries, query timeouts, result-size limits, and generic error messages.",
      ],
    },
  },

  // ---------- Sequelize + MySQL ----------
  "sql-c-sequelize-models": {
    scenario: "How do you define models in Sequelize? Why shouldn't you use sequelize.sync({ alter: true }) in production?",
    answer: {
      summary:
        "Models describe a table's columns, types, validations and options. sync() creates or alters tables to match the models automatically, which is handy for prototypes but dangerous in production: it can drop or change columns without review, can't do data migrations, and may lock big tables.",
      points: [
        "Use versioned migrations (sequelize-cli or umzug): each change is a reviewed file, run once in order, with an optional down step.",
        "Useful options: underscored: true (snake_case columns), timestamps, paranoid: true (soft delete), tableName.",
        "Model validations run in the app; also add DB constraints (allowNull: false, unique) so the database enforces them.",
        "Keep models and migrations in sync, and test migrations from an empty database in CI.",
      ],
      code: `const Order = sequelize.define("Order", {
  id:     { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  status: { type: DataTypes.ENUM("pending", "paid", "shipped", "cancelled"), allowNull: false, defaultValue: "pending" },
  total:  { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: "orders", underscored: true });`,
    },
  },

  "sql-c-sequelize-associations": {
    scenario: "Explain hasOne, hasMany, belongsTo and belongsToMany. Model users, orders and products with a quantity per order line.",
    answer: {
      summary:
        "belongsTo puts the foreign key on the model you call it on; hasOne and hasMany put it on the other model; belongsToMany connects two models through a junction table. Define both directions so you can include from either side.",
      points: [
        "User.hasMany(Order) + Order.belongsTo(User) → orders.user_id.",
        "Order ↔ Product is many-to-many with extra data (quantity, unit_price), so define an explicit OrderItem model as the through table.",
        "Set onDelete/onUpdate on associations to match the database's foreign key rules.",
        "Aliases (as: 'buyer') when a model is associated twice with the same model.",
      ],
      code: `User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

Order.belongsToMany(Product, { through: OrderItem, foreignKey: "orderId" });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: "productId" });
// OrderItem: orderId, productId, quantity, unitPrice`,
    },
  },

  "sql-c-sequelize-include": {
    scenario: "What does include do in Sequelize? Why does findAll({ include: [Item], limit: 20 }) sometimes return fewer than 20 orders, or run slowly?",
    answer: {
      summary:
        "include eager-loads associations with JOINs in the same query, avoiding N+1 queries. But joining a hasMany association repeats the parent once per child, so a plain LIMIT would cut rows, not parents. Sequelize handles this with a subquery, which can be slow, or behaves unexpectedly when combined with where on the included model.",
      points: [
        "N+1: calling order.getItems() inside a loop runs one query per order. Use include or a single IN query.",
        "With include + limit on hasMany, Sequelize limits parents in a subquery first; filtering on the child (required: true / where in include) can change results.",
        "separate: true on a hasMany include loads children in a second query (WHERE order_id IN (...)): often faster and more predictable.",
        "attributes: [...] on the model and includes to avoid selecting every column.",
        "Always check the generated SQL (logging: console.log) for big includes.",
      ],
      code: `const orders = await Order.findAll({
  where: { userId },
  attributes: ["id", "status", "total", "createdAt"],
  order: [["createdAt", "DESC"]],
  limit: 20,
  include: [{ model: OrderItem, attributes: ["productId", "quantity"], separate: true }],
});`,
    },
  },

  "sql-c-sequelize-transactions": {
    scenario: "How do you run a transaction in Sequelize? What happens if one query inside it forgets the transaction option?",
    answer: {
      summary:
        "A managed transaction, sequelize.transaction(async (t) => { ... }), commits when the callback resolves and rolls back when it throws. Every query inside must receive { transaction: t }; a query without it runs on a different pool connection, outside the transaction.",
      points: [
        "Forgotten transaction option: that query commits independently (not rolled back on failure), can't see the transaction's uncommitted rows, and can even deadlock waiting on locks held by its own transaction.",
        "CLS (cls-hooked / AsyncLocalStorage via Sequelize.useCLS) passes the transaction automatically to queries in the callback.",
        "Row locks: findOne({ where, lock: t.LOCK.UPDATE, transaction: t }) → SELECT ... FOR UPDATE.",
        "Unmanaged transactions (await sequelize.transaction() then commit/rollback) need try/catch/finally discipline.",
        "Keep external API calls out of transactions.",
      ],
      code: `await sequelize.transaction(async (t) => {
  const wallet = await Wallet.findOne({ where: { userId }, lock: t.LOCK.UPDATE, transaction: t });
  if (wallet.balance < amount) throw new AppError(409, "insufficient_funds", "Not enough balance");
  await wallet.decrement("balance", { by: amount, transaction: t });
  await LedgerEntry.create({ walletId: wallet.id, amount: -amount }, { transaction: t });
});`,
    },
  },

  "sql-c-sequelize-querying": {
    scenario: "Show how you'd query with operators in Sequelize, and how to write a safe raw query with user input.",
    answer: {
      summary:
        "Use Op operators in where clauses for most queries. For raw SQL, use sequelize.query with replacements or bind parameters, never string concatenation.",
      points: [
        "Operators: { price: { [Op.between]: [100, 500] } }, { status: { [Op.in]: ['paid', 'shipped'] } }, { [Op.or]: [...] }, { name: { [Op.like]: '%phone%' } }.",
        "raw: true returns plain objects: much lighter for large reads.",
        "findAndCountAll runs a second COUNT query; with includes, add distinct: true to count parents correctly.",
        "Raw queries: replacements are escaped into the SQL by Sequelize; bind sends parameters to the database separately (true prepared statement). Both are safe.",
        "Specify type: QueryTypes.SELECT to get rows back directly.",
      ],
      code: `const rows = await sequelize.query(
  "SELECT id, name FROM products WHERE name LIKE :term AND price <= :max ORDER BY price LIMIT 20",
  { replacements: { term: "%" + search + "%", max: maxPrice }, type: QueryTypes.SELECT },
);`,
    },
  },

  "sql-c-sequelize-advanced": {
    scenario: "Explain Sequelize hooks, scopes, paranoid models and bulk operations. Why don't hooks fire on Model.update with a where clause?",
    answer: {
      summary:
        "Hooks run code around model lifecycle events, scopes are reusable query presets, paranoid models soft-delete with deletedAt, and bulk methods operate on many rows in one query. Bulk methods run a single SQL statement without loading each instance, so per-instance hooks don't run unless you ask for individualHooks.",
      points: [
        "Hooks: beforeCreate (hash passwords), afterCreate, beforeUpdate. Keep them small; hidden side effects surprise people.",
        "Model.update(values, { where }) fires beforeBulkUpdate; individualHooks: true loads every row and fires instance hooks (slow for large updates).",
        "Scopes: defaultScope to exclude secret fields (passwordHash) or soft-deleted rows; named scopes like active.",
        "paranoid: true makes destroy set deletedAt and queries exclude deleted rows; paranoid: false to include them.",
        "bulkCreate(rows, { updateOnDuplicate: ['price'] }) → INSERT ... ON DUPLICATE KEY UPDATE for upserts.",
      ],
    },
  },

  "sql-c-sequelize-performance": {
    scenario: "An endpoint implemented as one Sequelize findAll takes 4 seconds and 800 MB of memory. How do you investigate and fix it?",
    answer: {
      summary:
        "Look at the SQL Sequelize generates and how many rows come back. Usually it's loading far too many rows or columns, a deep include causing row fan-out, or missing indexes, made worse by building a heavy model instance for every row.",
      points: [
        "Enable logging (with benchmark: true) to see the SQL and its time; run EXPLAIN on it.",
        "No limit: findAll loads the whole table; paginate.",
        "Deep includes (orders → items → product → category) multiply rows; use separate: true or split queries.",
        "Model instances are heavy (getters, change tracking); use raw: true and attributes for large reads.",
        "Add indexes that match the generated WHERE and ORDER BY.",
        "For reports, a hand-written aggregate SQL query often beats ORM loops by orders of magnitude.",
      ],
    },
  },

  "sql-c-sequelize-problems": {
    scenario: "What problems do teams commonly hit running Sequelize with MySQL in production?",
    answer: {
      summary:
        "Connection pool exhaustion, time zone confusion, precision surprises with DECIMAL/BIGINT, unhandled constraint errors, and schema drift between models and migrations.",
      points: [
        "SequelizeConnectionAcquireTimeoutError: pool too small for the load, connections held too long (slow queries, long transactions, leaked unmanaged transactions), or MySQL max_connections reached. Tune pool.max/acquire and fix the slow paths.",
        "Time zones: set timezone: '+00:00' and store UTC; convert at the edges.",
        "DECIMAL and BIGINT come back as strings to avoid losing precision in JS numbers; parse deliberately (money as integer paise or a decimal library).",
        "SequelizeUniqueConstraintError / ForeignKeyConstraintError should become 409/422 responses, not 500s.",
        "Models drifting from the real schema: rely on migrations as the source of truth.",
      ],
    },
  },
};
