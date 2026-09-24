// Day 2 interview bank, part 2: SQL & Postgres, SQLAlchemy, migrations, MongoDB. Assembled in d02.js.

export const sql = {
  title: "SQL and PostgreSQL",
  questions: [
    {
      id: "joins",
      q: "Explain INNER, LEFT, RIGHT and FULL joins.",
      level: "Basic",
      common: true,
      answer:
        "**INNER JOIN** returns only rows with a match in both tables. **LEFT JOIN** returns every row from the left table, with NULLs where the right side has no match (e.g. all users, even those without orders). **RIGHT JOIN** is the mirror image. **FULL OUTER JOIN** returns all rows from both sides, matched where possible. A common trick: `LEFT JOIN ... WHERE right.id IS NULL` finds rows with no match (users who never ordered).",
      detail: [
        {
          lang: "sql",
          code: `-- users with their order count, including users with zero orders
SELECT u.email, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.email;`,
        },
      ],
    },
    {
      id: "where-having",
      q: "WHERE vs HAVING?",
      level: "Basic",
      common: true,
      answer:
        "`WHERE` filters rows **before** grouping; `HAVING` filters groups **after** `GROUP BY`, so it can use aggregates. Example: `WHERE status = 'paid'` then `GROUP BY city HAVING SUM(amount) > 100000`.",
    },
    {
      id: "indexes",
      q: "How do indexes work, and when don't they help?",
      level: "Intermediate",
      common: true,
      answer:
        "Most indexes are **B-trees**: sorted structures that let the database find rows by a column value in O(log n) instead of scanning the whole table. They speed up `WHERE`, `JOIN` and `ORDER BY` on indexed columns but cost extra storage and slow down writes. They don't help much on small tables, on low-selectivity columns (like a boolean), when a function is applied to the column (`WHERE lower(email) = ...` needs an expression index), or with leading-wildcard `LIKE '%text'`.",
      followups: ["What's a composite index, and does column order matter?", "What is a covering index?"],
    },
    {
      id: "composite-index",
      q: "Does column order matter in a composite index?",
      level: "Intermediate",
      answer:
        "Yes. An index on `(user_id, created_at)` can serve queries filtering on `user_id` alone, or on `user_id` and `created_at` (and sort by `created_at` within a user), but not efficiently on `created_at` alone: it works like a phone book sorted by last name then first name. Put equality-filtered columns first, then range or sort columns.",
    },
    {
      id: "explain",
      q: "How do you investigate a slow SQL query?",
      level: "Intermediate",
      common: true,
      answer:
        "Run `EXPLAIN ANALYZE` to see the actual plan and timings: look for sequential scans on big tables, bad row estimates, expensive sorts and nested loops over many rows. Then add or fix indexes, rewrite the query (avoid functions on indexed columns, reduce `SELECT *`), paginate, check for N+1 patterns in the application, and make sure statistics are up to date (`ANALYZE`). `pg_stat_statements` shows the slowest queries in production.",
    },
    {
      id: "acid",
      q: "What does ACID mean?",
      level: "Basic",
      common: true,
      answer:
        "**Atomicity**: a transaction's changes all happen or none do. **Consistency**: transactions move the database from one valid state to another, respecting constraints. **Isolation**: concurrent transactions don't see each other's partial work (to a degree set by the isolation level). **Durability**: once committed, changes survive crashes. Postgres is fully ACID.",
    },
    {
      id: "isolation-levels",
      q: "What are transaction isolation levels?",
      level: "Advanced",
      common: true,
      answer:
        "They trade consistency for concurrency. **Read Uncommitted** could see uncommitted data (Postgres treats it as Read Committed). **Read Committed** (Postgres default) sees only committed data, but re-reading a row can show new values (non-repeatable reads). **Repeatable Read** gives a consistent snapshot for the whole transaction. **Serializable** behaves as if transactions ran one after another, and may abort some with serialization errors you must retry.",
      detail: [
        {
          table: {
            head: ["Anomaly", "Meaning"],
            rows: [
              ["Dirty read", "Reading another transaction's uncommitted change"],
              ["Non-repeatable read", "Reading the same row twice and getting different values"],
              ["Phantom read", "Re-running a query and getting new rows that match"],
              ["Lost update", "Two transactions read, modify and write, and one overwrites the other"],
            ],
          },
        },
      ],
    },
    {
      id: "locking",
      q: "Optimistic vs pessimistic locking?",
      level: "Advanced",
      common: true,
      answer:
        "**Pessimistic** locking takes a lock before changing data (`SELECT ... FOR UPDATE`), so others wait; good when conflicts are likely, like stock for a flash sale. **Optimistic** locking doesn't lock: each row has a `version` column, and the update is `WHERE id = :id AND version = :v`; if zero rows changed, someone else updated first, so you retry or report a conflict (409). Good when conflicts are rare, like editing a profile.",
    },
    {
      id: "normalisation",
      q: "What is normalisation? When would you denormalise?",
      level: "Intermediate",
      answer:
        "Normalisation organises data so each fact is stored once (e.g. customer details in `customers`, referenced by id from `orders`), avoiding update anomalies and inconsistency. Denormalising (duplicating data, like storing `customer_name` on orders or a precomputed `order_count`) speeds up reads and reporting at the cost of keeping copies in sync. Start normalised, denormalise specific hot paths when measurements justify it.",
    },
    {
      id: "pk-uuid",
      q: "Auto-increment integer IDs vs UUIDs as primary keys?",
      level: "Intermediate",
      answer:
        "Integers are small, fast to index and human-friendly, but predictable (exposing counts and inviting ID guessing) and generated centrally. UUIDs can be generated anywhere, don't reveal counts and merge easily across systems, but are bigger and random UUIDv4 values fragment B-tree indexes; time-ordered UUIDv7 fixes most of that. A common pattern is an internal integer key with a public UUID or slug in URLs.",
    },
    {
      id: "window-functions",
      q: "What are window functions? Find the top 2 products by revenue in each category.",
      level: "Advanced",
      common: true,
      answer:
        "Window functions compute values across a set of related rows **without collapsing them** like `GROUP BY` does: ranking, running totals, moving averages, comparisons with previous rows. `ROW_NUMBER()`, `RANK()` and `DENSE_RANK()` with `PARTITION BY` solve \"top N per group\" questions, which are very common in SQL rounds.",
      detail: [
        {
          lang: "sql",
          code: `SELECT category, name, revenue
FROM (
  SELECT category, name, SUM(amount) AS revenue,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY SUM(amount) DESC) AS rn
  FROM order_items
  GROUP BY category, name
) ranked
WHERE rn <= 2;

-- second-highest salary (a classic):
SELECT DISTINCT salary FROM employees ORDER BY salary DESC OFFSET 1 LIMIT 1;`,
        },
      ],
    },
    {
      id: "cte",
      q: "What is a CTE?",
      level: "Intermediate",
      answer:
        "A Common Table Expression (`WITH name AS (SELECT ...)`) is a named temporary result used within one query. It makes complex queries readable step by step, can be referenced several times, and `WITH RECURSIVE` handles hierarchies such as category trees or org charts.",
    },
    {
      id: "jsonb",
      q: "What is JSONB in PostgreSQL, and when would you use it?",
      level: "Intermediate",
      answer:
        "JSONB stores JSON in a binary, indexable format. You can query inside it (`data->>'city'`), index it with GIN indexes, and mix it with relational columns. Use it for flexible attributes (product specs, metadata on RAG chunks, raw LLM responses) while keeping core fields as real columns with constraints. It gives Postgres some document-database flexibility.",
    },
    {
      id: "connection-limits",
      q: "Why might a Python service run out of database connections, and what's PgBouncer?",
      level: "Advanced",
      answer:
        "Each process has its own pool: 4 Uvicorn workers × (pool_size 10 + overflow 10) × 5 containers can mean 400 connections, above Postgres's typical limits, and each connection uses server memory. Fix by sizing pools deliberately, closing sessions reliably, and adding **PgBouncer** (or RDS Proxy), a lightweight connection pooler that multiplexes many client connections onto fewer database connections.",
    },
    {
      id: "soft-delete",
      q: "What is a soft delete, and what are its trade-offs?",
      level: "Intermediate",
      answer:
        "Instead of `DELETE`, set a `deleted_at` timestamp and filter it out in queries. It allows undo, audit trails and keeps references intact, but every query must remember the filter (easy to leak deleted data), unique constraints need partial indexes (`WHERE deleted_at IS NULL`), and data protection rules may still require real deletion of personal data.",
    },
  ],
};

export const orm = {
  title: "SQLAlchemy and ORMs",
  questions: [
    {
      id: "core-vs-orm",
      q: "What's the difference between SQLAlchemy Core and the ORM?",
      level: "Intermediate",
      answer:
        "**Core** is a SQL expression language: you build `select()`, `insert()`, `update()` statements against tables and get rows back; close to SQL, great for bulk operations and reports. The **ORM** maps classes to tables and rows to objects, tracks changes in a session (unit of work), and manages relationships. In 2.0 both share the same `select()` style, so you can mix them.",
    },
    {
      id: "session-uow",
      q: "What is a Session in SQLAlchemy? What are the unit of work and identity map?",
      level: "Intermediate",
      common: true,
      answer:
        "A Session is the ORM's workspace for one unit of work (typically one request). It keeps an **identity map** (each database row loaded once per session corresponds to exactly one Python object) and tracks new, changed and deleted objects, then writes them all in the right order at flush/commit (the **unit of work** pattern). Sessions are not thread- or task-safe, so use one per request.",
    },
    {
      id: "flush-commit",
      q: "What's the difference between `flush()` and `commit()`?",
      level: "Intermediate",
      answer:
        "`flush()` sends pending INSERT/UPDATE/DELETE statements to the database inside the current transaction (so you get generated IDs and constraint errors early) but doesn't make them permanent. `commit()` flushes and then commits the transaction, making changes durable and visible to others. `rollback()` discards everything since the transaction began.",
    },
    {
      id: "expire-on-commit",
      q: "What does `expire_on_commit` do, and why set it to False in async apps?",
      level: "Advanced",
      answer:
        "By default, after `commit()` all loaded objects are expired, so the next attribute access reloads them from the database. In async code, that implicit reload can't happen lazily (it raises `MissingGreenlet`), and returning a just-committed object in a FastAPI response would fail. `expire_on_commit=False` keeps the in-memory values; call `await session.refresh(obj)` when you need server-generated values.",
    },
    {
      id: "loading-strategies",
      q: "`joinedload` vs `selectinload` vs lazy loading?",
      level: "Intermediate",
      common: true,
      answer:
        "**Lazy** loading queries a relationship the first time you access it, which causes N+1 queries and isn't allowed in async SQLAlchemy. **`joinedload`** fetches related rows in the same query via a JOIN, best for many-to-one relations (product → owner). **`selectinload`** runs one extra `SELECT ... WHERE id IN (...)` per relationship, best for one-to-many collections (user → orders), avoiding row duplication from JOINs.",
    },
    {
      id: "bulk-ops",
      q: "How do you insert or update many rows efficiently?",
      level: "Advanced",
      answer:
        "Avoid adding thousands of ORM objects one by one with a commit each. Use a single transaction, `session.execute(insert(Model), [dict, dict, ...])` (Core bulk insert with executemany), `update(Model).where(...).values(...)` for set-based updates, Postgres `INSERT ... ON CONFLICT DO UPDATE` for upserts, and batches of a few thousand rows. For huge loads, Postgres `COPY` is fastest.",
    },
    {
      id: "integrity-race",
      q: "Why isn't \"check if exists, then insert\" enough to prevent duplicates?",
      level: "Intermediate",
      common: true,
      answer:
        "Two concurrent requests can both check, both find nothing, and both insert. The reliable guard is a **unique constraint** in the database; the application catches `IntegrityError` on commit, rolls back, and returns 409. The pre-check is still useful for a friendly message in the common case, but the constraint guarantees correctness.",
    },
    {
      id: "sqlmodel",
      q: "SQLModel vs SQLAlchemy?",
      level: "Intermediate",
      answer:
        "SQLModel (by FastAPI's author) combines SQLAlchemy models and Pydantic models into one class, reducing duplication for simple CRUD apps. It's built on SQLAlchemy, so you still use sessions and `select()`. Plain SQLAlchemy 2.0 with separate Pydantic schemas is more explicit and widely used in larger codebases, and separate schemas keep API contracts independent of table design.",
    },
    {
      id: "raw-sql-safety",
      q: "How do you run raw SQL safely with SQLAlchemy?",
      level: "Basic",
      common: true,
      answer:
        "Use `text()` with **bound parameters**: `session.execute(text(\"SELECT * FROM users WHERE email = :email\"), {\"email\": email})`. The driver sends values separately from the SQL, so they can't change the query. Never build SQL with f-strings or string concatenation from user input; for dynamic identifiers like sort columns, map user choices through an allow-list.",
    },
    {
      id: "repository-pattern",
      q: "Why use a repository layer instead of querying the ORM directly in routes?",
      level: "Intermediate",
      answer:
        "It isolates data access behind a small interface (`get`, `list`, `add`), so routes and services don't depend on SQLAlchemy details. You can swap storage (Postgres to MongoDB), optimise queries in one place, and unit-test services with fake repositories. The trade-off is some extra code; for tiny apps, calling the session in services can be fine.",
    },
  ],
};

export const migrations = {
  title: "Database migrations",
  questions: [
    {
      id: "why-migrations",
      q: "Why do you need migrations?",
      level: "Basic",
      common: true,
      answer:
        "The schema changes over time. Migrations are versioned, reviewable scripts that apply those changes in order, identically on every environment, and can be rolled back. They're committed with the code that needs them, so any environment can be brought to the right schema with one command (`alembic upgrade head`). `create_all()` can't alter existing tables and keeps no history.",
    },
    {
      id: "autogenerate-limits",
      q: "What are the limits of Alembic autogenerate?",
      level: "Intermediate",
      answer:
        "It compares models with the live schema, so it treats renames as drop + add (data loss), may miss some changes (certain server defaults, some type changes, constraints without names), only sees imported models, and generates no data migrations. Always review and edit generated scripts, and test them against a copy of production-like data.",
    },
    {
      id: "zero-downtime",
      q: "How do you change a schema without downtime?",
      level: "Advanced",
      common: true,
      answer:
        "Make every step backward-compatible with the code that's running. **Expand → migrate → contract**: add new columns or tables (nullable or with defaults), deploy code that writes to both old and new, backfill data in batches, switch reads to the new structure, then remove the old column in a later release. Create large indexes with `CREATE INDEX CONCURRENTLY`, and avoid long table locks during peak traffic.",
    },
    {
      id: "run-migrations",
      q: "Where should migrations run in a deployment?",
      level: "Intermediate",
      answer:
        "As a separate, single step before the new application version receives traffic: a one-off job or CI/CD step running `alembic upgrade head`. Not inside every app instance at startup, where several instances could race to apply the same migration. Keep migrations backward-compatible so old instances keep working during a rolling deploy.",
    },
  ],
};

export const mongo = {
  title: "MongoDB and NoSQL",
  questions: [
    {
      id: "sql-vs-nosql",
      q: "SQL vs NoSQL: how do you choose?",
      level: "Intermediate",
      common: true,
      answer:
        "Choose relational (Postgres) for structured data with relationships, joins, strict constraints and multi-entity transactions (orders, payments, users). Choose a document store (MongoDB) for flexible or varying schemas, nested data read as a whole, and simple access patterns that need horizontal scaling. Also consider team expertise and the ecosystem: Postgres with JSONB and pgvector covers many \"NoSQL\" and vector needs in one system.",
    },
    {
      id: "embed-reference",
      q: "Embedding vs referencing documents in MongoDB?",
      level: "Intermediate",
      common: true,
      answer:
        "**Embed** related data that's read together and bounded in size (an order's line items, a user's addresses): one read, atomic updates. **Reference** (store ids) when data is shared, large, unbounded or updated independently (products referenced by many orders, a user's thousands of messages). Watch the 16 MB document limit and avoid arrays that grow forever.",
    },
    {
      id: "mongo-indexes",
      q: "How do indexes work in MongoDB? What's the ESR rule?",
      level: "Advanced",
      answer:
        "Like SQL, MongoDB uses B-tree indexes on fields, including compound, multikey (arrays), text, TTL and unique indexes. For compound indexes the **ESR rule** suggests ordering fields as **E**quality filters first, then **S**ort fields, then **R**ange filters. Use `explain(\"executionStats\")` to check that queries use an index (IXSCAN) instead of a collection scan (COLLSCAN).",
    },
    {
      id: "mongo-transactions",
      q: "Does MongoDB support transactions?",
      level: "Intermediate",
      answer:
        "Single-document operations are always atomic. Multi-document ACID transactions are supported on replica sets and sharded clusters (MongoDB 4.0+ / 4.2+), with more overhead than in relational databases. Good schema design (embedding data that changes together) reduces the need for them.",
    },
    {
      id: "aggregation",
      q: "What is the aggregation pipeline?",
      level: "Intermediate",
      answer:
        "A sequence of stages that transform documents: `$match` (filter), `$group` (aggregate), `$sort`, `$project` (reshape), `$lookup` (join another collection), `$unwind` (flatten arrays), `$facet` and more. Put `$match` early so indexes can be used and fewer documents flow through the pipeline.",
    },
    {
      id: "mongo-python",
      q: "What are PyMongo, Motor and Beanie?",
      level: "Basic",
      answer:
        "**PyMongo** is the official Python driver (synchronous, with a native async API in recent versions). **Motor** is the older official async driver built on PyMongo. **Beanie** is an async ODM built on Pydantic, like Mongoose: document classes, validation, typed queries, indexes and relations. In FastAPI apps, Beanie or the async PyMongo API avoid blocking the event loop.",
    },
    {
      id: "chat-history-schema",
      q: "How would you store chat history for an LLM chatbot in MongoDB vs Postgres?",
      level: "Intermediate",
      common: true,
      answer:
        "In **Postgres**: a `conversations` table and a `messages` table (conversation_id, role, content, token counts, created_at) with an index on (conversation_id, created_at); easy to paginate, analyse and delete per user. In **MongoDB**: a conversations collection, with messages as separate documents referencing the conversation (not an unbounded embedded array), indexed the same way. Either way: load only recent messages for the prompt, store metadata like model and tokens, and support deletion for privacy requests.",
    },
    {
      id: "sharding",
      q: "What is sharding?",
      level: "Advanced",
      answer:
        "Splitting a large dataset across multiple servers (shards) by a shard key, so storage and write load scale horizontally. Choosing the shard key is critical: it should spread writes evenly and match common queries, so most queries hit one shard. MongoDB supports it natively; with Postgres it's done with extensions like Citus or at the application level. Most applications don't need it until they're very large; replicas and indexing come first.",
    },
  ],
};
