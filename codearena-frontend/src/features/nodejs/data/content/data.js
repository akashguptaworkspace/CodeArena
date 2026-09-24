// Databases, caching & queues. Shape: see ../nodejs.js
export default {
  "node-sql-injection": {
    scenario: "What's wrong with this code, and how do you fix it? The client can also choose the sort column.",
    code: `app.get("/users", async (req, res) => {
  const rows = await db.query(
    "SELECT * FROM users WHERE name = '" + req.query.name + "' ORDER BY " + req.query.sort
  );
  res.json(rows);
});`,
    answer: {
      summary:
        "User input is concatenated into SQL, so input like ' OR '1'='1 changes the query's meaning (SQL injection): an attacker can read, change or delete data. Pass values as parameters so the driver sends them separately from the SQL, and allowlist identifiers like column names, which can't be parameterised.",
      points: [
        "Placeholders: ? in mysql2, $1 in pg. The database treats them strictly as values.",
        "Column names, table names and sort direction can't be placeholders; map allowed inputs to known SQL.",
        "ORMs are safe by default, but raw query helpers inside them (sequelize.query, knex.raw) with string building are just as vulnerable.",
        "Also: SELECT * leaks every column (password hashes!). Select explicit fields.",
        "Defence in depth: a DB user with least privilege, so an injection can't DROP tables.",
      ],
      code: `const SORTABLE = { name: "name", created: "created_at" };

app.get("/users", async (req, res) => {
  const sort = SORTABLE[req.query.sort] ?? "created_at";
  const [rows] = await db.execute(
    "SELECT id, name, email FROM users WHERE name = ? ORDER BY " + sort + " LIMIT 50",
    [req.query.name],
  );
  res.json(rows);
});`,
    },
  },

  "node-orm-vs-raw": {
    scenario: "Sequelize/Prisma, a query builder like Knex, or raw SQL: what are the trade-offs?",
    answer: {
      summary:
        "ORMs map tables to models and speed up everyday CRUD, relations and migrations, but they hide the SQL, which can produce inefficient queries. Query builders keep you close to SQL while making queries composable and safe. Raw SQL gives full control for complex reports and performance-critical paths.",
      points: [
        "ORM wins: productivity, validation hooks, associations, migrations, type safety (Prisma).",
        "ORM costs: N+1 queries from lazy loading, over-fetching, awkward complex queries, abstraction leaks.",
        "Always log generated SQL in development and check EXPLAIN for slow endpoints.",
        "Common real-world mix: ORM for CRUD, raw parameterised SQL (or views) for reports and hot paths.",
        "Slow ORM report: look at the SQL, add indexes, rewrite with a single aggregate query, or precompute.",
      ],
    },
  },

  "node-transactions": {
    scenario: "Implement a money transfer between two wallets in Node with MySQL/Postgres. It must never lose money or allow a negative balance.",
    answer: {
      summary:
        "Run both updates in one transaction on the same connection, committing only if both succeed and rolling back on any error. Prevent races by making the debit conditional (UPDATE ... WHERE balance >= amount and check affected rows) or by locking the rows with SELECT ... FOR UPDATE.",
      points: [
        "Without a transaction, a crash between debit and credit loses money.",
        "Race: two transfers read balance 100 at the same time, both see enough funds, both debit → -50. A conditional UPDATE or row lock serialises them.",
        "Lock rows in a consistent order (e.g. by wallet ID) to avoid deadlocks; retry on deadlock errors.",
        "Get a dedicated connection from the pool for the transaction and release it in finally.",
        "Keep transactions short: no HTTP calls to payment providers inside them.",
        "Record a ledger entry for each movement for auditing, with an idempotency key.",
      ],
      code: `async function transfer(fromId, toId, amount) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [debit] = await conn.execute(
      "UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?",
      [amount, fromId, amount],
    );
    if (debit.affectedRows !== 1) throw new AppError(409, "insufficient_funds", "Not enough balance");
    await conn.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", [amount, toId]);
    await conn.execute("INSERT INTO ledger (from_id, to_id, amount) VALUES (?, ?, ?)", [fromId, toId, amount]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}`,
    },
  },

  "node-n-plus-one": {
    scenario: "The endpoint that lists 50 orders with their customer names makes 51 database queries. Explain and fix it.",
    answer: {
      summary:
        "That's the N+1 problem: one query for the list, then one more query per item to load related data. Each query is a round trip, so latency grows with list size. Load the related data in one go with a JOIN or a single IN (...) query, or ORM eager loading.",
      points: [
        "Usually caused by await inside a loop, or ORM lazy-loaded associations accessed in a loop.",
        "Fix with a JOIN, or: collect the customer IDs, SELECT ... WHERE id IN (...), build a map, attach.",
        "ORM: include/eager loading (Sequelize include, Prisma include).",
        "GraphQL resolvers cause it naturally; DataLoader batches all loads in one tick into one query per request.",
        "Detect: log query counts per request and alert in tests when an endpoint exceeds a threshold.",
      ],
      code: `// N+1
for (const order of orders) {
  order.customer = await Customer.findByPk(order.customerId);
}

// 2 queries total
const ids = [...new Set(orders.map((o) => o.customerId))];
const customers = await Customer.findAll({ where: { id: ids } });
const byId = new Map(customers.map((c) => [c.id, c]));
for (const order of orders) order.customer = byId.get(order.customerId);`,
    },
  },

  "node-redis-cache": {
    scenario: "Product pages are slow because each view queries the DB. Add Redis caching, and explain how you keep it correct and safe under load.",
    answer: {
      summary:
        "Use cache-aside: read from Redis; on a miss, read from the DB, store the result with a TTL, and return it. On updates, write the DB and then delete (or update) the cache key. Protect against stampedes, where many requests miss at once and all hit the DB.",
      points: [
        "Delete-on-write is safer than update-on-write (avoids racing writers leaving stale values); TTL is the safety net for missed invalidations.",
        "Stampede fixes: single-flight per key (only one request rebuilds, others wait), a short Redis lock (SET NX PX), or refreshing hot keys before they expire, plus jitter on TTLs so keys don't expire together.",
        "Cache negative results briefly (product not found) to stop repeated DB hits for missing keys.",
        "If Redis is down, fall back to the DB but protect it (timeouts, circuit breaker, rate limits).",
        "Serialise compactly; keep values small; name keys with versions (product:v2:123) so you can change the format safely.",
      ],
      code: `const inFlight = new Map();

async function getProduct(id) {
  const key = "product:" + id;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  if (!inFlight.has(key)) {                // single-flight within this instance
    inFlight.set(key, (async () => {
      const product = await Product.findByPk(id);
      await redis.set(key, JSON.stringify(product), "EX", 300 + Math.floor(Math.random() * 60));
      return product;
    })().finally(() => inFlight.delete(key)));
  }
  return inFlight.get(key);
}

async function updateProduct(id, patch) {
  await Product.update(patch, { where: { id } });
  await redis.del("product:" + id);
}`,
    },
  },

  "node-job-queue": {
    scenario: "Sign-up sends a welcome email, generates an avatar and syncs to the CRM, making the endpoint take 4 seconds. Redesign it with a job queue.",
    answer: {
      summary:
        "Do the essential work (create the user) in the request, enqueue the slow side effects as background jobs, and respond immediately. Separate worker processes consume jobs from a queue (BullMQ on Redis, SQS, RabbitMQ) with retries, backoff and failure tracking.",
      points: [
        "The API becomes fast and resilient: if the email provider is down, jobs retry later instead of failing sign-up.",
        "Delivery is at-least-once: a worker can crash after doing the work but before acknowledging, so jobs run twice. Make them idempotent (e.g. store 'welcome email sent' and check it).",
        "Retries with exponential backoff; after max attempts, jobs go to a failed/dead-letter state that you monitor and can replay.",
        "Set concurrency per worker, priorities, rate limits for third-party APIs, and delayed/repeatable jobs for scheduling.",
        "Run workers as separate processes/deployments so heavy jobs don't affect API latency, and scale them independently.",
        "For 'enqueue only if the DB commit succeeded', use the outbox pattern.",
      ],
      code: `// API
const { Queue } = require("bullmq");
const emails = new Queue("emails", { connection });

await emails.add("welcome", { userId: user.id }, {
  jobId: "welcome:" + user.id,          // dedupe
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
});

// worker.js
const { Worker } = require("bullmq");
new Worker("emails", async (job) => {
  const user = await User.findByPk(job.data.userId);
  if (user.welcomeSentAt) return;        // idempotent
  await mailer.sendWelcome(user);
  await user.update({ welcomeSentAt: new Date() });
}, { connection, concurrency: 10 });`,
    },
  },

  "node-distributed-lock": {
    scenario: "A nightly billing job uses node-cron. After scaling to 5 instances, customers are billed 5 times. Fix it.",
    answer: {
      summary:
        "node-cron runs inside every instance, so every instance runs the job. Make sure it runs exactly once: run scheduling in one place (a dedicated scheduler process, a Kubernetes CronJob, or a queue's repeatable job), or have instances compete for a distributed lock. And make the job itself idempotent, because locks can fail.",
      points: [
        "Best: Kubernetes CronJob or a BullMQ repeatable job (the queue ensures one job per schedule; any worker processes it).",
        "Redis lock: SET lock:billing <uniqueToken> NX PX 60000; only the instance that gets it runs. Release with a Lua script that deletes only if the token matches, so you don't delete someone else's lock.",
        "Lock TTL shorter than the job → another instance can start mid-run. Extend the lock periodically while working, or use a fencing token checked by the database.",
        "Idempotency: bill per (customer, billing period) with a unique constraint, so a double run can't double-charge.",
        "Database-based alternative: advisory locks (pg_advisory_lock) or GET_LOCK in MySQL.",
      ],
    },
  },

  "node-mongo-vs-sql": {
    scenario: "For a new Node service, how do you decide between MongoDB and MySQL/Postgres?",
    answer: {
      summary:
        "Choose from your data's shape and your access patterns. Relational databases excel at related data, joins, constraints and multi-row transactions. MongoDB fits document-shaped data read and written as a whole, flexible or evolving schemas, and simple horizontal scaling.",
      points: [
        "Orders, payments, inventory, and anything financial with many relationships and strict consistency → relational (Postgres/MySQL).",
        "Product catalogues with varying attributes, content, event logs, user activity → documents can fit well.",
        "Mongo modelling: embed data read together (order with its line items), reference data shared or unbounded (a user's millions of events).",
        "MongoDB supports multi-document transactions now, but they're costlier and less idiomatic.",
        "Postgres JSONB gives you flexible columns inside a relational database, often the best of both.",
        "Team experience and operations matter: backups, migrations, monitoring.",
      ],
    },
  },

  "node-outbox": {
    scenario: "After creating an order you publish an 'order_created' event to a queue. Sometimes the order exists but no event was sent, or an event was sent for an order that was rolled back. Fix it.",
    answer: {
      summary:
        "Writing to the database and publishing to a queue are two separate systems, so they can't be made atomic directly. With the outbox pattern, you insert the event into an outbox table in the same DB transaction as the order. A separate relay reads unsent outbox rows, publishes them, and marks them sent.",
      points: [
        "Commit succeeds → the event is guaranteed to be stored; rollback → neither the order nor the event exists.",
        "Relay: polls the outbox (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100) or tails the DB's change log (Debezium CDC).",
        "The relay can publish and then crash before marking sent, so events can be delivered twice: consumers must dedupe by event ID.",
        "'Send after commit()' fails if the process crashes or the broker is down right after commit: the event is lost.",
        "Clean up or archive sent rows periodically.",
      ],
      code: `await sequelize.transaction(async (t) => {
  const order = await Order.create(data, { transaction: t });
  await Outbox.create(
    { id: randomUUID(), type: "order_created", payload: { orderId: order.id } },
    { transaction: t },
  );
});
// relay loop: read unsent rows → publish → mark sent_at`,
    },
  },

  "node-migrations": {
    scenario: "You must rename the column users.phone to users.mobile on a 50-million-row table, with zero downtime. How?",
    answer: {
      summary:
        "During a deploy, old and new versions of the app run at the same time, so every schema change must work with both. Use expand → migrate → contract: add the new column, write to both, backfill in batches, switch reads, and only drop the old column in a later release.",
      points: [
        "Release 1: add mobile (nullable, no default rewrite); app writes both phone and mobile, reads phone.",
        "Backfill in small batches (e.g. 5,000 rows) with pauses, so you don't lock the table or overload replicas.",
        "Release 2: read from mobile (falling back to phone if null), still write both.",
        "Release 3: stop writing phone; later, drop the column.",
        "On big MySQL tables, some ALTERs lock or copy the table: use online DDL (ALGORITHM=INPLACE/INSTANT) or gh-ost/pt-online-schema-change.",
        "Migrations live in version control and run automatically in the pipeline (Sequelize/Knex/Prisma migrations), with a tested rollback plan.",
      ],
    },
  },
};
