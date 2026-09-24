// HLD content: Building blocks + Social & content.
// `scenario`, `requirements`, `constraints` are shown up front (no hints).
// `solution` stays hidden until the student reveals it.
// flow rows: [from, to, what happens]

export default {
  "hld-url-shortener": {
    scenario:
      "Marketing teams paste very long campaign links into SMS and social posts, and want short links like sho.rt/aZ3kQ9 instead. Anyone who opens a short link should land on the original page almost instantly, and the marketing team wants to know how many times each link was opened.",
    requirements: [
      "Create a short link for any long URL",
      "Opening a short link redirects to the original URL",
      "Show click counts per link",
      "Links never change once created",
    ],
    constraints: ["100M new links per month", "Reads outnumber writes about 100:1", "Redirect in under 50 ms at p99", "Keep links for 5 years"],
    solution: {
      summary:
        "A write path that turns a unique counter into a base62 code and stores code → URL, and a read path that serves redirects from cache, with click events counted asynchronously so they never slow the redirect.",
      parts: [
        ["API service (stateless)", "Creates links and serves redirects; scaled horizontally behind a load balancer."],
        ["ID generator / key range service", "Hands each API server a block of unique numbers; the number is base62-encoded into a 7-character code (62^7 ≈ 3.5 trillion)."],
        ["Links DB (key-value / NoSQL)", "code → { longUrl, createdAt, owner }. Partitioned by code; ~100M × 60 months × ~500 B ≈ 3 TB."],
        ["Cache (Redis)", "Hot code → URL mappings; most traffic hits a small set of links."],
        ["Click queue (Kafka)", "Redirect handler publishes a click event and returns immediately."],
        ["Analytics workers + store", "Consume clicks, aggregate counts per link per day."],
      ],
      flow: [
        ["Client", "API service", "POST /links { longUrl }"],
        ["API service", "ID generator", "Take the next number from its pre-allocated range"],
        ["API service", "Links DB", "Store code → longUrl, return https://sho.rt/{code}"],
        ["Browser", "API service", "GET /{code}"],
        ["API service", "Cache → Links DB", "Look up the URL; on a miss read the DB and fill the cache"],
        ["API service", "Browser", "302 redirect to longUrl"],
        ["API service", "Click queue → Analytics", "Publish a click event; workers update the counters"],
      ],
      decisions: [
        "Counter + base62 over hashing: no collisions to check. Pre-allocating ranges per server avoids a central bottleneck.",
        "302 instead of 301 so every click reaches us and can be counted (301 gets cached by browsers).",
        "Analytics are async and eventually consistent; the redirect path only does one cache read.",
        "Read-heavy, so cache aggressively; the DB only has to absorb cache misses.",
      ],
    },
  },

  "hld-pastebin": {
    scenario:
      "Developers want to share code snippets and logs through a link. They paste text, optionally choose how long it should live, and get back a URL they can send to someone else. Most pastes are read a handful of times; a few get shared widely.",
    requirements: ["Create a paste and get a unique link", "View a paste by its link", "Optional expiry (1 hour to never)", "Pastes are immutable"],
    constraints: ["1M new pastes per day", "Average paste 10 KB, max 1 MB", "5:1 read-to-write ratio", "Low latency reads worldwide"],
    solution: {
      summary: "Keep small metadata in a database and the paste body in object storage, serve popular pastes from a CDN, and delete expired pastes with a background job.",
      parts: [
        ["API service", "Creates pastes, returns links, serves reads."],
        ["Key generator", "Pre-generated random 8-character keys, handed out so creation never collides."],
        ["Metadata DB", "key → { objectPath, expiresAt, size, createdAt }."],
        ["Object storage (S3)", "Paste content stored by key; cheap and durable."],
        ["CDN", "Caches paste content for popular links close to readers."],
        ["Cleanup job", "Periodically finds expired pastes and deletes metadata and objects."],
      ],
      flow: [
        ["Client", "API service", "POST /pastes { content, expiresIn }"],
        ["API service", "Key generator", "Take an unused key"],
        ["API service", "Object storage", "Upload content under that key"],
        ["API service", "Metadata DB", "Save key, object path and expiry; return the link"],
        ["Reader", "CDN → API service", "GET /{key}; CDN serves it if cached"],
        ["API service", "Metadata DB → Object storage", "Check it hasn't expired, fetch content"],
      ],
      decisions: [
        "Separating metadata from blobs keeps the DB small and fast (1M × 10 KB/day would bloat it).",
        "Expiry is checked on read too, so an expired paste is never served even before cleanup runs.",
        "Random keys (not sequential) so pastes can't be enumerated.",
      ],
    },
  },

  "hld-rate-limiter": {
    scenario:
      "Your public API is being hammered by a few clients running aggressive scripts, which slows everyone else down. You need to limit how many requests each client can make, for example 100 requests per minute per API key, across a fleet of API servers.",
    requirements: [
      "Limit requests per client per time window",
      "Different limits per endpoint or plan",
      "Tell clients when they're limited and when to retry",
      "Limits apply across all API servers, not per server",
    ],
    constraints: ["50 API servers", "1M requests per second at peak", "Adds under 5 ms to each request", "If the limiter fails, the API must stay up"],
    solution: {
      summary:
        "A shared, in-memory counter store (Redis) checked by middleware on every request, using a sliding-window or token-bucket algorithm with atomic updates, with rules loaded from config.",
      parts: [
        ["Rate-limit middleware", "Runs in each API server (or the API gateway) before the handler."],
        ["Rules config", "Limits per plan/endpoint, cached in memory and refreshed periodically."],
        ["Redis cluster", "Holds counters or token buckets per client key; sharded by client key."],
        ["Lua script / atomic ops", "Read-and-update in one step so concurrent requests can't both slip through."],
      ],
      flow: [
        ["Client", "Load balancer → API server", "Request with API key"],
        ["Middleware", "Rules config", "Find the limit for this key and endpoint"],
        ["Middleware", "Redis", "Atomically increment the window counter (or take a token)"],
        ["Middleware", "Client", "Over the limit: 429 with Retry-After and X-RateLimit-* headers"],
        ["Middleware", "Handler", "Under the limit: continue to the real handler"],
      ],
      decisions: [
        "Token bucket allows short bursts; sliding window counter is smoother and cheap. Fixed window is simplest but allows 2× bursts at window edges.",
        "Centralised Redis gives global limits; a local in-memory pre-check can cut Redis load for obvious abusers.",
        "Fail open: if Redis is unreachable, let traffic through and alert, rather than taking the API down.",
        "Shard counters by client key so one hot client doesn't overload one node.",
      ],
    },
  },

  "hld-unique-id-generator": {
    scenario:
      "Your company is moving from a single database to many sharded databases and services. Every order, message and event still needs a unique ID, and teams would like IDs that sort roughly by creation time so recent records are easy to find.",
    requirements: ["IDs are unique across all services", "IDs are numeric and fit in 64 bits", "IDs roughly increase over time", "Generate IDs without a round trip to a central database"],
    constraints: ["10,000+ IDs per second per machine", "Hundreds of machines", "Must keep working if one machine fails"],
    solution: {
      summary: "Snowflake-style IDs generated locally: a timestamp, a machine ID and a per-millisecond sequence packed into 64 bits.",
      parts: [
        ["41 bits: timestamp (ms)", "Milliseconds since a custom epoch; lasts ~69 years."],
        ["10 bits: machine ID", "Up to 1,024 generators; assigned from config or a coordination service (ZooKeeper/etcd)."],
        ["12 bits: sequence", "Counter within the same millisecond: 4,096 IDs per ms per machine."],
        ["ID library", "Runs inside each service; no network call to get an ID."],
      ],
      flow: [
        ["Service startup", "Coordination service", "Claim a unique machine ID"],
        ["Service", "ID library", "Request an ID"],
        ["ID library", "Clock", "Read current ms; if same ms as last ID, increment sequence"],
        ["ID library", "Service", "Return (timestamp << 22) | (machine << 12) | sequence"],
      ],
      decisions: [
        "UUIDs are simple but 128-bit and not time-ordered (bad for index locality).",
        "DB auto-increment or a ticket server is a single point of failure and a bottleneck.",
        "If the sequence overflows within a ms, wait for the next ms.",
        "If the clock moves backwards (NTP), refuse to generate until it catches up, to avoid duplicates.",
      ],
    },
  },

  "hld-key-value-store": {
    scenario:
      "Build a key-value database that other teams can use for session data, carts and user settings. It must keep working when individual machines fail and scale by simply adding machines.",
    requirements: ["put(key, value) and get(key)", "Data is replicated so a machine failure loses nothing", "Add or remove machines without downtime", "Configurable consistency per use case"],
    constraints: ["Values under 10 KB", "Billions of keys", "Low latency (single-digit ms)", "Highly available, even during network partitions"],
    solution: {
      summary:
        "A leaderless, Dynamo-style cluster: consistent hashing spreads keys across nodes, each key is replicated to N nodes, and reads/writes use tunable quorums.",
      parts: [
        ["Consistent hashing ring", "Keys and nodes hashed onto a ring; virtual nodes even out load."],
        ["Replication (N = 3)", "Each key stored on the next N distinct nodes clockwise."],
        ["Coordinator", "Any node that receives a request forwards it to the key's replicas."],
        ["Quorum (W, R)", "Write succeeds after W acks; read waits for R replies. R + W > N gives strong-ish consistency."],
        ["Versioning", "Vector clocks or last-write-wins timestamps to resolve conflicting writes."],
        ["Gossip + hinted handoff + anti-entropy", "Detect failures, temporarily store writes for down nodes, repair with Merkle trees."],
      ],
      flow: [
        ["Client", "Any node (coordinator)", "put(key, value)"],
        ["Coordinator", "Hash ring", "Find the N replica nodes for this key"],
        ["Coordinator", "Replicas", "Send the write; wait for W acknowledgements"],
        ["Client", "Coordinator", "get(key)"],
        ["Coordinator", "Replicas", "Read from R replicas, return the newest version, repair stale replicas"],
      ],
      decisions: [
        "Choosing AP (available during partitions) over CP, with tunable R/W for teams that need stronger consistency.",
        "Virtual nodes make adding a machine move only a small slice of data.",
        "Writes go to a commit log then an in-memory table flushed to SSTables (LSM tree) for fast writes.",
      ],
    },
  },

  "hld-distributed-cache": {
    scenario:
      "Your product pages load slowly because every request reads the same data from the database, and the database is close to its limit. Design a caching layer that many services can share to take read load off the database.",
    requirements: ["get / set / delete with a TTL", "Shared by many services", "Cache survives a single node failure", "Stale data is kept within acceptable bounds"],
    constraints: ["500K reads per second", "Hundreds of GB of hot data", "Sub-millisecond reads", "Database can handle only a fraction of that traffic"],
    solution: {
      summary: "A sharded, replicated in-memory cache (Redis Cluster) used with the cache-aside pattern, with TTLs, invalidation on writes and protection against stampedes and hot keys.",
      parts: [
        ["Cache cluster", "Keys spread across shards by hash slot; each shard has a replica."],
        ["Client library", "Knows the slot map, routes keys to the right shard."],
        ["Cache-aside logic in services", "Read cache → on miss read DB → write cache with TTL."],
        ["Invalidation", "On DB write, delete the cache key (or publish an invalidation event)."],
        ["Eviction", "LRU/LFU when memory is full."],
      ],
      flow: [
        ["Service", "Cache", "GET product:42"],
        ["Service", "Database", "Miss: read the row"],
        ["Service", "Cache", "SET product:42 with a TTL (plus random jitter)"],
        ["Writer service", "Database", "Update product 42"],
        ["Writer service", "Cache", "DELETE product:42 so the next read refreshes it"],
      ],
      decisions: [
        "Cache-aside is simple and resilient; write-through keeps cache fresher but adds write latency.",
        "Stampede protection: a short lock or request coalescing so only one request rebuilds a missing key.",
        "TTL jitter prevents many keys expiring at the same moment.",
        "Hot keys: replicate to multiple keys (key#1..key#N) or add a small in-process cache.",
      ],
    },
  },

  "hld-web-crawler": {
    scenario:
      "A search startup needs to download billions of web pages to build its index, and re-download them regularly to catch changes. Crawling must be fast but polite: it should never overload any single website.",
    requirements: ["Start from seed URLs and follow links", "Store downloaded pages for indexing", "Avoid downloading the same page twice", "Respect robots.txt and per-site rate limits", "Recrawl pages periodically"],
    constraints: ["1 billion pages per month", "Average page 100 KB", "Websites can be slow, broken or malicious"],
    solution: {
      summary: "A distributed pipeline: a prioritised, per-host URL frontier feeds fetcher workers; pages are stored, parsed for links, and new links are deduplicated before re-entering the frontier.",
      parts: [
        ["URL frontier", "Priority queues (importance) in front of per-host queues (politeness)."],
        ["DNS cache", "Avoids a DNS lookup bottleneck."],
        ["Fetcher workers", "Download pages with timeouts, respecting robots.txt."],
        ["Content store", "Raw pages in object storage; content hash to detect duplicates."],
        ["Parser / link extractor", "Extracts and normalises links."],
        ["URL seen-set", "Bloom filter + DB to skip URLs already crawled."],
      ],
      flow: [
        ["Scheduler", "URL frontier", "Pick the next URL whose host is allowed to be crawled now"],
        ["Fetcher", "DNS cache → Website", "Download the page"],
        ["Fetcher", "Content store", "Save the page; skip if its content hash already exists"],
        ["Parser", "Page", "Extract and normalise links"],
        ["Parser", "URL seen-set", "Drop links already seen"],
        ["Parser", "URL frontier", "Enqueue new links with a priority"],
      ],
      decisions: [
        "One host maps to one queue/worker, so per-host politeness is easy to enforce.",
        "Bloom filter gives cheap membership checks with a small false-positive rate.",
        "Limit depth and URL length to escape spider traps.",
        "~400 pages/second average; ~100 TB of storage per month.",
      ],
    },
  },

  "hld-notification-system": {
    scenario:
      "An e-commerce app needs to tell users about order updates, payment status, price drops and marketing offers through push notifications, SMS and email. Different teams want to trigger notifications without knowing how each channel works.",
    requirements: [
      "One API for teams to send notifications",
      "Support push, SMS and email",
      "Respect each user's preferences and opt-outs",
      "Retry failed sends; never send the same notification twice",
    ],
    constraints: ["10M notifications per day, bursts of 50M for sales", "Transactional messages (OTPs, orders) must go out within seconds", "Third-party providers can be slow or fail"],
    solution: {
      summary:
        "A notification service validates requests, checks preferences, renders templates and puts messages on per-channel queues; channel workers send through providers with retries, deduplication and priority for transactional messages.",
      parts: [
        ["Notification API", "Accepts { userId, type, data, idempotencyKey }."],
        ["Preferences + contacts store", "Opt-outs, quiet hours, device tokens, phone, email."],
        ["Template service", "Renders message text per channel and language."],
        ["Queues per channel and priority", "Transactional queue separate from marketing so OTPs aren't stuck behind a sale blast."],
        ["Channel workers", "Call APNs/FCM, SMS provider, email provider; retry with backoff; dead-letter queue."],
        ["Delivery log", "Status per notification for dedup, tracking and analytics."],
      ],
      flow: [
        ["Order service", "Notification API", "Send ORDER_SHIPPED for user 42 with an idempotency key"],
        ["Notification API", "Delivery log", "Skip if this idempotency key was already processed"],
        ["Notification API", "Preferences store", "Which channels does the user allow right now?"],
        ["Notification API", "Template service → Queues", "Render and enqueue one message per channel"],
        ["Channel worker", "Provider", "Send; on failure retry with backoff, then dead-letter"],
        ["Channel worker", "Delivery log", "Record sent / failed"],
      ],
      decisions: [
        "Separate queues by priority so marketing bursts never delay OTPs.",
        "Rate-limit marketing sends to protect providers and your own app from the traffic spike when users tap.",
        "Provider failover: if the primary SMS provider errors, route to a secondary.",
      ],
    },
  },

  "hld-job-scheduler": {
    scenario:
      "Teams need to run jobs at specific times or on a schedule: send a reminder email in 24 hours, generate invoices on the 1st of every month, retry a failed payment in 30 minutes. Build a shared scheduler that runs these jobs reliably.",
    requirements: ["Schedule one-off and recurring (cron) jobs", "Run each job once at (about) the right time", "Retry failed jobs", "See job status and history"],
    constraints: ["Millions of scheduled jobs", "Tens of thousands due in the same minute at peak", "Jobs can take seconds to an hour", "Workers can crash at any time"],
    solution: {
      summary:
        "Store jobs with their next run time, have scheduler nodes poll due jobs in partitions and push them to a queue, and let workers execute them with leases, heartbeats and idempotent handlers.",
      parts: [
        ["Jobs DB", "{ id, payload, schedule, nextRunAt, status, attempts }, indexed by nextRunAt."],
        ["Scheduler nodes", "Each owns a set of partitions; polls for due jobs every second."],
        ["Job queue", "Due jobs are enqueued for workers."],
        ["Workers", "Execute jobs; heartbeat while running."],
        ["Lease / lock", "A job is claimed with an expiring lease so only one worker runs it."],
      ],
      flow: [
        ["Team service", "Scheduler API", "Create job with a cron expression"],
        ["Scheduler API", "Jobs DB", "Store with nextRunAt"],
        ["Scheduler node", "Jobs DB", "Claim jobs due now in its partitions (status → queued)"],
        ["Scheduler node", "Job queue", "Enqueue each claimed job"],
        ["Worker", "Job", "Run it, heartbeating to extend the lease"],
        ["Worker", "Jobs DB", "Mark done, or schedule a retry; for cron jobs compute the next run"],
      ],
      decisions: [
        "Partitioning jobs across scheduler nodes avoids one leader becoming the bottleneck.",
        "Guarantee is at-least-once, so job handlers must be idempotent.",
        "If a worker dies, its lease expires and another worker picks the job up.",
      ],
    },
  },

  "hld-search-autocomplete": {
    scenario:
      "As users type into the search box of a large shopping app, show the top 5 suggestions for what they've typed so far. Suggestions should reflect what people actually search for most.",
    requirements: ["Return top 5 suggestions for a prefix", "Rank by popularity", "Update rankings regularly from real searches", "Filter offensive suggestions"],
    constraints: ["10M daily users, ~10 keystrokes per search", "Response in under 100 ms", "Suggestions can be a few hours stale"],
    solution: {
      summary:
        "Build a trie from aggregated search logs offline, store the top 5 completions at every node, serve it from memory behind a cache, and rebuild it periodically.",
      parts: [
        ["Search log pipeline", "Collects queries; batch job aggregates counts per query (e.g. last 7 days)."],
        ["Trie builder", "Builds a trie where each node stores its top-k completions."],
        ["Trie servers", "Hold the trie in memory, sharded by prefix range; replicated."],
        ["Suggestion API + cache", "Caches popular prefixes; browser also caches responses."],
        ["Blocklist filter", "Removes banned phrases before serving."],
      ],
      flow: [
        ["Browser", "Suggestion API", "GET /suggest?q=iph (debounced as the user types)"],
        ["Suggestion API", "Cache", "Return cached result for 'iph' if present"],
        ["Suggestion API", "Trie server", "Walk to node 'iph', read its stored top 5"],
        ["Search service", "Log pipeline", "Record completed searches"],
        ["Batch job", "Trie builder → Trie servers", "Rebuild and swap in the new trie every few hours"],
      ],
      decisions: [
        "Precomputing top-k per node makes lookups O(prefix length), no sorting at request time.",
        "Rebuild offline rather than updating the trie on every search; staleness is acceptable.",
        "Debounce on the client and cache aggressively: most keystrokes hit short, popular prefixes.",
      ],
    },
  },

  "hld-news-feed": {
    scenario:
      "In a social app, each user follows hundreds of people. When they open the app, they should see a feed of recent posts from people they follow, newest first, loading quickly and scrolling smoothly.",
    requirements: ["Publish a post", "Show a user's home feed of posts from people they follow", "Paginate as the user scrolls", "New posts appear within seconds"],
    constraints: ["300M daily users", "Average user follows 200 accounts; some accounts have 50M followers", "Feed loads in under 200 ms"],
    solution: {
      summary:
        "Hybrid fan-out: when a normal user posts, push the post ID into each follower's precomputed feed; posts from celebrities are pulled and merged in at read time.",
      parts: [
        ["Post service + Post DB", "Stores posts; media in object storage + CDN."],
        ["Social graph service", "Who follows whom."],
        ["Fan-out workers", "On new post, append post ID to followers' feed lists."],
        ["Feed cache (Redis)", "Per-user list of recent post IDs, capped (e.g. 800)."],
        ["Feed service", "Reads feed IDs, merges celebrity posts, hydrates post details, paginates with a cursor."],
      ],
      flow: [
        ["User A", "Post service", "Create post"],
        ["Post service", "Fan-out workers (via queue)", "Post created event"],
        ["Fan-out worker", "Social graph", "Get A's followers (skip if A is a celebrity)"],
        ["Fan-out worker", "Feed cache", "Push post ID onto each follower's feed"],
        ["User B", "Feed service", "GET /feed?cursor=…"],
        ["Feed service", "Feed cache + celebrity posts", "Merge, hydrate from post cache, return a page"],
      ],
      decisions: [
        "Fan-out on write makes reads fast; fan-out on read avoids writing to 50M feeds for one celebrity post.",
        "Cursor pagination (by post ID/time) instead of offsets, so new posts don't shift pages.",
        "Only active users get fanned-out feeds; inactive users' feeds are rebuilt on demand.",
      ],
    },
  },

  "hld-instagram": {
    scenario:
      "Design a photo-sharing app where users upload photos with captions, follow other users, and scroll a feed of photos. Photos must load quickly on slow mobile networks.",
    requirements: ["Upload a photo with a caption", "Follow and unfollow users", "View a feed of followed users' photos", "Like and comment on photos"],
    constraints: ["500M daily users", "100M photos uploaded per day", "Photos must look good on every screen size", "Viewing is far more common than uploading"],
    solution: {
      summary:
        "Upload images directly to object storage with pre-signed URLs, process them asynchronously into several sizes, serve them through a CDN, and store metadata, the social graph and feeds in separate services.",
      parts: [
        ["Upload service", "Issues pre-signed upload URLs; records post metadata."],
        ["Object storage", "Original and resized images."],
        ["Image processing workers", "Resize/compress into thumbnails and multiple widths (WebP/AVIF)."],
        ["CDN", "Serves images near users."],
        ["Post / like / comment services", "Metadata in a sharded DB; counts cached."],
        ["Feed service", "Same design as a news feed (hybrid fan-out)."],
      ],
      flow: [
        ["App", "Upload service", "Request an upload URL"],
        ["App", "Object storage", "Upload the original photo directly"],
        ["Object storage", "Processing workers (queue)", "New-object event → create sizes"],
        ["Worker", "Post service", "Mark the post ready with image URLs"],
        ["Post service", "Feed fan-out", "Add to followers' feeds"],
        ["Follower's app", "Feed service → CDN", "Load feed, then fetch the right image size from the CDN"],
      ],
      decisions: [
        "Uploads bypass app servers so they don't tie up threads on large files.",
        "Store a few fixed sizes; choose per device with srcset.",
        "Like counts use sharded counters or cached aggregates rather than counting rows.",
      ],
    },
  },

  "hld-trending-hashtags": {
    scenario:
      "Show the top 10 trending hashtags in the last hour, globally and per country, on the home screen of a social network. Trends should update every minute.",
    requirements: ["Top 10 hashtags over a sliding 1-hour window", "Global and per-country trends", "Update every minute"],
    constraints: ["500K posts per second at peak", "Millions of distinct hashtags", "Approximate counts are acceptable"],
    solution: {
      summary:
        "Stream post events through a processing job that counts hashtags in small time buckets using approximate structures, keeps a top-K heap per region, and publishes results to a cache the app reads.",
      parts: [
        ["Event stream (Kafka)", "Post-created events partitioned by hashtag."],
        ["Stream processors (Flink)", "Count per hashtag per 1-minute bucket."],
        ["Count-Min Sketch + min-heap", "Memory-bounded approximate counts and top-K per partition."],
        ["Aggregator", "Merges partial top-K lists into global/country top 10."],
        ["Trends cache", "Latest results; app reads from here."],
      ],
      flow: [
        ["Post service", "Kafka", "Emit post event with hashtags and country"],
        ["Stream processor", "Sketch", "Increment counts in the current minute bucket"],
        ["Stream processor", "Aggregator", "Every minute, send local top-K for the last 60 buckets"],
        ["Aggregator", "Trends cache", "Merge and publish top 10 per region"],
        ["App", "Trends API → Cache", "Read trends"],
      ],
      decisions: [
        "Exact counts for millions of tags per window cost too much memory; sketches trade a small error for fixed memory.",
        "1-minute buckets make the sliding hour cheap: add the new bucket, drop the oldest.",
        "Rank by growth vs baseline, not raw volume, or trends would always be the same popular tags.",
      ],
    },
  },

  "hld-video-streaming": {
    scenario:
      "Design a video platform where creators upload videos and viewers watch them on phones, laptops and TVs, on networks ranging from 3G to fibre. Playback should start fast and not keep buffering.",
    requirements: ["Upload videos of any size", "Watch videos with smooth playback on any network", "Resume where the viewer left off", "Show view counts"],
    constraints: ["500 hours of video uploaded per minute", "Hundreds of millions of daily viewers", "Bandwidth is the main cost"],
    solution: {
      summary:
        "Chunked, resumable uploads to object storage, a transcoding pipeline that produces multiple resolutions split into small segments, and adaptive-bitrate playback served through CDNs.",
      parts: [
        ["Upload service", "Resumable chunked upload to object storage."],
        ["Transcoding pipeline", "Queue + workers: split video, encode to 240p–4K in parallel, package as HLS/DASH segments."],
        ["Object storage", "Originals and segments."],
        ["CDN", "Serves segments; popular videos pushed to edges."],
        ["Metadata service", "Titles, owners, status, manifests."],
        ["Watch history + view counter", "Playback position and counts (async)."],
      ],
      flow: [
        ["Creator app", "Upload service → Object storage", "Upload chunks, then complete"],
        ["Upload service", "Transcoding queue", "New video job"],
        ["Workers", "Object storage", "Write segments per resolution + manifest"],
        ["Viewer player", "Metadata service", "Get the manifest URL"],
        ["Player", "CDN", "Fetch 2–6 second segments, switching resolution as bandwidth changes"],
        ["Player", "Watch history", "Save position every few seconds"],
      ],
      decisions: [
        "Adaptive bitrate lets the player drop quality instead of buffering.",
        "Parallel transcoding of chunks cuts processing time for long videos.",
        "Live streaming differs: segments are produced in real time and pushed through the CDN with a few seconds of latency.",
      ],
    },
  },

  "hld-nested-comments": {
    scenario:
      "A discussion site lets users comment on posts and reply to comments to any depth. Threads can get huge, and readers want to sort by top, newest or controversial and expand replies on demand.",
    requirements: ["Comment on a post and reply to any comment", "Show threads with nested replies", "Upvote/downvote; sort by top, new, controversial", "Load more replies on demand"],
    constraints: ["Popular posts get 100K+ comments", "Reads vastly outnumber writes", "First page of a thread loads in under 300 ms"],
    solution: {
      summary:
        "Store comments with parent ID plus a materialised path, fetch a limited tree (top N roots, a few levels, a few replies each) per request, and keep vote scores precomputed for sorting.",
      parts: [
        ["Comments table", "{ id, postId, parentId, path, depth, authorId, body, score, createdAt }."],
        ["Materialised path", "e.g. 0001.0042.0107, so a subtree is one indexed range query."],
        ["Votes table + score", "One vote per user per comment; score updated asynchronously."],
        ["Thread cache", "Cached first page of hot threads."],
      ],
      flow: [
        ["Reader", "Comment API", "GET /posts/9/comments?sort=top"],
        ["Comment API", "Thread cache", "Hit: return"],
        ["Comment API", "Comments DB", "Miss: top 20 root comments by score, plus 3 replies each, 3 levels deep"],
        ["Reader", "Comment API", "'Load more replies' → GET children of comment X after a cursor"],
        ["Writer", "Comment API", "POST reply → insert with path = parent.path + new id; invalidate cache"],
      ],
      decisions: [
        "Adjacency list alone needs recursive queries; materialised path makes subtrees cheap.",
        "Never load a whole huge thread: bound breadth and depth per request.",
        "Delete = soft delete ('[deleted]') so replies keep their place.",
      ],
    },
  },

  "hld-like-counter": {
    scenario:
      "Every post in a social app shows a like count and a heart that's filled if the current user has liked it. Viral posts receive thousands of likes per second.",
    requirements: ["Like and unlike a post", "Show the like count on every post", "Show whether the current user has liked each post", "A user can like a post only once"],
    constraints: ["1M likes per second at peak", "Some posts receive 50K likes per second", "Counts can lag a few seconds; per-user state must be exact"],
    solution: {
      summary:
        "Store each like as a (user, post) record for correctness, but serve counts from buffered or sharded counters updated asynchronously, so hot posts never hammer a single row.",
      parts: [
        ["Likes store", "(postId, userId) with a unique key; source of truth."],
        ["Like event queue", "Like/unlike events for counting."],
        ["Counter aggregator", "Batches increments per post (e.g. every second) into the count store."],
        ["Count cache", "postId → count, read by the feed."],
        ["User-likes lookup", "Batch check: which of these 50 posts has this user liked?"],
      ],
      flow: [
        ["User", "Like API", "POST /posts/9/like"],
        ["Like API", "Likes store", "Insert (post 9, user 42); ignore if it already exists"],
        ["Like API", "Queue", "Emit +1 for post 9"],
        ["Aggregator", "Count cache/DB", "Every second, apply the batched sum per post"],
        ["Feed", "Count cache + user-likes lookup", "Render counts and filled hearts for 50 posts at once"],
      ],
      decisions: [
        "UPDATE count = count + 1 on one row serialises writes; batching or sharded counters fixes the hot row.",
        "Uniqueness comes from the likes store, not the counter, so double-taps can't double count.",
        "Counts are eventually consistent, which users don't notice.",
      ],
    },
  },

  "hld-leaderboard": {
    scenario:
      "A mobile game wants a live leaderboard: after each match, a player's score updates, and they can see the global top 100 and their own rank with the players just above and below them.",
    requirements: ["Update a player's score after each match", "Show the global top 100", "Show a player's rank and nearby players", "Daily, weekly and all-time boards"],
    constraints: ["50M players", "10K score updates per second", "Rank lookups in under 50 ms"],
    solution: {
      summary: "Redis sorted sets keyed by board (daily/weekly/all-time) give O(log n) score updates and rank queries; the database remains the durable record.",
      parts: [
        ["Game service", "Reports match results."],
        ["Score DB", "Durable player scores and match history."],
        ["Redis sorted sets", "ZADD/ZINCRBY to update, ZREVRANGE for top N, ZREVRANK for a player's rank."],
        ["Board keys", "lb:daily:2026-09-24, lb:weekly:2026-39, lb:alltime; old boards expire."],
      ],
      flow: [
        ["Game service", "Score DB", "Save match result"],
        ["Game service", "Redis", "ZINCRBY on each active board"],
        ["App", "Leaderboard API → Redis", "ZREVRANGE 0 99 for top 100"],
        ["App", "Leaderboard API → Redis", "ZREVRANK for the player, then ZREVRANGE rank-5..rank+5"],
      ],
      decisions: [
        "Sorted sets do exactly what's needed with logarithmic cost.",
        "If one node isn't enough, shard by score range or show approximate ranks (percentile buckets) for low-ranked players.",
        "Rebuild Redis from the DB if it's lost.",
      ],
    },
  },
};
