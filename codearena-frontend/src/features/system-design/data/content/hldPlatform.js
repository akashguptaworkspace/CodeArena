// HLD content: Platform & infra + Location & scheduling.

export default {
  "hld-api-gateway": {
    scenario:
      "Your company has 40 microservices, and every mobile and web client call currently goes straight to individual services. Design a single entry point that handles authentication, routing and protection for all of them.",
    requirements: ["Route requests to the right service", "Authenticate every request once", "Rate-limit per client", "Stop one failing service from affecting others"],
    constraints: ["100K requests per second", "Adds under 10 ms", "Services deploy independently and change often"],
    solution: {
      summary:
        "A horizontally scaled, stateless gateway layer that applies a chain of filters (auth, rate limit, routing, timeouts, circuit breakers) using a route table loaded from a config store.",
      parts: [
        ["Gateway instances (stateless)", "Behind a load balancer; scale horizontally."],
        ["Route config", "Path/host → service, version, timeouts; hot-reloaded from a config store."],
        ["Auth filter", "Validates JWT/session, passes user identity downstream in headers."],
        ["Rate limit filter", "Per client/plan, backed by Redis."],
        ["Resilience", "Timeouts, retries (safe methods only), circuit breaker per downstream."],
        ["Observability", "Request IDs, access logs, metrics, tracing headers."],
      ],
      flow: [
        ["Client", "Load balancer → Gateway", "GET /orders/123"],
        ["Gateway", "Auth filter", "Validate token, attach X-User-Id"],
        ["Gateway", "Rate limit filter", "Allow or 429"],
        ["Gateway", "Route table", "/orders/* → order-service"],
        ["Gateway", "Order service", "Forward with timeout; circuit breaker returns fallback if open"],
      ],
      decisions: [
        "Keep business logic out of the gateway; it should only do cross-cutting concerns.",
        "Circuit breakers stop a slow service from exhausting gateway threads.",
        "A BFF (backend-for-frontend) per client type can sit behind it for aggregation.",
      ],
    },
  },

  "hld-logging-monitoring": {
    scenario:
      "Engineers need to search logs from all services when debugging, see dashboards of error rates and latency, and get alerted when something breaks. Design the platform that collects and serves this data.",
    requirements: ["Collect logs and metrics from every service", "Search logs by service, time and text", "Dashboards and alerts on metrics", "Keep logs 30 days hot, 1 year archived"],
    constraints: ["5 TB of logs per day", "Search results in seconds", "Collection must not slow down services"],
    solution: {
      summary:
        "Agents on each host ship logs to a buffer (Kafka); processors parse and index them into a search store with time-based indices, while metrics go to a time-series DB feeding dashboards and an alerting engine; old data moves to object storage.",
      parts: [
        ["Agents (Fluent Bit / OpenTelemetry)", "Tail logs, batch, ship asynchronously."],
        ["Kafka", "Absorbs bursts; decouples producers from indexing."],
        ["Log processors", "Parse, enrich, drop noise, sample debug logs."],
        ["Search store (Elasticsearch/OpenSearch)", "Daily indices, hot/warm tiers."],
        ["Object storage", "Compressed archives for long retention."],
        ["Metrics TSDB (Prometheus-like)", "Counters, gauges, histograms."],
        ["Alerting + dashboards", "Rules on metrics; on-call notifications."],
      ],
      flow: [
        ["Service", "Local agent", "Write logs to stdout/file; emit metrics"],
        ["Agent", "Kafka", "Batched logs"],
        ["Processor", "Search store", "Index into today's index"],
        ["Lifecycle job", "Object storage", "Move indices older than 30 days"],
        ["Metrics scraper", "TSDB → Alert engine", "Evaluate rules; page on-call"],
      ],
      decisions: [
        "Logs for debugging, metrics for alerting (cheap to store and query), traces for request flow.",
        "Sampling and dropping noisy logs is the main cost lever.",
        "Alert on symptoms users feel (error rate, latency) to avoid alert fatigue.",
      ],
    },
  },

  "hld-message-queue": {
    scenario:
      "Many services need to publish events (order placed, payment captured) that several other services consume at their own pace. Design a durable, scalable message queue platform like Kafka.",
    requirements: ["Producers publish to named topics", "Multiple independent consumer groups per topic", "Messages are durable and can be replayed", "Ordering for related messages"],
    constraints: ["Millions of messages per second", "No message loss if a broker dies", "Consumers can be slow or offline for hours"],
    solution: {
      summary:
        "Topics split into partitions, each an append-only replicated log on brokers; consumers in a group each own some partitions and track offsets, so they can read at their own pace and replay.",
      parts: [
        ["Brokers", "Store partitions as segment files on disk; sequential writes."],
        ["Partitions", "Unit of ordering and parallelism; key-based partitioning keeps related messages in order."],
        ["Replication", "Leader + followers per partition; in-sync replicas (ISR)."],
        ["Controller / metadata", "Leader election and partition assignment (KRaft/ZooKeeper)."],
        ["Consumer groups", "Each partition consumed by one member of a group; offsets committed."],
        ["Retention", "Time or size based; compaction for keyed topics."],
      ],
      flow: [
        ["Producer", "Partitioner", "hash(orderId) → partition 7"],
        ["Producer", "Partition 7 leader", "Append; wait for acks=all"],
        ["Leader", "Followers", "Replicate; ack once ISR has it"],
        ["Consumer (group 'billing')", "Leader", "Fetch from its committed offset"],
        ["Consumer", "Offsets store", "Commit offset after processing"],
      ],
      decisions: [
        "Ordering is only per partition; choose the key carefully.",
        "acks=all + min in-sync replicas trades a bit of latency for durability.",
        "Consumers should be idempotent: at-least-once delivery is the default.",
      ],
    },
  },

  "hld-file-storage": {
    scenario:
      "Design a file storage and sync service like Google Drive or Dropbox: users upload files from any device, see them everywhere, share them, and edits sync automatically across their devices.",
    requirements: ["Upload/download files of any size", "Automatic sync across devices", "Share files and folders with permissions", "Version history"],
    constraints: ["Files up to 50 GB", "Unreliable networks: uploads must resume", "Hundreds of millions of users"],
    solution: {
      summary:
        "Files are split into content-addressed chunks stored in object storage; a metadata service tracks files, versions and chunk lists; clients upload only changed chunks and receive change notifications to sync.",
      parts: [
        ["Client sync agent", "Watches files, chunks them (~4 MB), hashes chunks."],
        ["Block/chunk service", "Stores chunks in object storage by hash (deduplicated)."],
        ["Metadata service + DB", "Files, folders, versions (list of chunk hashes), permissions."],
        ["Notification service", "Long-poll/WebSocket 'something changed' to other devices."],
        ["Sharing/ACL service", "Who can view or edit what."],
      ],
      flow: [
        ["Device A", "Metadata service", "I have report.pdf v2 with chunks [h1, h2, h9]"],
        ["Metadata service", "Device A", "Upload only h9 (others already exist)"],
        ["Device A", "Chunk service", "Upload h9 (resumable)"],
        ["Metadata service", "DB", "Commit v2"],
        ["Notification service", "Device B", "report.pdf changed"],
        ["Device B", "Metadata → Chunk service", "Fetch v2 chunk list, download missing chunks"],
      ],
      decisions: [
        "Chunking gives resumable uploads, dedup, and delta sync.",
        "Conflicting offline edits create a 'conflicted copy' instead of silently overwriting.",
        "Metadata DB is strongly consistent; chunk storage is immutable.",
      ],
    },
  },

  "hld-image-service": {
    scenario:
      "Many parts of your product let users upload images (avatars, product photos, reviews). Build one shared service that accepts uploads safely and serves images at the right size for every screen.",
    requirements: ["Upload images from apps and web", "Serve resized/compressed versions", "Block unsafe or malicious files", "Fast delivery worldwide"],
    constraints: ["5M uploads per day", "Billions of image views per day", "Uploads up to 20 MB"],
    solution: {
      summary:
        "Clients upload directly to object storage with pre-signed URLs; an async pipeline validates and scans files; images are resized on demand at the edge (or pre-generated) and cached by a CDN.",
      parts: [
        ["Upload API", "Issues pre-signed URLs with size and type limits."],
        ["Object storage", "Originals, private by default."],
        ["Processing workers", "Validate type, strip metadata (EXIF location), virus/moderation scan."],
        ["Image transform service", "Resize, crop, convert to WebP/AVIF from URL parameters."],
        ["CDN", "Caches every transformed variant."],
      ],
      flow: [
        ["App", "Upload API", "Request upload URL"],
        ["App", "Object storage", "PUT image directly"],
        ["Storage event", "Processing workers", "Validate and scan; mark image approved"],
        ["Browser", "CDN", "GET /img/abc?w=400&fmt=webp"],
        ["CDN miss", "Transform service", "Resize from original, return and cache"],
      ],
      decisions: [
        "Servers never handle upload bytes, so they don't need to scale with upload size.",
        "On-the-fly transforms + CDN avoid storing dozens of pre-made sizes.",
        "Whitelist allowed sizes to stop attackers generating infinite variants.",
      ],
    },
  },

  "hld-auth-service": {
    scenario:
      "Build the authentication service for your company's apps: users sign up and log in with email/password or 'Login with Google', stay logged in on multiple devices, and can log out everywhere if their account is compromised.",
    requirements: ["Sign up and log in (password and Google)", "Stay logged in across sessions", "Log out of one or all devices", "Other services can verify who the user is"],
    constraints: ["50M users", "Token verification must be fast for every API call", "Protect against brute force and credential stuffing"],
    solution: {
      summary:
        "Short-lived signed access tokens (JWT) that services verify locally, plus long-lived rotating refresh tokens stored server-side so sessions can be revoked; passwords hashed with a slow algorithm; OAuth/OIDC for social login.",
      parts: [
        ["Auth service", "Signup, login, token issuing, OAuth callbacks."],
        ["User credentials DB", "Email, password hash (bcrypt/argon2), MFA settings."],
        ["Refresh token / session store", "Per device; can be revoked individually or all at once."],
        ["Signing keys + JWKS endpoint", "Services fetch public keys to verify JWTs locally."],
        ["Rate limiting / lockout", "Per account and per IP on login attempts."],
      ],
      flow: [
        ["User", "Auth service", "Log in with email + password"],
        ["Auth service", "Credentials DB", "Verify password hash"],
        ["Auth service", "Session store", "Create refresh token for this device"],
        ["Auth service", "Client", "Access token (15 min) + refresh token (httpOnly cookie)"],
        ["Client", "Any service", "Call with access token; service verifies signature locally"],
        ["Client", "Auth service", "Refresh when expired; refresh token is rotated"],
      ],
      decisions: [
        "Short access-token lifetime limits the damage of a leaked token without a lookup per request.",
        "'Log out everywhere' = delete all refresh tokens; access tokens die within minutes.",
        "Refresh token reuse detection catches stolen tokens.",
      ],
    },
  },

  "hld-feature-flags": {
    scenario:
      "Product teams want to release features gradually: turn a feature on for internal staff, then 5% of users, then everyone, and switch it off instantly if something goes wrong, without redeploying apps.",
    requirements: ["Create flags with targeting rules (user IDs, %, country, app version)", "Apps evaluate flags quickly", "Changes take effect within seconds", "Audit who changed what"],
    constraints: ["Thousands of flag checks per request in some services", "Mobile apps can be offline", "The flag service going down must not break apps"],
    solution: {
      summary:
        "Flags and rules are managed centrally but evaluated locally inside SDKs, which keep an in-memory copy of the ruleset updated via streaming, with safe defaults when nothing is available.",
      parts: [
        ["Admin UI + API", "Create/edit flags and rules; audit log."],
        ["Flag store", "Versioned rulesets per environment."],
        ["Streaming/distribution", "Pushes ruleset changes to SDKs (SSE), with CDN-cached snapshots as fallback."],
        ["Server/mobile SDKs", "Evaluate rules in memory; consistent hashing of userId for percentage rollouts."],
        ["Exposure events", "Which users saw which variation, for analysis."],
      ],
      flow: [
        ["PM", "Admin API", "Set 'new-checkout' to 5% of users"],
        ["Admin API", "Flag store", "Save ruleset v42"],
        ["Distribution", "SDKs", "Push v42"],
        ["Service", "SDK", "isEnabled('new-checkout', user) → evaluated locally"],
        ["SDK", "Analytics", "Record exposure (batched)"],
      ],
      decisions: [
        "Local evaluation keeps checks at microseconds and survives flag-service outages.",
        "Hash(userId + flag) for percentages keeps each user's experience stable.",
        "Kill switch = one rule change pushed to all SDKs within seconds.",
      ],
    },
  },

  "hld-webhook-delivery": {
    scenario:
      "Your payments platform must notify merchants' servers when events happen (payment captured, refund processed) by calling URLs they register. Merchant servers are sometimes slow, broken or down for days.",
    requirements: ["Merchants register webhook URLs per event type", "Deliver every event, retrying on failure", "Merchants can verify a webhook really came from you", "Dashboard to see and replay deliveries"],
    constraints: ["Millions of events per day", "One slow merchant must not delay others", "Events may arrive out of order"],
    solution: {
      summary:
        "Events are written to an outbox and queued per merchant; delivery workers POST signed payloads with timeouts, retry with exponential backoff, and park persistently failing deliveries for manual replay.",
      parts: [
        ["Event outbox", "Events written in the same transaction as the business change."],
        ["Queue partitioned by merchant", "Isolation so one merchant's backlog doesn't block others."],
        ["Delivery workers", "HTTP POST with short timeout; HMAC signature header."],
        ["Retry scheduler", "Backoff: 1 min, 5 min, 30 min … up to ~3 days."],
        ["Delivery log + dashboard", "Status, response codes, manual replay."],
      ],
      flow: [
        ["Payment service", "Outbox", "payment.captured (same DB transaction)"],
        ["Outbox relay", "Merchant queue", "Enqueue for each subscribed endpoint"],
        ["Delivery worker", "Merchant URL", "POST payload + signature"],
        ["Delivery worker", "Retry scheduler", "Non-2xx or timeout → schedule next attempt"],
        ["Merchant", "Dashboard", "Replay a failed delivery"],
      ],
      decisions: [
        "Include an event ID and timestamp so merchants can dedupe and ignore stale events.",
        "Don't guarantee order; merchants should fetch current state if needed.",
        "Disable an endpoint and email the merchant after prolonged failures.",
      ],
    },
  },

  "hld-otp-service": {
    scenario:
      "Your app verifies phone numbers at signup and login by sending a 6-digit one-time password by SMS. Design the OTP service, keeping it secure and affordable.",
    requirements: ["Send an OTP to a phone number", "Verify the OTP entered by the user", "OTPs expire and can be used once", "Limit resends and wrong attempts"],
    constraints: ["Peaks of 5K OTPs per second", "SMS costs money per message", "Fraudsters try to abuse the endpoint"],
    solution: {
      summary:
        "Generate a random code, store only its hash with a short TTL and attempt counter, send it through an SMS provider with failover, and protect the endpoint with layered rate limits and abuse checks.",
      parts: [
        ["OTP API", "send and verify endpoints."],
        ["OTP store (Redis)", "phone → { codeHash, expiresAt, attempts, resendCount } with TTL."],
        ["Rate limiter", "Per phone, per IP, per device, per country."],
        ["SMS provider adapters", "Primary + secondary providers with health checks."],
        ["Abuse detection", "Blocks SMS pumping (premium-rate numbers, unusual country spikes)."],
      ],
      flow: [
        ["App", "OTP API", "Send OTP to +91…"],
        ["OTP API", "Rate limiter", "Allowed?"],
        ["OTP API", "OTP store", "Save hash of the new code with 5-minute TTL"],
        ["OTP API", "SMS provider", "Send; fail over if it errors"],
        ["App", "OTP API", "Verify code: compare hash, increment attempts, delete on success"],
      ],
      decisions: [
        "Store hashes, not codes; compare in constant time.",
        "Lock after ~5 wrong attempts to stop brute force of 1M combinations.",
        "Provider delivery receipts help detect silent failures.",
      ],
    },
  },

  "hld-online-judge": {
    scenario:
      "Design an online coding judge like LeetCode: users submit code in several languages, it runs against hidden test cases, and they get Accepted, Wrong Answer, Time Limit Exceeded and so on. Contests bring big spikes.",
    requirements: ["Submit code in multiple languages", "Run it safely against test cases", "Return a verdict with runtime and memory", "Live contest leaderboard"],
    constraints: ["Untrusted code must never escape or affect other users", "10K submissions in the first minute of a contest", "Verdicts in a few seconds normally"],
    solution: {
      summary:
        "Submissions are queued and executed by a pool of sandboxed runners (containers/microVMs with no network and strict CPU, memory and time limits); results are stored and pushed back to the user.",
      parts: [
        ["Submission API", "Stores code, returns a submission ID."],
        ["Submission queue", "Separate queues for contests and practice."],
        ["Runner pool", "Autoscaled workers; each run in a fresh sandbox (gVisor/Firecracker/nsjail)."],
        ["Test case store", "Inputs and expected outputs, cached on runners."],
        ["Result service", "Verdicts; pushed to the client via WebSocket or polling."],
        ["Leaderboard", "Sorted set updated on accepted contest submissions."],
      ],
      flow: [
        ["User", "Submission API", "Submit code"],
        ["Submission API", "Queue", "Enqueue job"],
        ["Runner", "Sandbox", "Compile and run each test with limits"],
        ["Runner", "Result service", "Verdict, time, memory"],
        ["Result service", "User / Leaderboard", "Push verdict; update ranking"],
      ],
      decisions: [
        "Sandbox with no network, read-only filesystem, seccomp and cgroups limits.",
        "Pre-warm runners before contests; queue absorbs the spike.",
        "Stop at the first failing test to save compute.",
      ],
    },
  },

  "hld-analytics": {
    scenario:
      "Product teams want to know how users use the app: page views, button clicks, funnels and retention. Build an event tracking and analytics system they can query from dashboards.",
    requirements: ["SDKs send events from web and mobile", "Dashboards: counts, funnels, retention by day", "Query recent data within a minute", "Keep raw events for later analysis"],
    constraints: ["10B events per day", "Mobile devices go offline and send late", "Dashboard queries in seconds"],
    solution: {
      summary:
        "SDKs batch events to a collector, events go through Kafka into both a raw data lake and a stream job that builds rollups in a columnar OLAP store, which dashboards query.",
      parts: [
        ["Client SDKs", "Batch and retry; include event ID and client timestamp."],
        ["Collector API", "Validates and writes to Kafka; very lightweight."],
        ["Stream processing", "Dedupe by event ID, enrich (geo, device), handle late events."],
        ["Data lake (object storage, Parquet)", "All raw events, partitioned by date."],
        ["OLAP store (ClickHouse/Druid)", "Columnar store for fast aggregations."],
        ["Query/dashboards", "Predefined and ad-hoc queries."],
      ],
      flow: [
        ["App SDK", "Collector", "POST batch of events"],
        ["Collector", "Kafka", "Publish"],
        ["Stream job", "OLAP store", "Enriched events + minute rollups"],
        ["Batch job", "Data lake", "Hourly Parquet files"],
        ["Dashboard", "OLAP store", "Query funnels and counts"],
      ],
      decisions: [
        "Columnar storage makes aggregations over billions of rows fast.",
        "Pre-aggregations for common dashboards; raw data for ad-hoc analysis.",
        "Late events are merged into the right time bucket; old buckets recomputed if needed.",
      ],
    },
  },

  "hld-nearby-places": {
    scenario:
      "Users open a map app and search for restaurants, ATMs or petrol pumps near them, filtered by rating and whether they're open now. Business owners occasionally update their details.",
    requirements: ["Find places within a radius of the user", "Filter by category, rating, open now", "Show place details", "Owners can add or update places"],
    constraints: ["200M places", "Search latency under 100 ms", "Reads vastly outnumber writes"],
    solution: {
      summary:
        "Index places by geohash (or quadtree) so a radius search becomes a lookup of the user's cell and its neighbours, then filter and rank the candidates; place details are cached and updates flow into the index asynchronously.",
      parts: [
        ["Places DB", "Source of truth for place details."],
        ["Geo index", "geohash prefix → place IDs (or a quadtree in memory); read replicas."],
        ["Search service", "Computes cells covering the radius, fetches candidates, filters and ranks."],
        ["Place cache", "Details for popular places."],
        ["Update pipeline", "Owner edits → DB → index refresh."],
      ],
      flow: [
        ["User", "Search service", "Restaurants within 2 km, open now"],
        ["Search service", "Geo index", "Candidates in the user's cell + 8 neighbours"],
        ["Search service", "Filter", "Exact distance, category, open hours, rating"],
        ["Search service", "Place cache", "Hydrate details; return sorted list"],
      ],
      decisions: [
        "Geohash precision chosen so a cell ≈ search radius; widen if too few results.",
        "Quadtrees adapt to density (cities vs villages).",
        "Index changes can be minutes behind; that's acceptable for this product.",
      ],
    },
  },

  "hld-job-portal": {
    scenario:
      "Design a job portal like Naukri. Recruiters post jobs, candidates upload resumes and search/apply for jobs, candidates get alerts for matching jobs, and recruiters search candidates.",
    requirements: ["Post and search jobs with filters", "Upload resumes; apply to jobs", "Job alerts for candidates", "Recruiters see applicants and search candidates"],
    constraints: ["80M candidates, 1M active jobs", "Search under 300 ms", "Alerts daily or instant"],
    solution: {
      summary:
        "Jobs and candidate profiles live in databases and are indexed into a search engine; resumes are parsed into structured fields; a matching pipeline powers alerts; applications are tracked per job.",
      parts: [
        ["Job service + DB", "Job postings and status."],
        ["Profile service + resume parser", "Stores resumes in object storage; extracts skills, experience."],
        ["Search cluster", "Separate indices for jobs and candidates."],
        ["Application service", "Tracks application state per job/candidate."],
        ["Alert/matching pipeline", "Saved searches run against new jobs; notifications sent."],
      ],
      flow: [
        ["Recruiter", "Job service", "Post job"],
        ["Job service", "Search index", "Index the job"],
        ["Matching pipeline", "Saved searches", "Find candidates whose alerts match"],
        ["Notification service", "Candidates", "Send alert"],
        ["Candidate", "Application service", "Apply; recruiter sees it in the dashboard"],
      ],
      decisions: [
        "Resume parsing turns free text into filterable fields.",
        "Percolator-style matching (index saved queries) for instant alerts.",
        "Ranking candidates combines text match, skills overlap and recency.",
      ],
    },
  },

  "hld-calendar": {
    scenario:
      "Design a calendar app for a company: people create meetings with colleagues, see everyone's free/busy time, set up recurring meetings, and get reminders. Teams are spread across time zones.",
    requirements: ["Create one-off and recurring events with attendees", "Find a time when everyone is free", "Reminders before events", "Edit or cancel one occurrence of a recurring event"],
    constraints: ["100K employees", "Correct across time zones and daylight saving", "Free/busy lookups in under a second"],
    solution: {
      summary:
        "Store events with a recurrence rule (RRULE) and exceptions rather than every occurrence, expand occurrences on read for a date range, store times in UTC plus the organiser's time zone, and schedule reminders through a job scheduler.",
      parts: [
        ["Event service + DB", "Event, attendees, RRULE, time zone, exceptions."],
        ["Occurrence expander", "Expands recurring events within a requested range."],
        ["Free/busy service", "Precomputed busy blocks per user per day, updated on changes."],
        ["Reminder scheduler", "Schedules notifications for upcoming occurrences."],
        ["Invitation/notification service", "Invites and responses."],
      ],
      flow: [
        ["Organiser", "Event service", "Create weekly meeting with 8 attendees (Asia/Kolkata)"],
        ["Event service", "Free/busy service", "Update busy blocks for the coming months"],
        ["Organiser", "Free/busy service", "Suggest earliest common 1-hour slot"],
        ["Reminder scheduler", "Attendees", "Notify 10 minutes before each occurrence"],
        ["Attendee", "Event service", "Move one occurrence → saved as an exception"],
      ],
      decisions: [
        "Storing the rule, not every instance, keeps 'forever' recurring meetings finite.",
        "Keep the IANA time zone, not just a UTC offset, so DST changes are handled.",
        "Free/busy data is cached separately because it's read far more than events change.",
      ],
    },
  },
};
