// Performance & scaling. Shape: see ../nodejs.js
export default {
  "node-cluster": {
    scenario: "Your server has 8 cores, but your Node API only ever uses one. How does the cluster module help, and what are its catches?",
    answer: {
      summary:
        "A Node process runs your JavaScript on one core. The cluster module forks several worker processes (usually one per core) that share the same server port; the primary process hands incoming connections to workers (round-robin on Linux). Each worker is a separate process with its own memory.",
      points: [
        "Throughput scales roughly with cores for CPU-bound request handling, and a crashed worker can be replaced by the primary.",
        "No shared memory: in-memory sessions, caches, rate limit counters and WebSocket rooms exist separately in each worker. Move them to Redis or another shared store.",
        "Scheduled jobs would run once per worker unless you coordinate them.",
        "In Docker/Kubernetes, the usual approach is one Node process per container and more replicas. The orchestrator does what cluster does, with better isolation and scheduling.",
        "PM2's cluster mode is the same mechanism with process management on top.",
      ],
      code: `const cluster = require("node:cluster");
const os = require("node:os");

if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
  cluster.on("exit", (worker) => {
    console.log("worker died", worker.process.pid);
    cluster.fork();
  });
} else {
  require("./server"); // each worker listens on the same port
}`,
    },
  },

  "node-worker-threads": {
    scenario: "Compare worker_threads, cluster and child_process. When would you pick each?",
    answer: {
      summary:
        "worker_threads run JavaScript in parallel threads inside one process, which suits CPU-heavy tasks; cluster runs several copies of your server as processes to use all cores for request handling; child_process runs separate programs or scripts (like ffmpeg or a Python script).",
      points: [
        "worker_threads: each has its own V8 isolate and event loop. Communicate with postMessage (data is copied with structured clone), transfer ArrayBuffers, or share memory with SharedArrayBuffer + Atomics.",
        "Creating a worker costs milliseconds and memory, so use a pool (piscina) sized to the number of cores.",
        "cluster: separate processes, no shared memory, scales request handling across cores.",
        "child_process: spawn (streams output, good for long processes), exec (buffers output, shell, careful with injection), execFile (no shell), fork (Node child with an IPC channel).",
        "PDF generation, image resizing or hashing per request → worker pool. Calling an external binary → child_process.spawn. Using all cores for an API → cluster or more containers.",
      ],
      code: `// main.js
const Piscina = require("piscina");
const pool = new Piscina({ filename: require.resolve("./render-pdf.js") });

app.post("/invoice/pdf", async (req, res) => {
  const pdf = await pool.run(req.body);   // runs on a worker thread
  res.type("application/pdf").send(Buffer.from(pdf));
});`,
    },
  },

  "node-cpu-heavy": {
    scenario: "An endpoint that generates a report does ~800 ms of CPU work. When a few users hit it, every other API call becomes slow. Fix it.",
    answer: {
      summary:
        "The report work is running on the main thread, so while it runs, the event loop can't serve any other request. Confirm with event loop lag metrics or a CPU profile, then take the work off the main thread: a worker thread pool for moderate work, or a background job for long work.",
      points: [
        "Verify: event loop delay spikes line up with calls to that endpoint; the CPU profile shows the report code.",
        "Worker pool (piscina): the request awaits the result while the main thread keeps serving others. Limit pool size and queue length to avoid overload.",
        "Longer work (seconds to minutes): enqueue a job (BullMQ), return 202 Accepted with a job ID, let the client poll or get notified, store the result in S3.",
        "Reduce the work: cache reports, precompute aggregates, push aggregation into SQL.",
        "Quick mitigation: split the loop into chunks with setImmediate between them. It keeps the server responsive but the work still takes CPU on the main thread.",
      ],
    },
  },

  "node-memory-leak": {
    scenario: "Memory on your Node service grows steadily until the container is OOM-killed every few hours. How do you find and fix the leak?",
    answer: {
      summary:
        "First confirm it's a leak (heap used keeps rising after GCs, rather than just a large but stable heap). Then take heap snapshots some time apart under load, compare them to find which object types keep growing, and follow their retainer chain back to the code holding them.",
      points: [
        "Metrics: process.memoryUsage() heapUsed, RSS, external over time; a sawtooth whose low points keep rising means a leak.",
        "Snapshots: node --inspect and Chrome DevTools, --heapsnapshot-signal=SIGUSR2 to dump on demand, or --heapsnapshot-near-heap-limit to capture one right before the crash.",
        "Compare: take snapshot A, apply load, take snapshot B; use the Comparison view, sorted by size delta, and look at Retainers.",
        "If you can't attach in production, reproduce in staging with the same traffic replayed, or take snapshots from one instance removed from the load balancer (taking a snapshot pauses the process).",
        "Fix the retainer (remove listeners, bound caches, clear intervals), then load-test to verify the heap stabilises.",
        "Stopgap: restarting periodically hides the problem; only use it while you find the real cause.",
      ],
    },
  },

  "node-common-leaks": {
    scenario: "What are the most common causes of memory leaks in Node applications?",
    answer: {
      summary:
        "Leaks happen when something long-lived keeps references to objects that should be garbage. In Node servers, the long-lived things are usually module-level caches and maps, event emitters, timers and closures.",
      points: [
        "Unbounded caches: const cache = {} keyed by user ID or URL, never evicted. Use an LRU with a max size and TTL (lru-cache).",
        "Event listeners added per request to a long-lived emitter (process, a shared socket, a DB client) and never removed. MaxListenersExceededWarning is the hint.",
        "setInterval or setTimeout callbacks that capture big objects and are never cleared.",
        "Closures that capture more than they need, keeping large request or response objects alive.",
        "Global arrays used as queues, logs or metrics buffers that only grow.",
        "Promises that never settle, holding their callbacks and captured data forever.",
      ],
      code: `// Leak: a new listener per request, never removed
app.get("/stream", (req, res) => {
  bus.on("update", (data) => res.write(data));
});

// Fixed
app.get("/stream", (req, res) => {
  const onUpdate = (data) => res.write(data);
  bus.on("update", onUpdate);
  req.on("close", () => bus.off("update", onUpdate));
});`,
    },
  },

  "node-heap-limit": {
    scenario: "Your container has a 2 GB memory limit, but Node crashes with 'JavaScript heap out of memory', or the container is OOM-killed. Explain the memory model.",
    answer: {
      summary:
        "V8 has its own heap size limit, separate from the container's limit. If the heap limit is too low, you get 'heap out of memory' with free container memory; if it's too high, the kernel OOM-kills the container (exit code 137) before V8 even tries a full GC. Set the heap below the container limit, leaving room for non-heap memory.",
      points: [
        "RSS = V8 heap + Buffers/external memory + native memory (thread stacks, libuv, native addons) + code.",
        "Recent Node versions size the default heap based on the container's cgroup memory; older versions used fixed defaults.",
        "--max-old-space-size=1536 on a 2 GB container leaves headroom for Buffers, sockets and the rest.",
        "Heap small but RSS large: look at external/arrayBuffers in memoryUsage() (Buffers from uploads, streams not being consumed) or native leaks.",
        "Exit 137 means SIGKILL, usually from the kernel OOM killer; 'heap out of memory' with a V8 stack trace means V8's own limit.",
      ],
    },
  },

  "node-profiling": {
    scenario: "An endpoint is slow and nobody knows why. How do you profile a Node service?",
    answer: {
      summary:
        "Figure out whether time goes to CPU on the main thread or to waiting on I/O. Use a CPU profile and flame graph for CPU time, and tracing/logging of DB and HTTP calls for waiting time.",
      points: [
        "Start from metrics: which route, p50 vs p99, CPU usage, event loop lag. High lag means CPU; low lag with slow responses means waiting.",
        "CPU: node --cpu-prof (writes a .cpuprofile you open in DevTools), --inspect with the Performance tab, or clinic flame / 0x for flame graphs. Wide bars at the top are where time goes.",
        "I/O: distributed tracing (OpenTelemetry) shows each DB query and HTTP call as a span; also slow query logs and connection pool wait times.",
        "clinic doctor gives a first diagnosis (CPU vs I/O vs GC vs event loop), bubbleprof shows async flow.",
        "Load test (autocannon, k6) to reproduce, then compare before and after each fix.",
      ],
    },
  },

  "node-pm2": {
    scenario: "What does a process manager like PM2 do for a Node app, and do you still need it in Kubernetes?",
    answer: {
      summary:
        "PM2 keeps your app running: it restarts it on crash, starts it on server boot, can run it in cluster mode across cores, manages logs, and does zero-downtime reloads. On a plain VM it's very useful; in Kubernetes the orchestrator already provides restarts, scaling and rolling deploys, so you run node directly.",
      points: [
        "pm2 start app.js -i max runs one worker per core with cluster mode.",
        "pm2 reload restarts workers one by one for zero downtime (needs graceful shutdown in your app).",
        "Crash loops: use exponential backoff restart delays and max restarts so a broken deploy doesn't burn CPU forever, and alert on restarts.",
        "Memory-based restart (max_memory_restart) is a band-aid for leaks, not a fix.",
        "Alternatives on VMs: systemd services.",
      ],
    },
  },

  "node-horizontal-scaling": {
    scenario: "Your Node API runs on one server. You now need to run 10 instances behind a load balancer. What breaks, and what must you change?",
    answer: {
      summary:
        "Anything that relies on memory or disk of a single instance breaks, because consecutive requests from one user can hit different instances. Make instances stateless: move all shared state to shared stores and coordinate background work.",
      points: [
        "Sessions → Redis or signed tokens; caches → Redis (or accept per-instance caches with short TTLs).",
        "Rate limiting counters and locks → Redis, or they'll be 10× too lenient.",
        "Uploaded files → object storage (S3), not local disk.",
        "Cron jobs → run once (a single scheduler, repeatable queue jobs, or a distributed lock).",
        "WebSockets → sticky sessions for the connection, plus Redis pub/sub (or a socket.io adapter) to deliver messages to users on other instances.",
        "Watch downstream limits: 10 instances × pool of 20 = 200 DB connections.",
        "Health checks and graceful shutdown so the load balancer only routes to healthy instances.",
      ],
    },
  },

  "node-caching-in-memory": {
    scenario: "When would you cache in the Node process's memory, and when in Redis?",
    answer: {
      summary:
        "An in-process cache is the fastest (no network hop), but each instance has its own copy, it disappears on restart, and it uses heap memory. Redis is shared by all instances and survives restarts, at the cost of a network round trip (~0.5–1 ms) and another system to run.",
      points: [
        "In-process fits small, hot, rarely changing data: feature flags, config, reference data, compiled templates. Always bound it (LRU, max entries, TTL).",
        "Redis fits data shared across instances or that must be invalidated consistently: sessions, rate limits, user-specific cached responses.",
        "Invalidation with many in-process caches: short TTLs, or publish invalidation messages via Redis pub/sub so every instance clears the key.",
        "Two-level cache: in-process LRU in front of Redis in front of the DB for very hot keys.",
      ],
    },
  },

  "node-connection-pooling": {
    scenario: "Why do Node apps use a database connection pool, and how do you choose its size?",
    answer: {
      summary:
        "Opening a DB connection takes several round trips (TCP, TLS, authentication), so doing it per query is slow and can overwhelm the database. A pool keeps a fixed set of open connections, lends one to each query, and queues queries when all are busy.",
      points: [
        "Node doesn't need a big pool: queries are I/O, so 10–20 connections per instance often serve hundreds of requests per second.",
        "Total connections = pool size × instances (× workers per instance). This must stay below the database's max_connections, with headroom for admin tools and migrations.",
        "Symptoms of a too-small pool: requests wait for a connection (measure pool wait time). Too large: DB CPU and memory contention, 'too many connections' errors when scaling out.",
        "Always release connections, including in error paths (finally, or use pool.query which releases automatically). Leaked connections exhaust the pool and hang the app.",
        "Set acquire/idle timeouts. With many instances or serverless, use a proxy pooler (PgBouncer, RDS Proxy).",
      ],
    },
  },

  "node-keepalive": {
    scenario: "Your service calls another internal API thousands of times per second. Latency is high and you see occasional ECONNRESET. What do you check?",
    answer: {
      summary:
        "Make sure outbound HTTP connections are reused (keep-alive), since a new TCP + TLS handshake per call adds significant latency and CPU. Then make sure idle timeouts line up, because reusing a socket that the server or load balancer has already closed causes ECONNRESET.",
      points: [
        "Node 19+ http.globalAgent uses keep-alive by default; fetch in Node (undici) pools connections. Older code needs new http.Agent({ keepAlive: true }).",
        "maxSockets per host limits concurrency to the downstream service; too many sockets can overload it.",
        "ECONNRESET on reused sockets: the other side closed an idle connection just as you sent a request. Set the client's idle timeout shorter than the server's/load balancer's keep-alive timeout, and retry idempotent requests once.",
        "On your own server, set server.keepAliveTimeout higher than the load balancer's idle timeout (e.g. ALB is 60 s by default), or the LB may send requests on connections Node just closed (502s).",
      ],
    },
  },

  "node-json-large": {
    scenario: "An endpoint returns a 40 MB JSON document and the whole server becomes sluggish. What are your options?",
    answer: {
      summary:
        "JSON.stringify and JSON.parse are synchronous and CPU-bound; a 40 MB document can block the event loop for hundreds of milliseconds, and the server holds several copies in memory. First reduce the payload; then stream it or move serialisation off the main thread.",
      points: [
        "Paginate and select only needed fields; most clients don't need 40 MB at once.",
        "Stream: NDJSON (one JSON object per line) or a streaming JSON writer, so rows are serialised and sent incrementally.",
        "Compress (gzip/brotli) at the reverse proxy to reduce transfer time, not CPU.",
        "Schema-based serialisers (fast-json-stringify, Fastify's response schemas) are several times faster than JSON.stringify.",
        "For large incoming JSON, set body-size limits and consider streaming parsers.",
        "If it's truly an export, make it an async job producing a file in object storage.",
      ],
    },
  },
};
