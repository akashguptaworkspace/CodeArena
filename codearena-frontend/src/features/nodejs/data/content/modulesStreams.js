// Modules & npm, Streams, buffers & files. Shape: see ../nodejs.js
export default {
  // ---------- Modules & npm ----------
  "node-cjs-vs-esm": {
    scenario: "What are the differences between CommonJS and ES modules in Node, and how does Node decide which one a file is?",
    answer: {
      summary:
        "CommonJS uses require and module.exports, loads synchronously, and resolves at runtime. ES modules use import and export, are statically analysable, load asynchronously, and support top-level await. Node picks the system from the file extension (.cjs/.mjs) or the \"type\" field in the nearest package.json.",
      points: [
        "CJS: require can be called anywhere, even conditionally; exports are a plain object copied at require time.",
        "ESM: imports are hoisted and resolved before code runs; exports are live bindings (importers see updated values).",
        "Because ESM imports are static, bundlers can tree-shake unused exports; CJS's dynamic require makes that unreliable.",
        "ESM needs full relative paths with extensions (./util.js) and has no __dirname or require (use import.meta and createRequire).",
        "Interop: ESM can import CJS (default export is module.exports). CJS loads ESM with dynamic import(), and newer Node versions support require() of synchronous ESM.",
      ],
    },
  },

  "node-require-cache": {
    scenario: "What happens step by step when you call require('x')? Why does a module's top-level code run only once?",
    answer: {
      summary:
        "require resolves the name to a file path, checks the cache, and if it's not cached, loads the file, wraps it in a function, runs it once, and caches module.exports. Every later require of the same resolved path returns the same exports object.",
      points: [
        "Resolution order: core modules (node:fs), then relative/absolute paths (trying .js, .json, .node, and index files), then node_modules directories walking up from the current folder.",
        "The wrapper: (function (exports, require, module, __filename, __dirname) { ...your code... }). That's why these look global but are per-file.",
        "Caching makes modules act like singletons: a DB pool created in db.js is shared by everyone who requires it.",
        "Cache is keyed by resolved path. Two copies of a library at different paths (duplicated in node_modules) are two separate singletons, which breaks instanceof checks and shared state.",
        "delete require.cache[require.resolve('./x')] forces a reload; mostly used in tests or hot-reload tools.",
      ],
    },
  },

  "node-circular-deps": {
    scenario: "a.js requires b.js and b.js requires a.js. What happens, and how do you fix it?",
    answer: {
      summary:
        "Node doesn't loop forever: when b requires a while a is still loading, b receives a's exports as they are at that moment, usually incomplete. In CommonJS that's a partially filled object; in ESM, touching a binding before it's initialised throws a ReferenceError.",
      points: [
        "Typical symptom: 'x is not a function' or undefined values at startup, only in some import orders.",
        "CJS: if a.js does module.exports = {...} at the end, b gets the original empty object and never sees the new one.",
        "Fix 1: move the shared code into a third module both depend on.",
        "Fix 2: require lazily inside the function that needs it, so loading has finished by then.",
        "Fix 3: dependency injection: pass the dependency in rather than importing it.",
        "Detect with madge --circular or ESLint's import/no-cycle rule.",
      ],
    },
  },

  "node-module-exports": {
    scenario: "What's the difference between module.exports and exports? What does this module export?",
    code: `exports.a = 1;
module.exports = { b: 2 };
exports.c = 3;`,
    answer: {
      summary:
        "exports starts as a reference to module.exports, and require returns module.exports. Adding properties to either works while they point to the same object, but reassigning module.exports breaks the link. Here the module exports { b: 2 }.",
      points: [
        "exports.a = 1 adds a to the original object.",
        "module.exports = { b: 2 } replaces what require returns; the original object (with a) is discarded.",
        "exports.c = 3 still writes to the old object, which nobody sees.",
        "Rule: use exports.name = ... for several named exports, module.exports = ... to export a single function or class. Never assign exports = ...",
      ],
    },
  },

  "node-package-lock": {
    scenario: "What does package-lock.json do that package.json doesn't? Explain ^ and ~ in version ranges.",
    answer: {
      summary:
        "package.json says which versions are acceptable (ranges); package-lock.json records the exact version, source and integrity hash of every package in the tree that was actually installed. Committing the lock file makes every install reproducible.",
      points: [
        "Semver: MAJOR.MINOR.PATCH. Major = breaking changes, minor = new features, patch = bug fixes.",
        "^1.4.2 allows >=1.4.2 <2.0.0; ~1.4.2 allows >=1.4.2 <1.5.0; 1.4.2 is exact. For 0.x versions ^ is stricter (^0.4.2 means <0.5.0).",
        "Without a lock file, a new install can pull a newer patch of a transitive dependency, which can break production even though your code didn't change.",
        "The integrity hashes also protect against a tampered package with the same version.",
        "Libraries publish without the lock file influencing consumers; apps should always commit it.",
      ],
    },
  },

  "node-deps-types": {
    scenario: "When do you put a package in dependencies, devDependencies or peerDependencies?",
    answer: {
      summary:
        "dependencies are needed when the app runs; devDependencies are only needed to build, test or lint it; peerDependencies are for plugins and libraries that need the host project to provide a shared package (like React or a specific framework version).",
      points: [
        "Examples: express, pg, zod → dependencies. jest, eslint, typescript, nodemon → devDependencies.",
        "Production installs skip dev dependencies: npm ci --omit=dev. Smaller images and fewer vulnerable packages.",
        "peerDependencies avoid two copies of the same framework: an Express plugin says 'I work with the express you already have'.",
        "Mistake: putting a runtime package in devDependencies. Works locally, crashes in production with 'Cannot find module'.",
      ],
    },
  },

  "node-npm-ci": {
    scenario: "What's the difference between npm install and npm ci? Which should CI and Docker use?",
    answer: {
      summary:
        "npm ci does a clean, exact install from the lock file: it deletes node_modules, installs precisely what the lock file lists, and fails if package.json and the lock file disagree. npm install resolves ranges and may update the lock file. Use npm ci in CI and Docker builds.",
      points: [
        "npm ci never writes to package.json or package-lock.json.",
        "It's usually faster in CI because there's no dependency resolution.",
        "If it fails with a mismatch, someone changed package.json without committing the updated lock file.",
        "Use npm install locally when adding, removing or upgrading dependencies.",
      ],
    },
  },

  "node-supply-chain": {
    scenario: "A typical Node app has 1,000+ transitive dependencies. How do you keep them from becoming a security risk?",
    answer: {
      summary:
        "Reduce and pin what you install, keep it updated automatically, and scan it continuously. The lock file plus npm ci means nothing changes without a reviewed commit; audits and bots tell you when something needs updating.",
      points: [
        "Run npm audit (or Snyk/GitHub Dependabot alerts) in CI and fail on high-severity issues in production dependencies.",
        "Automated update PRs (Dependabot, Renovate) with tests keep you close to patched versions.",
        "Be careful with install scripts (postinstall runs code on your machine and CI). Consider --ignore-scripts where possible.",
        "Prefer well-maintained packages with few dependencies; remove unused ones.",
        "Watch for typosquatting (expresss) and compromised maintainer accounts; pinning plus review of lock file diffs limits blast radius.",
        "Run the app as non-root with least-privilege credentials, so a malicious package can do less damage.",
      ],
    },
  },

  // ---------- Streams, buffers & files ----------
  "node-buffer": {
    scenario: "What is a Buffer in Node, and why doesn't Node just use strings for everything?",
    answer: {
      summary:
        "A Buffer is a fixed-length sequence of raw bytes (a Uint8Array subclass) stored outside the V8 heap. Files, network packets, images and encrypted data are bytes, not text, so Node needs a way to hold and manipulate binary data efficiently.",
      points: [
        "Create: Buffer.from('hello', 'utf8'), Buffer.from(base64String, 'base64'), Buffer.alloc(1024).",
        "Convert: buf.toString('utf8' | 'hex' | 'base64'). Length is in bytes, not characters: 'हिंदी' is more bytes than characters.",
        "Buffer.alloc fills with zeros; Buffer.allocUnsafe skips that for speed, so it may contain old memory (passwords, tokens). Only use it if you overwrite everything immediately.",
        "Buffers slice without copying (buf.subarray): changing the slice changes the original.",
        "Concatenating many chunks: collect them in an array and call Buffer.concat once.",
      ],
    },
  },

  "node-streams-types": {
    scenario: "What kinds of streams does Node have? Give real examples of each.",
    answer: {
      summary:
        "Streams process data piece by piece instead of all at once. Readable streams produce data, Writable streams consume it, Duplex streams do both independently, and Transform streams are duplex streams whose output is computed from their input.",
      points: [
        "Readable: fs.createReadStream, the incoming HTTP request (req) on a server, process.stdin.",
        "Writable: fs.createWriteStream, the HTTP response (res), process.stdout.",
        "Duplex: a TCP socket (read and write are separate channels).",
        "Transform: zlib.createGzip, crypto ciphers, a CSV parser.",
        "Memory stays roughly constant (governed by highWaterMark, 64 KB for files by default) no matter how large the data is.",
        "Modes: readable streams flow (data events) or are pulled (read()); for await...of over a readable is the modern way to consume them.",
      ],
    },
  },

  "node-backpressure": {
    scenario: "You're copying a huge file to a slow network destination. What is backpressure, and what happens if you ignore it?",
    answer: {
      summary:
        "Backpressure is the signal that the consumer can't keep up with the producer. writable.write() returns false when its internal buffer is above highWaterMark; you should stop writing until the 'drain' event. If you ignore it, the data piles up in memory until the process runs out of memory.",
      points: [
        "Fast disk read (hundreds of MB/s) + slow client (1 MB/s) = the write buffer grows without limit if you keep calling write().",
        "Correct manual handling: if (!ws.write(chunk)) { rs.pause(); ws.once('drain', () => rs.resume()); }.",
        "pipe() and stream.pipeline() do this automatically, which is the main reason to use them.",
        "for await (const chunk of readable) combined with await once(ws, 'drain') handles it in async code.",
        "highWaterMark is a threshold, not a hard limit.",
      ],
      code: `const { once } = require("node:events");

async function copy(readable, writable) {
  for await (const chunk of readable) {
    if (!writable.write(chunk)) await once(writable, "drain");
  }
  writable.end();
}`,
    },
  },

  "node-large-file": {
    scenario: "Process a 10 GB log file on a server with 1 GB of RAM. Show the code.",
    answer: {
      summary:
        "fs.readFile would try to load all 10 GB into memory and fail. Stream it instead: read in chunks, process each piece, and keep only small aggregates. stream.pipeline connects the steps and handles errors and backpressure.",
      points: [
        "createReadStream reads 64 KB at a time by default; memory stays flat.",
        "For line-based data use readline (or a line-splitting transform), since chunks cut lines in the middle.",
        "Keep aggregates, not rows: counts, sums, top-K heaps.",
        "If aggregates themselves get too big (50 million unique keys), spill to disk, sort-and-merge, or use a database or approximate structures (HyperLogLog, Count-Min Sketch).",
        "To write a transformed copy, pipeline(read, transform, gzip, write).",
      ],
      code: `const fs = require("node:fs");
const readline = require("node:readline");

async function countStatusCodes(path) {
  const rl = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });
  const counts = new Map();
  for await (const line of rl) {
    const status = line.split(" ")[8];
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return counts;
}`,
    },
  },

  "node-pipeline-errors": {
    scenario: "Why is stream.pipeline() preferred over .pipe()?",
    answer: {
      summary:
        "pipe() handles backpressure but not errors: an error in one stream isn't passed along, and the other streams aren't closed, which leaks file descriptors and memory. pipeline() forwards the first error to one callback (or rejects its promise) and destroys every stream in the chain.",
      points: [
        "With pipe, you need an 'error' listener on every stream, or an error event with no listener crashes the process.",
        "Client disconnects mid-download: with pipeline, the response stream errors, and the file read stream is destroyed. With pipe, the file stream can stay open.",
        "Use the promise version: const { pipeline } = require('node:stream/promises'); await pipeline(src, transform, dest).",
        "pipeline also accepts async generator functions as transform steps.",
      ],
      code: `const { pipeline } = require("node:stream/promises");
const zlib = require("node:zlib");

app.get("/logs.gz", async (req, res, next) => {
  res.setHeader("Content-Type", "application/gzip");
  try {
    await pipeline(fs.createReadStream("app.log"), zlib.createGzip(), res);
  } catch (err) {
    if (!res.headersSent) next(err);   // client may simply have gone away
  }
});`,
    },
  },

  "node-transform-stream": {
    scenario: "Write a Transform stream that splits incoming bytes into lines and emits one parsed object per line.",
    answer: {
      summary:
        "Implement transform(chunk, encoding, callback): append the chunk to a leftover buffer, split on newlines, push every complete line, and keep the last partial line for the next chunk. In flush(), emit whatever is left. Use readableObjectMode to push objects.",
      points: [
        "Chunk boundaries are arbitrary: a line (or even a multi-byte character) can be split across chunks.",
        "Call callback(err) to fail the stream on bad input, or skip and count bad rows, depending on the requirement.",
        "push() returns false under backpressure, but inside transform the stream machinery handles pacing as long as you call callback when done.",
        "For batching (e.g. bulk DB inserts), collect rows into an array and push when it reaches 500, plus the remainder in flush.",
        "Async generators passed to pipeline are often simpler than Transform classes.",
      ],
      code: `const { Transform } = require("node:stream");

class JsonLines extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this.leftover = "";
  }
  _transform(chunk, _enc, done) {
    const lines = (this.leftover + chunk.toString("utf8")).split("\\n");
    this.leftover = lines.pop();
    try {
      for (const line of lines) if (line.trim()) this.push(JSON.parse(line));
      done();
    } catch (err) {
      done(err);
    }
  }
  _flush(done) {
    try {
      if (this.leftover.trim()) this.push(JSON.parse(this.leftover));
      done();
    } catch (err) {
      done(err);
    }
  }
}`,
      pitfalls: ["chunk.toString() per chunk can break multi-byte UTF-8 characters; use setEncoding or StringDecoder for non-ASCII data."],
    },
  },

  "node-fs-sync-async": {
    scenario: "fs.readFileSync, fs.readFile with a callback, and fs.promises.readFile: when is each one appropriate?",
    answer: {
      summary:
        "Sync methods block the event loop until the disk operation finishes, so they're only acceptable when nothing else needs to run yet: at startup or in CLI scripts. In a server, use the promise API with async/await, and streams for large files.",
      points: [
        "readFileSync at module load (reading a config or certificate once) is fine: no requests are being served yet.",
        "readFileSync inside a request handler blocks every other request while the disk is read.",
        "Callback and promise APIs both use the libuv thread pool; promises are just easier to compose.",
        "Large files: createReadStream rather than readFile, to keep memory flat.",
        "Checking existence then opening (fs.exists + open) is a race condition. Just open and handle ENOENT.",
      ],
    },
  },

  "node-file-upload": {
    scenario: "Users upload videos up to 2 GB. How do you handle uploads without exhausting server memory?",
    answer: {
      summary:
        "Never buffer the whole body. Either stream the multipart upload straight to disk or object storage, enforcing size and type limits as bytes arrive, or better at scale, give the client a pre-signed URL so it uploads directly to S3/GCS and your API never touches the bytes.",
      points: [
        "Streaming parsers: busboy (or multer with disk storage / a streaming storage engine). Pipe the file stream to S3 with multipart upload.",
        "Enforce limits early: Content-Length checks, busboy limits.fileSize, and abort the request when exceeded.",
        "Validate type by content (magic bytes), not only by the file name or client-provided MIME type.",
        "Pre-signed URLs: the API authorises and returns a short-lived URL; the client uploads to storage; storage notifies you (event/webhook) or the client confirms.",
        "Large and unreliable uploads: S3 multipart or resumable upload protocols (tus) so a failure at 90% resumes instead of restarting.",
        "Post-processing (virus scan, transcoding, thumbnails) goes to a background queue.",
      ],
    },
  },

  "node-stream-http-response": {
    scenario: "Admins can export all orders (2 million rows) as CSV. Implement the endpoint without loading everything into memory.",
    answer: {
      summary:
        "Read rows with a database cursor or query stream, transform each row to a CSV line, and pipe the result into the HTTP response with pipeline. Memory stays constant, the download starts immediately, and pipeline stops the query if the client disconnects.",
      points: [
        "Headers: Content-Type: text/csv; Content-Disposition: attachment; filename=\"orders.csv\".",
        "Escape CSV values properly (quotes, commas, newlines) and guard against CSV formula injection (cells starting with =, +, -, @).",
        "Use a read replica for big exports so they don't slow the primary.",
        "Long exports can exceed load balancer timeouts: turn it into an async job that writes the file to S3 and sends a download link.",
      ],
      code: `const { pipeline } = require("node:stream/promises");
const { Transform } = require("node:stream");

app.get("/admin/orders.csv", async (req, res, next) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');
  res.write("id,amount,status\\n");

  const toCsv = new Transform({
    writableObjectMode: true,
    transform(row, _enc, done) { done(null, [row.id, row.amount, row.status].map(csvEscape).join(",") + "\\n"); },
  });

  try {
    await pipeline(db.queryStream("SELECT id, amount, status FROM orders"), toCsv, res);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
});`,
    },
  },

  "node-encoding": {
    scenario: "A CSV with Hindi text gets random garbage characters after upload processing. What's going on?",
    answer: {
      summary:
        "UTF-8 characters take 1 to 4 bytes (Devanagari characters take 3). Streams split data at arbitrary byte positions, so if you call chunk.toString() on each chunk separately, a character split across two chunks is decoded as two broken halves.",
      points: [
        "Fix: readable.setEncoding('utf8'), which uses a StringDecoder that holds incomplete characters until the next chunk arrives.",
        "Or collect Buffers and decode once with Buffer.concat(chunks).toString('utf8') for small data.",
        "Also check the file's actual encoding (some Excel exports are UTF-16 or Windows-1252, or have a BOM).",
        "Buffer length is in bytes; string length is in UTF-16 code units. Don't mix them when slicing.",
        "base64 is for carrying binary data inside text (JSON, emails); it increases size by about 33%.",
      ],
    },
  },

  "node-readline": {
    scenario: "Find the 10 slowest requests in a 5 GB access log where each line ends with the response time in ms.",
    answer: {
      summary:
        "Stream the file line by line with readline and keep only the 10 slowest seen so far, in a min-heap of size 10 (or a small sorted array, since K is tiny). Memory stays constant and it's a single pass: O(n log K).",
      points: [
        "readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity }) and for await...of.",
        "Parse defensively: skip malformed lines and count them.",
        "Top-K pattern: if the heap has fewer than K items, add; otherwise, if the new value beats the smallest, replace it.",
        "For many files, process them in parallel with a concurrency limit, then merge the per-file top-10s.",
      ],
      code: `async function slowest(path, k = 10) {
  const rl = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });
  const top = []; // sorted ascending, at most k items
  for await (const line of rl) {
    const ms = Number(line.slice(line.lastIndexOf(" ") + 1));
    if (Number.isNaN(ms)) continue;
    if (top.length < k || ms > top[0].ms) {
      top.push({ ms, line });
      top.sort((a, b) => a.ms - b.ms);
      if (top.length > k) top.shift();
    }
  }
  return top.reverse();
}`,
    },
  },
};
