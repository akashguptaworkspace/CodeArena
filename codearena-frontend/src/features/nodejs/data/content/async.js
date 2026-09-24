// Async code & errors. Shape: see ../nodejs.js
export default {
  "node-callback-hell": {
    scenario: "What is the error-first callback convention, what is callback hell, and how do you get out of it?",
    answer: {
      summary:
        "Node's classic async style passes a callback whose first argument is an error (or null) and whose second is the result. Chaining several async steps nests callbacks deeper and deeper, which makes code hard to read, and error handling is repeated at every level. Promises and async/await flatten it.",
      points: [
        "Convention: fn(args, (err, result) => { if (err) return handle(err); ... }). Always return after handling the error so the success path doesn't also run.",
        "Callback hell ('pyramid of doom'): step 2 inside step 1's callback, step 3 inside step 2's, each with its own error check.",
        "Classic bugs: calling the callback twice (e.g. once on error and once on success), throwing inside an async callback (it can't be caught by the caller's try/catch), and forgetting to call it at all.",
        "Fixes: named functions to flatten structure, promises (util.promisify), and async/await with a single try/catch.",
      ],
      code: `// Before
getUser(id, (err, user) => {
  if (err) return done(err);
  getOrders(user.id, (err, orders) => {
    if (err) return done(err);
    done(null, orders);
  });
});

// After
async function userOrders(id) {
  const user = await getUser(id);
  return getOrders(user.id);
}`,
    },
  },

  "node-promise-states": {
    scenario: "Explain how a Promise works. What does .then return, and how do errors travel through a chain?",
    answer: {
      summary:
        "A promise represents a future value. It starts pending and settles once, either fulfilled with a value or rejected with a reason. .then, .catch and .finally each return a new promise, which is what makes chaining work.",
      points: [
        "Returning a value from .then fulfils the next promise with it; returning a promise makes the chain wait for it; throwing rejects the next promise.",
        "A rejection skips .then success handlers until it reaches a .catch (or a .then with a second argument).",
        ".catch returns a new promise too: if the handler returns normally, the chain continues as fulfilled.",
        ".finally runs on either outcome and passes the original result or error through.",
        "Promise callbacks always run asynchronously as microtasks, even if the promise is already settled.",
        ".then(a, b) vs .then(a).catch(b): in the first, b does not catch errors thrown by a; in the second it does.",
      ],
      code: `fetchUser()
  .then((user) => fetchOrders(user.id)) // returns a promise: chain waits
  .then((orders) => orders.length)
  .catch((err) => { log(err); return 0; }) // recovers; chain continues
  .finally(() => closeConnection());`,
    },
  },

  "node-promise-combinators": {
    scenario: "When would you use Promise.all, Promise.allSettled, Promise.race and Promise.any?",
    answer: {
      summary:
        "all waits for every promise and fails fast on the first rejection; allSettled waits for all and reports each outcome; race settles with the first promise to settle either way; any resolves with the first success and only rejects if all fail.",
      points: [
        "Promise.all: loading independent data for one page (user, orders, recommendations) where you need all of it.",
        "Promise.allSettled: bulk operations where partial success is fine (send 50 notifications, report which failed).",
        "Promise.race: timeouts (race the work against a timer), though AbortSignal.timeout is better because it actually cancels.",
        "Promise.any: try several mirrors or replicas and take the first that works; rejects with AggregateError.",
        "Fail-fast doesn't cancel anything: when Promise.all rejects, the other operations keep running. Use AbortController to cancel them.",
      ],
      code: `const results = await Promise.allSettled(users.map(sendEmail));
const failed = results
  .map((r, i) => ({ r, user: users[i] }))
  .filter(({ r }) => r.status === "rejected");`,
    },
  },

  "node-async-await-internals": {
    scenario: "What actually happens when a function hits await? Is the thread blocked?",
    answer: {
      summary:
        "An async function always returns a promise. At each await, the function pauses and returns control to the caller; the rest of the function is scheduled as a microtask to run when the awaited promise settles. Nothing blocks the thread; it's syntax over promises (conceptually like a generator driven by promises).",
      points: [
        "Code before the first await runs synchronously when the function is called.",
        "await value wraps non-promises with Promise.resolve, so even await null yields to the microtask queue.",
        "A thrown error inside an async function becomes a rejection of its promise; try/catch around await catches rejections.",
        "return await inside try is needed if you want the local catch to handle the rejection; plain return passes it to the caller.",
        "Example: async f() { log('A'); await null; log('B') }; f(); log('C') prints A, C, B.",
      ],
      code: `async function f() {
  console.log("A");
  await null;       // pauses here; the rest is a microtask
  console.log("B");
}
f();
console.log("C");  // A, C, B`,
    },
  },

  "node-sequential-vs-parallel": {
    scenario: "Each call takes about 1 second. How long does each version take, and why?",
    code: `// Version 1
for (const id of [1, 2, 3]) {
  await fetchUser(id);
}

// Version 2
await Promise.all([1, 2, 3].map((id) => fetchUser(id)));

// Version 3
[1, 2, 3].forEach(async (id) => {
  await fetchUser(id);
});
console.log("done");`,
    answer: {
      summary:
        "Version 1 takes about 3 s because each await waits before the next call starts. Version 2 takes about 1 s because all three calls start immediately and run concurrently. Version 3 logs 'done' immediately: forEach ignores the promises its callback returns, so nothing is awaited and errors become unhandled rejections.",
      points: [
        "Sequential awaits are right only when each step depends on the previous result or you must respect ordering or rate limits.",
        "Start independent work first, then await: const [a, b] = await Promise.all([getA(), getB()]).",
        "forEach, map and filter don't understand async callbacks. Use for...of for sequential, map + Promise.all for parallel.",
        "Unlimited parallelism is also a bug: 10,000 concurrent calls can exhaust sockets, DB pools or the other service's rate limit. Use a concurrency limit.",
      ],
    },
  },

  "node-concurrency-limit": {
    scenario:
      "You need to call a partner API for 1,000 records, but it allows only 5 concurrent requests. Write a function that runs tasks with a concurrency limit and returns results in input order.",
    answer: {
      summary:
        "Use a small pool of workers that share an index into the input list. Each worker takes the next item, awaits it, and stores the result at the same index, until the list is exhausted. At most N calls are in flight at any time.",
      points: [
        "Starting only N workers is what caps concurrency; each finishes one item before taking the next.",
        "Store results by index so the order matches the input, even though tasks finish in any order.",
        "Failure policy: this version fails fast (Promise.all rejects on the first error, but other workers keep going until they check). Alternatively catch per item and return { ok, value/error }.",
        "Libraries: p-limit, p-map, or async's mapLimit. Interviewers want to see you can write it.",
        "A per-second rate limit is a different constraint: combine with a token bucket or a delay between task starts.",
      ],
      code: `async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;              // safe: JS is single-threaded between awaits
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

const users = await mapLimit(ids, 5, (id) => partnerApi.getUser(id));`,
    },
  },

  "node-unhandled-rejection": {
    scenario: "What happens when a promise rejection isn't handled, or an exception isn't caught? What should a production app do?",
    answer: {
      summary:
        "Since Node 15, an unhandled promise rejection crashes the process (like an uncaught exception). After an uncaught exception, the process may be in an unknown state (half-finished operations, leaked resources), so the safe response is to log it, try to shut down gracefully, and let the process manager restart you.",
      points: [
        "process.on('unhandledRejection') and process.on('uncaughtException') should log with full context and trigger a graceful shutdown, not swallow the error.",
        "An empty uncaughtException handler keeps a possibly broken process serving traffic: corrupted state, leaked DB connections, requests that hang forever.",
        "Operational errors (DB timeout, bad input) should be handled where they happen. Programmer errors (undefined is not a function) should crash and be fixed.",
        "Run under a supervisor (Kubernetes, PM2, systemd) so crashes lead to fast restarts, and alert on crash counts.",
        "Common source: a promise created without await or .catch (fire-and-forget calls).",
      ],
      code: `process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled rejection");
  shutdown(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  shutdown(1);
});`,
    },
  },

  "node-promisify": {
    scenario: "You have an old callback-based library. Convert it to promises, first with util.promisify and then by writing promisify yourself.",
    answer: {
      summary:
        "util.promisify turns any error-first-callback function into one that returns a promise. Writing it yourself is a function that returns a new Promise and calls resolve or reject from the callback.",
      points: [
        "The callback must follow (err, value) as the last argument.",
        "Methods need the right this: promisify(obj.method.bind(obj)).",
        "Callbacks with several result values: resolve with an array or object, or use a custom util.promisify.custom implementation.",
        "Prefer built-in promise APIs where they exist: fs/promises, timers/promises (setTimeout as a promise), stream/promises (pipeline), dns/promises.",
      ],
      code: `const { promisify } = require("node:util");
const readFile = promisify(require("node:fs").readFile);

function myPromisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, value) => (err ? reject(err) : resolve(value)));
    });
  };
}`,
    },
  },

  "node-async-error-express": {
    scenario:
      "In an Express 4 app, an async route handler throws when the database is down. The request hangs and sometimes the process crashes. Why, and how do you fix it everywhere?",
    answer: {
      summary:
        "Express 4 wraps handlers in a try/catch, which only catches synchronous throws. An async handler returns a rejected promise that Express ignores, so no response is sent (the request hangs) and the rejection is unhandled (which crashes Node 15+). Catch the promise and pass the error to next().",
      points: [
        "Wrap each async handler: const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next).",
        "Or use express-async-errors, which patches Express, or upgrade to Express 5, which forwards rejected promises to error middleware.",
        "Then one error middleware formats every error response consistently.",
        "Same trap with callbacks inside handlers (setTimeout, events): errors thrown there must be passed to next(err) manually.",
      ],
      code: `const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new NotFoundError("Order not found");
  res.json(order);
}));`,
    },
  },

  "node-retry-backoff": {
    scenario: "Calls to a payment provider sometimes fail with timeouts or 503s. Write a retry helper with exponential backoff and jitter.",
    answer: {
      summary:
        "Retry only transient failures, waiting longer after each attempt (exponential backoff) with random jitter so many clients don't retry at the same instant. Cap the delay and the number of attempts, and only retry operations that are safe to repeat.",
      points: [
        "Retryable: network errors, timeouts, 429, 502/503/504. Not retryable: 400, 401, 403, 404, 422: retrying won't help.",
        "Delay = min(cap, base × 2^attempt), with 'full jitter' = random between 0 and that value.",
        "Respect a Retry-After header when the server sends one.",
        "Non-idempotent calls (charging a card) need an idempotency key so a retry can't double-charge.",
        "At the system level, retries multiply load during outages: use a retry budget and a circuit breaker that stops calling a failing dependency for a while.",
      ],
      code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { attempts = 5, base = 100, cap = 5000, isRetryable = () => true } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts - 1 || !isRetryable(err)) throw err;
      const delay = Math.random() * Math.min(cap, base * 2 ** attempt);
      await sleep(delay);
    }
  }
}`,
    },
  },

  "node-timeout-abort": {
    scenario: "How do you add a timeout to an async call, and how do you actually cancel the work rather than just stop waiting?",
    answer: {
      summary:
        "Promise.race with a timer makes you stop waiting, but the underlying work keeps running and using resources. To really cancel, pass an AbortSignal to APIs that support it (fetch, streams, fs, timers, many DB and HTTP clients). AbortSignal.timeout(ms) creates one that aborts itself.",
      points: [
        "fetch(url, { signal: AbortSignal.timeout(3000) }) rejects with a TimeoutError and closes the connection.",
        "Combine signals with AbortSignal.any([userSignal, AbortSignal.timeout(5000)]).",
        "Cancel on client disconnect: create an AbortController per request and abort it on req 'close' (when the response isn't finished).",
        "If you use Promise.race with setTimeout, clear the timer afterwards, or it keeps the process alive and wastes memory.",
        "Your own long-running functions can accept a signal and check signal.aborted or listen for 'abort'.",
      ],
      code: `app.get("/report", async (req, res, next) => {
  const controller = new AbortController();
  res.on("close", () => { if (!res.writableEnded) controller.abort(); });

  try {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
    const data = await fetch(REPORT_URL, { signal }).then((r) => r.json());
    res.json(data);
  } catch (err) {
    next(err);
  }
});`,
    },
  },

  "node-async-local-storage": {
    scenario: "Every log line should include the current request ID, without passing it as a parameter through every function. How?",
    answer: {
      summary:
        "AsyncLocalStorage (from node:async_hooks) stores a value that follows the async call chain, like thread-local storage for async code. Set it once in middleware with run(), and any code called from that request, even after many awaits, can read it with getStore().",
      points: [
        "Common uses: request/correlation IDs in logs, the current user for auditing, a DB transaction shared by nested calls, tracing context (OpenTelemetry uses it).",
        "Each request gets its own store, so concurrent requests don't mix.",
        "Costs a little performance per async operation; it's been optimised in recent Node versions.",
        "Context can be lost across custom callback queues or some libraries that pool callbacks; AsyncResource.bind fixes those.",
      ],
      code: `const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");
const als = new AsyncLocalStorage();

app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || randomUUID();
  als.run({ requestId }, next);
});

const log = (msg) => console.log(JSON.stringify({ msg, requestId: als.getStore()?.requestId }));`,
    },
  },
};
