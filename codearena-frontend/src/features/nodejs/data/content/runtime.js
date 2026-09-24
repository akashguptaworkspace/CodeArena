// Event loop & runtime. Shape: see ../nodejs.js
export default {
  "node-what-is-node": {
    scenario:
      "Start with the basics: what is Node.js, how is it built, and why do companies pick it for API servers? Where would you not use it?",
    answer: {
      summary:
        "Node.js is a JavaScript runtime built on Google's V8 engine plus libuv, a C library that gives it an event loop and non-blocking I/O. Instead of one thread per request, one thread handles many connections by never waiting on I/O, which makes it very efficient for I/O-bound servers.",
      points: [
        "V8 compiles and runs JavaScript. libuv provides the event loop, async file system, DNS, and a small thread pool. Node's core modules (http, fs, crypto, stream) sit on top.",
        "Non-blocking I/O: when your code queries a database, Node hands the socket to the OS and moves on. When the result arrives, the callback is queued and run. One thread can juggle thousands of open connections.",
        "Good fits: REST/GraphQL APIs, BFFs (backend-for-frontend), API gateways and proxies, real-time apps (chat, notifications via WebSockets), streaming, and CLI tools.",
        "Poor fits: CPU-heavy work on the main thread (video transcoding, image processing, heavy ML, big number crunching). Every millisecond of CPU blocks every other request. You can offload to worker threads, but other languages may be simpler for that job.",
        "Business reasons: one language (JS/TS) across frontend and backend, a huge npm ecosystem, fast development, and good performance for typical web workloads.",
      ],
      pitfalls: [
        "Saying 'Node is multi-threaded' or 'Node is single-threaded' without nuance: your JS runs on one thread, but libuv uses OS async I/O and a thread pool.",
        "Claiming Node is faster than Java/Go in general. It's efficient for I/O concurrency, not raw CPU speed.",
      ],
    },
  },

  "node-event-loop-phases": {
    scenario:
      "Walk me through the Node.js event loop. What are its phases, and where do timers, I/O callbacks and setImmediate run?",
    answer: {
      summary:
        "The event loop is libuv's loop that runs in phases, each with its own callback queue: timers → pending callbacks → idle/prepare → poll → check → close callbacks. Between every single callback, Node drains the process.nextTick queue and then the promise microtask queue.",
      points: [
        "Timers: runs callbacks from setTimeout/setInterval whose time has passed.",
        "Pending callbacks: some system-level I/O callbacks deferred from the previous loop (e.g. certain TCP errors).",
        "Poll: retrieves new I/O events and runs their callbacks (most of your code: DB results, incoming HTTP data, file reads). If nothing else is scheduled, the loop blocks here waiting for I/O, up to the next timer.",
        "Check: runs setImmediate callbacks, right after poll.",
        "Close callbacks: e.g. socket.on('close').",
        "Microtasks: after each callback (since Node 11), Node runs all process.nextTick callbacks, then all promise callbacks, before moving to the next callback. So promises never wait for a whole phase to finish.",
        "The process exits when there are no more pending timers, handles (open servers, sockets) or requests.",
      ],
      code: `// Mental model
while (loopIsAlive) {
  runExpiredTimers();        // setTimeout / setInterval
  runPendingCallbacks();
  pollForIO();               // run I/O callbacks, maybe wait
  runImmediates();           // setImmediate
  runCloseCallbacks();
}
// After EVERY callback above: drain nextTick queue, then promise microtasks`,
      pitfalls: [
        "Saying promises run in a phase. They are microtasks that run between callbacks.",
        "Forgetting that a long synchronous callback delays everything, including timers.",
      ],
    },
  },

  "node-microtasks-order": {
    scenario: "What does this print, and why?",
    code: `console.log("1: start");

setTimeout(() => console.log("2: timeout"), 0);
setImmediate(() => console.log("3: immediate"));

Promise.resolve().then(() => console.log("4: promise"));
process.nextTick(() => console.log("5: nextTick"));

(async () => {
  console.log("6: async start");
  await null;
  console.log("7: after await");
})();

console.log("8: end");`,
    answer: {
      summary:
        "Synchronous logs first (1, 6, 8), then the nextTick queue (5), then promise microtasks in the order they were queued (4, 7), then timers and immediates (2 and 3, whose relative order isn't guaranteed from the main module).",
      points: [
        "Sync: '1: start', then the async IIFE runs synchronously up to its first await, printing '6: async start', then '8: end'.",
        "When the main script finishes, Node drains process.nextTick first: '5: nextTick'.",
        "Then promise microtasks in FIFO order: the .then was queued before the await continuation, so '4: promise', then '7: after await'.",
        "Then the event loop starts. setTimeout 0 (really 1 ms) vs setImmediate: from the main module the order depends on whether 1 ms has passed when the loop starts, so '2' and '3' can swap.",
        "Typical output: 1, 6, 8, 5, 4, 7, 2, 3 (or ..., 3, 2).",
      ],
      pitfalls: [
        "Putting promise callbacks before nextTick. In Node, nextTick goes first.",
        "Claiming setTimeout 0 always beats setImmediate.",
      ],
    },
  },

  "node-settimeout-vs-setimmediate": {
    scenario: "What's the difference between setTimeout(fn, 0) and setImmediate(fn)? Which runs first?",
    answer: {
      summary:
        "setTimeout(fn, 0) runs in the timers phase once at least 1 ms has passed; setImmediate runs in the check phase right after poll. From the main module their order is non-deterministic; inside an I/O callback setImmediate always runs first.",
      points: [
        "Node clamps a 0 ms timeout to 1 ms.",
        "Main module: when the loop starts, if 1 ms has already passed the timer fires first; if not, the loop moves through poll to check and the immediate fires first. It depends on machine speed.",
        "Inside an I/O callback you're in the poll phase; the next phase is check, so setImmediate runs before the loop comes back around to timers.",
        "Use setImmediate to yield to I/O and split up long work ('run this after pending I/O'). Use timers when you actually need a delay.",
      ],
      code: `const fs = require("node:fs");
fs.readFile(__filename, () => {
  setTimeout(() => console.log("timeout"), 0);
  setImmediate(() => console.log("immediate"));
});
// Always: immediate, timeout`,
    },
  },

  "node-nexttick-starvation": {
    scenario: "What is process.nextTick for, and how could it freeze a server?",
    answer: {
      summary:
        "process.nextTick queues a callback to run immediately after the current operation, before promise microtasks and before the event loop continues. Because Node drains the whole queue, including ticks added during draining, recursive nextTick calls can keep the loop from ever reaching I/O.",
      points: [
        "Use cases: make an API consistently async (always call the callback asynchronously), or emit an event after a constructor returns so the caller has time to attach listeners.",
        "Starvation: a function that schedules itself with nextTick runs forever without the loop reaching the poll phase. Incoming requests, timers and I/O never run.",
        "Recursive promise chains (Promise.resolve().then(loop)) starve the loop the same way, since microtasks are also drained completely.",
        "setImmediate is the safe way to yield: it runs in the check phase, so I/O gets a turn between iterations.",
      ],
      code: `// Starves the loop: the server never responds
function spin() { process.nextTick(spin); }
spin();

// Yields each iteration: I/O keeps flowing
function work(items, i = 0) {
  if (i >= items.length) return;
  process(items[i]);
  setImmediate(() => work(items, i + 1));
}`,
    },
  },

  "node-libuv-threadpool": {
    scenario: "Node is 'single-threaded', yet it has a thread pool. What uses that pool and what doesn't?",
    answer: {
      summary:
        "libuv runs the event loop and gives Node non-blocking I/O. Network I/O uses the OS's own async mechanisms (epoll on Linux, kqueue on macOS, IOCP on Windows), so it doesn't need threads. Work the OS can't do asynchronously goes to libuv's thread pool, which has 4 threads by default.",
      points: [
        "Thread pool users: most fs operations, dns.lookup (used by http when resolving hostnames), crypto.pbkdf2/scrypt/randomBytes (async), zlib compression, and some native addons.",
        "Not the pool: TCP/UDP sockets, HTTP servers and clients, pipes. These use OS event notification, so thousands of sockets cost no threads.",
        "The pool is shared. If 4 slow bcrypt/pbkdf2 hashes occupy all threads, an unrelated fs.readFile waits in the queue. This causes mysterious latency.",
        "UV_THREADPOOL_SIZE (up to 1024) can be raised, set before the pool is first used, e.g. as an environment variable. Size it to your workload and cores.",
        "dns.lookup uses the pool (getaddrinfo); dns.resolve uses c-ares on the network. Many outbound HTTP calls to uncached hostnames can saturate the pool.",
      ],
      pitfalls: ["Saying every async operation uses the thread pool. Network I/O doesn't."],
    },
  },

  "node-single-threaded": {
    scenario: "If Node runs JavaScript on a single thread, how can one process handle 10,000 concurrent connections?",
    answer: {
      summary:
        "Most of a web request's time is spent waiting on the network, database or disk. Node never blocks while waiting: it registers interest with the OS and handles whatever is ready next. One thread can therefore keep thousands of requests in progress, as long as each one uses only a little CPU.",
      points: [
        "Concurrency is not parallelism: 10,000 requests are 'in flight', but only one callback runs at any instant.",
        "Example: each request needs 2 ms of CPU and 100 ms waiting on the DB. One thread can do ~500 requests/second of CPU work while holding thousands of waiting connections.",
        "Thread-per-request servers use a thread (with its own stack memory) for each waiting request, plus context-switching costs. Node's model uses much less memory per connection.",
        "Weakness: a request that does 500 ms of CPU blocks every other request for 500 ms. Offload CPU work, or use more processes (cluster/containers) to use all cores.",
      ],
    },
  },

  "node-blocking-event-loop": {
    scenario: "What kinds of code block the event loop? In production, how would you notice and find it?",
    answer: {
      summary:
        "Anything synchronous that takes long blocks every request: sync I/O, heavy computation, huge JSON operations, and pathological regexes. You detect it by measuring event loop delay: if the loop can't come back around quickly, everything waits.",
      points: [
        "Common culprits: fs.readFileSync or other *Sync calls in handlers, crypto.pbkdf2Sync/bcrypt sync, JSON.parse/stringify of multi-MB payloads, sorting or looping over huge arrays, regexes with catastrophic backtracking, and synchronous template rendering of big pages.",
        "Symptoms: all endpoints slow down at the same moment (even /health), p99 spikes while average CPU looks moderate, timers fire late.",
        "Measure: perf_hooks.monitorEventLoopDelay() histogram, or event loop lag metrics from your APM (Datadog, New Relic, prom-client's default metrics). Alert when p99 lag > ~100 ms.",
        "Find: CPU profile (--cpu-prof, clinic flame) during a spike; log slow requests with their route; blocked-at style tooling in staging.",
        "Fix: stream instead of loading everything, chunk work with setImmediate, move CPU work to worker threads, paginate, and cap input sizes.",
      ],
      code: `const { monitorEventLoopDelay } = require("node:perf_hooks");
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => {
  console.log("loop delay p99 ms:", h.percentile(99) / 1e6);
  h.reset();
}, 10_000);`,
    },
  },

  "node-v8-basics": {
    scenario: "How does V8 execute your JavaScript, and what code patterns make it slow?",
    answer: {
      summary:
        "V8 parses JS to bytecode run by the Ignition interpreter, collects type feedback, and compiles hot functions with the TurboFan optimising compiler. Optimisations assume types and object shapes stay the same; when they change, V8 deoptimises back to slower code.",
      points: [
        "Hidden classes (shapes/maps): objects created the same way, with properties added in the same order, share a shape. That lets V8 read a property at a fixed offset.",
        "Inline caches remember the shapes seen at each property access. Monomorphic (one shape) is fastest; megamorphic (many shapes) is slow.",
        "Deoptimisation triggers: changing the type of a variable in a hot function, adding or deleting properties after creation, mixing integers and objects in arrays, using arguments in odd ways.",
        "Practical rules: initialise all fields in the constructor (even as null), keep function argument types consistent, avoid delete (set to undefined), prefer arrays of one element type.",
        "Don't micro-optimise blindly: profile first. These matter in hot loops, not in typical CRUD handlers.",
      ],
    },
  },

  "node-garbage-collection": {
    scenario: "How does V8's garbage collector work, and how does it affect a Node server?",
    answer: {
      summary:
        "V8 uses a generational GC: most objects die young, so the heap is split into a small young generation (collected often and cheaply by a scavenger) and a large old generation (collected by mark-sweep-compact, mostly concurrently). An object is kept alive if it's reachable from roots like globals, the stack, and closures.",
      points: [
        "Young generation (new space, a few MB): allocation is fast; the scavenger copies live objects between two semi-spaces. Objects surviving two scavenges are promoted to old space.",
        "Old generation: major GC marks everything reachable from roots, sweeps the rest, and compacts to reduce fragmentation. V8 does much of this incrementally and on helper threads (Orinoco) to shorten pauses.",
        "Main-thread pauses still happen; with big heaps and lots of allocation they cause latency spikes.",
        "Signs of GC trouble: rising p99 with high allocation rates, heap close to its limit (GC runs constantly, 'GC thrashing'), then an out-of-memory crash.",
        "Observe with --trace-gc, perf_hooks GC entries, or APM runtime metrics. Reduce pressure by allocating less in hot paths, streaming instead of buffering, and fixing leaks.",
      ],
    },
  },

  "node-global-objects": {
    scenario: "Coming from frontend JavaScript: which globals exist in Node and not in the browser, and vice versa?",
    answer: {
      summary:
        "Node has no window, document or DOM. The global object is globalThis (alias global), and Node adds process, Buffer, module-level helpers like require, __dirname and __filename (CommonJS only), plus timers like setImmediate. Many web APIs (fetch, URL, AbortController, TextEncoder, structuredClone) now exist in both.",
      points: [
        "process: env variables, argv, cwd(), exit codes, memoryUsage(), uptime(), signals (process.on('SIGTERM')), nextTick.",
        "Each file is its own module: top-level var/let/const are not globals like in a browser script.",
        "CommonJS wraps each file in a function providing exports, require, module, __filename, __dirname.",
        "ES modules don't have those. Use import.meta.url with fileURLToPath, or import.meta.dirname / import.meta.filename in newer Node (20.11+).",
      ],
      code: `// ESM replacement for __dirname
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Node 20.11+: import.meta.dirname`,
    },
  },

  "node-event-emitter": {
    scenario: "Explain how EventEmitter works, then write a minimal version with on, once, off and emit.",
    answer: {
      summary:
        "EventEmitter keeps a map from event name to a list of listener functions. emit calls each listener synchronously, in the order they were added, with the given arguments. Much of Node (streams, http servers, sockets) is built on it.",
      points: [
        "Listeners run synchronously inside emit; a slow listener delays the emitter and the other listeners.",
        "once wraps the listener in a function that removes itself before calling it.",
        "Special 'error' event: emitting it with no listener throws, which can crash the process. Always handle 'error' on streams and sockets.",
        "Default max of 10 listeners per event prints a MaxListenersExceededWarning. Usually it signals a leak: adding listeners per request and never removing them.",
        "events.once(emitter, name) returns a promise; events.on returns an async iterator.",
      ],
      code: `class Emitter {
  #events = new Map();

  on(name, fn) {
    if (!this.#events.has(name)) this.#events.set(name, []);
    this.#events.get(name).push(fn);
    return this;
  }

  off(name, fn) {
    const list = this.#events.get(name);
    if (list) this.#events.set(name, list.filter((l) => l !== fn && l.original !== fn));
    return this;
  }

  once(name, fn) {
    const wrapper = (...args) => {
      this.off(name, wrapper);
      fn.apply(this, args);
    };
    wrapper.original = fn;
    return this.on(name, wrapper);
  }

  emit(name, ...args) {
    const list = this.#events.get(name);
    if (!list || list.length === 0) {
      if (name === "error") throw args[0];
      return false;
    }
    for (const fn of [...list]) fn.apply(this, args); // copy: listeners may remove themselves
    return true;
  }
}`,
    },
  },

  "node-timers-accuracy": {
    scenario: "You schedule setTimeout(fn, 100) but it fires after 180 ms. Why?",
    answer: {
      summary:
        "The delay is a minimum, not a promise. The callback only runs when the loop reaches the timers phase and nothing else is running. If synchronous work or a long callback is executing, the timer waits.",
      points: [
        "A busy event loop (heavy CPU, big JSON, sync I/O) delays all timers.",
        "Timers are checked once per loop iteration, so accuracy depends on how long each iteration takes.",
        "setInterval drifts: each run is scheduled relative to when the previous one ran, and delays accumulate.",
        "For drift-free scheduling, compute the next run from a fixed start time. For real scheduling (every day at 2 am), use a scheduler or cron system, not long timers.",
        "timer.unref() lets the process exit even if the timer is pending; useful for background housekeeping timers.",
      ],
      code: `// Drift-corrected interval
function every(ms, fn) {
  const start = Date.now();
  let n = 0;
  (function tick() {
    fn();
    n += 1;
    setTimeout(tick, Math.max(0, start + n * ms - Date.now()));
  })();
}`,
    },
  },

  "node-process-signals": {
    scenario: "How do exit codes and signals work in Node, and why do they matter when running in Docker or Kubernetes?",
    answer: {
      summary:
        "Exit code 0 means success; anything else means failure, and orchestrators use it to decide restarts. Signals are how the OS asks a process to stop: SIGTERM (polite stop, sent by Docker/Kubernetes/PM2), SIGINT (Ctrl+C), and SIGKILL (immediate, can't be caught).",
      points: [
        "Prefer setting process.exitCode = 1 and letting the process finish; process.exit() stops immediately and can cut off pending log writes.",
        "When you add a handler with process.on('SIGTERM'), Node no longer exits on its own; your handler must clean up and exit.",
        "Kubernetes sends SIGTERM, waits terminationGracePeriodSeconds (30 s by default), then sends SIGKILL.",
        "If Node runs as a child of npm or a shell script, the signal may never reach it. Run node directly as PID 1 or use an init like tini (docker run --init).",
        "Common codes: 1 uncaught error, 130 after SIGINT, 137 killed by SIGKILL (often OOM), 143 after SIGTERM.",
      ],
      code: `process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down");
  server.close();            // stop taking new connections
  await db.end();            // release resources
  process.exit(0);
});`,
    },
  },
};
