// Day 18 practice: GenAI system design building blocks. Shape: see ./index.js
export default {
  intro:
    "Six exercises that turn system-design talk into code: capacity and cost estimates, a latency budget with parallel stages, a tenant-safe data access layer, an ingestion queue with retries and a dead-letter list, a text-to-SQL safety validator, and architecture diagrams generated from code.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day18 && cd ~/genai-practice/day18
uv init --no-readme .
uv add sqlglot pytest`,
    },
  ],
  groups: [
    {
      title: "Numbers that drive the design",
      exercises: [
        {
          id: "capacity",
          title: "Capacity and cost estimator",
          level: "Easy",
          task: [
            "Write `estimate(users, questions_per_user_per_day, peak_factor, tokens_in, tokens_out, prices)` that prints average and peak QPS, daily tokens, and monthly cost for each model tier. Use: 10,000 employees, 5 questions/day, peak 8× average, 3,000 in / 300 out tokens, example prices small (0.15, 0.60) and large (3.00, 15.00) per million.",
          ],
          solution: `def estimate(users, q_per_user, peak_factor, tokens_in, tokens_out, prices: dict[str, tuple[float, float]]):
    per_day = users * q_per_user
    avg_qps = per_day / 86_400
    print(f"{per_day:,} questions/day | avg {avg_qps:.2f} QPS | peak ~{avg_qps * peak_factor:.1f} QPS")
    print(f"daily tokens: {per_day * tokens_in / 1e6:.0f}M in, {per_day * tokens_out / 1e6:.1f}M out")
    for tier, (p_in, p_out) in prices.items():
        monthly = per_day * 30 * (tokens_in / 1e6 * p_in + tokens_out / 1e6 * p_out)
        print(f"  {tier:<6} ≈ \${monthly:,.0f}/month")

estimate(10_000, 5, 8, 3000, 300, {"small": (0.15, 0.60), "large": (3.00, 15.00)})`,
          explanation: [
            "50,000 questions a day is only ~0.6 QPS on average (~5 QPS at peak): one well-built API service handles that. The expensive part is tokens, not servers.",
            "That insight steers the design: spend effort on caching, shorter prompts and model routing rather than scaling infrastructure.",
            "86,400 is the number of seconds in a day. Always state your assumptions out loud in an interview; the method matters more than exact numbers.",
          ],
          concepts: [
            ["QPS", "Queries per second."],
            ["Peak factor", "How much busier the busiest period is than the average."],
            ["Back-of-envelope estimate", "Quick approximate maths to size a system."],
          ],
        },
        {
          id: "latency-budget",
          title: "A latency budget with parallel stages",
          level: "Medium",
          task: [
            "Model a RAG request as stages with durations and dependencies (some run in parallel: vector search ‖ keyword search). Write a function that computes the time to first token along the **critical path**, and compare with running everything sequentially.",
          ],
          solution: `from functools import cache

STAGES = {   # name: (milliseconds, depends_on)
    "auth": (20, []),
    "rewrite": (200, ["auth"]),
    "embed": (100, ["rewrite"]),
    "vector_search": (40, ["embed"]),
    "keyword_search": (60, ["rewrite"]),
    "rerank": (250, ["vector_search", "keyword_search"]),
    "llm_first_token": (600, ["rerank"]),
}

@cache
def finish_time(stage: str) -> int:
    ms, deps = STAGES[stage]
    return ms + max((finish_time(d) for d in deps), default=0)

sequential = sum(ms for ms, _ in STAGES.values())
print(f"sequential: {sequential} ms")
print(f"critical path to first token: {finish_time('llm_first_token')} ms")`,
          explanation: [
            "A stage can start only when all its dependencies are done, so its finish time is its own duration plus the **latest** dependency's finish time. The longest chain is the critical path.",
            "Keyword search runs alongside embedding + vector search, so it adds nothing to the total. Parallelising independent steps with `asyncio.gather` is often the cheapest latency win.",
            "`@cache` remembers results so each stage is computed once (memoisation).",
          ],
          concepts: [
            ["Critical path", "The longest chain of dependent steps; it sets the total time."],
            ["Latency budget", "A target time split across the steps of a request."],
            ["`functools.cache`", "Remembers a function's results for given arguments."],
          ],
        },
      ],
    },
    {
      title: "Safety by construction",
      exercises: [
        {
          id: "tenant-dal",
          title: "A tenant-safe data access layer",
          level: "Medium",
          task: [
            "Write a `TenantStore` that is created **for one tenant** and whose `search(query)` and `get(doc_id)` can only ever return that tenant's documents. There must be no method that takes a tenant id from the caller. Write tests proving tenant A can't read tenant B's document, even by guessing its id.",
          ],
          solution: `from dataclasses import dataclass

@dataclass(frozen=True)
class Doc:
    id: str
    tenant_id: str
    text: str

ALL_DOCS = [Doc("d1", "acme", "Acme leave policy"), Doc("d2", "globex", "Globex salary bands"),
            Doc("d3", "acme", "Acme travel policy")]

class TenantStore:
    def __init__(self, tenant_id: str):
        self._tenant = tenant_id                       # fixed at construction, from the auth token

    def _visible(self):
        return (d for d in ALL_DOCS if d.tenant_id == self._tenant)

    def search(self, query: str) -> list[Doc]:
        return [d for d in self._visible() if query.lower() in d.text.lower()]

    def get(self, doc_id: str) -> Doc | None:
        return next((d for d in self._visible() if d.id == doc_id), None)

# test_tenant.py
def test_search_is_scoped():
    assert [d.id for d in TenantStore("acme").search("policy")] == ["d1", "d3"]

def test_cannot_read_other_tenant_by_id():
    assert TenantStore("acme").get("d2") is None          # exists, but belongs to globex`,
          explanation: [
            "Isolation is enforced by **structure**: every query goes through `_visible()`, and the tenant is fixed when the store is created from the authenticated user. No code path can forget the filter.",
            "Returning `None` for another tenant's id (rather than \"forbidden\") also avoids revealing that the document exists.",
            "The same pattern applies to vector search: the tenant filter lives inside the data layer, not in each route.",
          ],
          concepts: [
            ["Multi-tenancy", "One system serving several customers whose data must stay separate."],
            ["Data access layer", "The one place where the app reads and writes data."],
            ["`frozen=True` dataclass", "Instances can't be changed after creation."],
          ],
        },
        {
          id: "sql-validator",
          title: "Validate LLM-written SQL before running it",
          level: "Hard",
          task: [
            "For a text-to-SQL assistant, write `validate_sql(sql)` using `sqlglot` that parses the query and rejects anything that isn't a single SELECT, touches a table outside an allow-list, or has no LIMIT (add `LIMIT 100` automatically). Test with 5 queries including a `DELETE`, a join to a forbidden table, and a multi-statement injection.",
          ],
          solution: `import sqlglot
from sqlglot import exp

ALLOWED_TABLES = {"orders", "customers", "products"}

def validate_sql(sql: str, dialect: str = "postgres") -> str:
    statements = sqlglot.parse(sql, read=dialect)
    if len(statements) != 1 or statements[0] is None:
        raise ValueError("exactly one statement is allowed")
    tree = statements[0]
    if not isinstance(tree, exp.Select):
        raise ValueError(f"only SELECT is allowed, got {type(tree).__name__}")
    tables = {t.name.lower() for t in tree.find_all(exp.Table)}
    if not tables <= ALLOWED_TABLES:
        raise ValueError(f"forbidden tables: {sorted(tables - ALLOWED_TABLES)}")
    if tree.args.get("limit") is None:
        tree = tree.limit(100)
    return tree.sql(dialect=dialect)

for q in ["SELECT city, SUM(amount) FROM orders JOIN customers ON orders.customer_id = customers.id GROUP BY city",
          "DELETE FROM orders",
          "SELECT * FROM salaries",
          "SELECT * FROM orders; DROP TABLE orders",
          "SELECT name FROM customers LIMIT 5"]:
    try:
        print("OK  ", validate_sql(q))
    except (ValueError, sqlglot.errors.ParseError) as e:
        print("DENY", q[:45], "→", e)`,
          explanation: [
            "Parsing the SQL into a tree is much safer than string checks like `startswith(\"select\")`, which miss multi-statement tricks.",
            "Checking tables against an allow-list stops the model (or a prompt injection) from reading sensitive tables.",
            "This is one layer. Also run queries with a read-only database role, statement timeouts and row-level permissions for the user.",
          ],
          concepts: [
            ["sqlglot", "A Python SQL parser and transpiler."],
            ["Syntax tree", "A structured representation of code you can inspect safely."],
            ["Text-to-SQL", "An LLM turning a question into a SQL query."],
          ],
        },
      ],
    },
    {
      title: "Pipelines and diagrams",
      exercises: [
        {
          id: "ingest-queue",
          title: "An ingestion queue with retries and a dead-letter list",
          level: "Hard",
          task: [
            "Simulate document ingestion with `asyncio.Queue` and 3 workers. Processing fails randomly 30% of the time. Retry each job up to 3 times with backoff; after that, move it to a `dead_letter` list. Process 20 documents and print how many succeeded, retried and dead-lettered.",
          ],
          solution: `import asyncio
import random

random.seed(3)
done, dead_letter, retries = [], [], 0

async def process(doc_id: str) -> None:
    await asyncio.sleep(random.uniform(0.05, 0.2))       # parse + chunk + embed
    if random.random() < 0.3:
        raise RuntimeError("embedding API timeout")

async def worker(name: str, queue: asyncio.Queue) -> None:
    global retries
    while True:
        doc_id, attempt = await queue.get()
        try:
            await process(doc_id)
            done.append(doc_id)
        except RuntimeError as e:
            if attempt < 3:
                retries += 1
                await asyncio.sleep(0.05 * 2 ** attempt)
                await queue.put((doc_id, attempt + 1))
            else:
                dead_letter.append((doc_id, str(e)))
        finally:
            queue.task_done()

async def main():
    queue: asyncio.Queue = asyncio.Queue()
    for i in range(20):
        queue.put_nowait((f"doc-{i}", 1))
    workers = [asyncio.create_task(worker(f"w{i}", queue)) for i in range(3)]
    await queue.join()                      # wait until every job (including retries) is finished
    for w in workers:
        w.cancel()
    print(f"succeeded {len(done)}, retries {retries}, dead-lettered {len(dead_letter)}")
    for item in dead_letter:
        print("  DLQ:", item)

asyncio.run(main())`,
          explanation: [
            "A queue decouples uploads from slow processing: the API returns 202 immediately and workers catch up. Adding workers scales throughput.",
            "Failed jobs are re-queued with a higher attempt number and exponential backoff; after the limit they go to a **dead-letter queue** for humans to inspect instead of being lost or retried forever.",
            "`queue.join()` waits until `task_done()` has been called for every item put in, including re-queued ones. In production this is SQS + a DLQ, or Celery/arq.",
          ],
          concepts: [
            ["Work queue", "A list of jobs that workers take one at a time."],
            ["Dead-letter queue (DLQ)", "Where jobs go after repeated failures."],
            ["`asyncio.Queue`", "An async-safe queue for coordinating coroutines."],
            ["Idempotent job", "A job that's safe to run more than once, which retries require."],
          ],
        },
        {
          id: "mermaid",
          title: "Generate an architecture diagram from code",
          level: "Easy",
          task: [
            "Describe your DocChat architecture as a Python dict of components and edges, and write a function that outputs a Mermaid `flowchart LR`. Paste the output into a GitHub README or mermaid.live to see the diagram.",
          ],
          solution: `COMPONENTS = {
    "ui": "Next.js UI", "api": "FastAPI", "queue": "SQS", "worker": "Ingestion worker",
    "s3": "S3 uploads", "db": "Postgres + pgvector", "llm": "LLM (Bedrock)", "trace": "Langfuse",
}
EDGES = [("ui", "api", "SSE chat"), ("ui", "s3", "presigned upload"), ("s3", "queue", "event"),
         ("queue", "worker", ""), ("worker", "db", "chunks + vectors"), ("api", "db", "hybrid search"),
         ("api", "llm", "grounded prompt"), ("api", "trace", "traces")]

def mermaid(components: dict[str, str], edges: list[tuple[str, str, str]]) -> str:
    lines = ["flowchart LR"]
    lines += [f'    {key}["{label}"]' for key, label in components.items()]
    lines += [f"    {a} -->|{label}| {b}" if label else f"    {a} --> {b}" for a, b, label in edges]
    return "\\n".join(lines)

print(mermaid(COMPONENTS, EDGES))`,
          explanation: [
            "Mermaid is a text format for diagrams that GitHub renders automatically inside Markdown code blocks marked `mermaid`.",
            "Keeping the diagram as code means it's versioned and easy to update when the architecture changes.",
            "A clear diagram at the top of your README (and on the whiteboard in interviews) communicates more than paragraphs of text.",
          ],
          concepts: [
            ["Mermaid", "A text-based diagram language supported by GitHub and many docs tools."],
            ["Diagrams as code", "Describing diagrams in text files kept in version control."],
          ],
        },
      ],
    },
  ],
};
