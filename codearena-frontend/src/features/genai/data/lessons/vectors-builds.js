// Day 5 build guide: a mini vector database. Merged into d05.js. Shape: see ./index.js
// The Python here was run and tested; keep it runnable when editing.

export const miniVectorDb = {
  minutes: 180,
  level: "Intermediate",
  intro:
    "Build **MiniVec**, a tiny vector database in about 100 lines of NumPy: upserts and deletes, exact (flat) search, an **IVF index** built with k-means, metadata filters applied inside the search, save/load, tests, and a benchmark that measures recall against speed. After this, HNSW, `n_probe`, recall@k and \"filter inside the index\" are things you've implemented, not buzzwords, and you have a strong repo to discuss in interviews.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `minivec/
├── minivec.py          # MiniVec: upsert, delete, query (flat or IVF), filters, save/load
├── test_minivec.py     # pytest: ranking, filters, updates, persistence
└── benchmark.py        # 50,000 vectors: flat vs IVF recall@10 and latency`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/minivec && cd ~/genai-practice/minivec
uv init --no-readme .
uv add numpy pytest`,
        },
        {
          table: {
            head: ["MiniVec concept", "Real vector database equivalent"],
            rows: [
              ["`upsert(ids, vectors, metadata)`", "Qdrant `upsert`, Pinecone `upsert`, SQL `INSERT ... ON CONFLICT`"],
              ["Flat search (`n_probe=None`)", "Exact / brute-force search"],
              ["`build_ivf(n_lists)` + `n_probe`", "FAISS IVF, pgvector `ivfflat` (`lists`, `probes`)"],
              ["`where={...}` applied to candidates before ranking", "Filtered (pre-filter) search"],
              ["`save` / `load`", "Persistence and snapshots"],
            ],
          },
        },
      ],
    },
    {
      h: "Step 1: the database (minivec.py)",
      blocks: [
        {
          lang: "python",
          code: `"""MiniVec: a tiny vector database in NumPy. Flat (exact) search, an IVF index, metadata filters, save/load."""
import json
from pathlib import Path
import numpy as np


def normalise(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=np.float32)
    norms = np.linalg.norm(x, axis=-1, keepdims=True)
    return x / np.where(norms == 0, 1, norms)


class MiniVec:
    def __init__(self, dim: int):
        self.dim = dim
        self.ids: list[str] = []
        self.meta: list[dict] = []
        self.vectors = np.empty((0, dim), dtype=np.float32)
        self.centroids: np.ndarray | None = None       # IVF: cluster centres
        self.assign: np.ndarray | None = None          # IVF: cluster of each vector

    # ---------- writes ----------
    def upsert(self, ids: list[str], vectors, metadata: list[dict]) -> None:
        vectors = normalise(vectors)
        pos = {id_: i for i, id_ in enumerate(self.ids)}
        for id_, v, m in zip(ids, vectors, metadata):
            if id_ in pos:                               # update in place
                self.vectors[pos[id_]], self.meta[pos[id_]] = v, m
            else:
                pos[id_] = len(self.ids)
                self.ids.append(id_)
                self.meta.append(m)
                self.vectors = np.vstack([self.vectors, v[None, :]])
        self.centroids = self.assign = None              # index is stale after writes

    def delete(self, ids: set[str]) -> None:
        keep = [i for i, id_ in enumerate(self.ids) if id_ not in ids]
        self.ids = [self.ids[i] for i in keep]
        self.meta = [self.meta[i] for i in keep]
        self.vectors = self.vectors[keep]
        self.centroids = self.assign = None

    # ---------- IVF index (k-means clusters) ----------
    def build_ivf(self, n_lists: int = 32, iters: int = 10, seed: int = 0) -> None:
        rng = np.random.default_rng(seed)
        centroids = self.vectors[rng.choice(len(self.vectors), n_lists, replace=False)]
        for _ in range(iters):                           # k-means with cosine similarity
            assign = np.argmax(self.vectors @ centroids.T, axis=1)
            for c in range(n_lists):
                members = self.vectors[assign == c]
                if len(members):
                    centroids[c] = members.mean(axis=0)
            centroids = normalise(centroids)
        self.centroids, self.assign = centroids, np.argmax(self.vectors @ centroids.T, axis=1)

    # ---------- reads ----------
    def _candidates(self, q: np.ndarray, n_probe: int | None) -> np.ndarray:
        if self.centroids is None or n_probe is None:
            return np.arange(len(self.ids))              # flat: every vector
        nearest = np.argsort(-(self.centroids @ q))[:n_probe]
        return np.flatnonzero(np.isin(self.assign, nearest))

    def query(self, vector, k: int = 5, where: dict | None = None, n_probe: int | None = None):
        q = normalise(vector)
        cand = self._candidates(q, n_probe)
        if where:                                        # pre-filter inside the search, not after it
            cand = np.array([i for i in cand if all(self.meta[i].get(f) == v for f, v in where.items())], dtype=int)
        if len(cand) == 0:
            return []
        scores = self.vectors[cand] @ q
        top = np.argsort(-scores)[:k]
        return [(self.ids[cand[i]], float(scores[i]), self.meta[cand[i]]) for i in top]

    # ---------- persistence ----------
    def save(self, folder: str) -> None:
        p = Path(folder)
        p.mkdir(parents=True, exist_ok=True)
        np.save(p / "vectors.npy", self.vectors)
        (p / "records.json").write_text(json.dumps({"dim": self.dim, "ids": self.ids, "meta": self.meta}))

    @classmethod
    def load(cls, folder: str) -> "MiniVec":
        p = Path(folder)
        data = json.loads((p / "records.json").read_text())
        db = cls(data["dim"])
        db.ids, db.meta, db.vectors = data["ids"], data["meta"], np.load(p / "vectors.npy")
        return db`,
        },
        {
          list: [
            "Vectors are **normalised on write**, so cosine similarity is a single matrix–vector product (`vectors @ q`).",
            "**IVF** (inverted file index) runs k-means to split vectors into `n_lists` clusters. A query compares itself with the cluster centres, then searches only the `n_probe` nearest clusters, which is far fewer vectors than flat search.",
            "Writes clear the IVF index (`centroids = None`) because cluster assignments are stale; real databases update indexes incrementally or rebuild in the background.",
            "The `where` filter narrows the **candidates before ranking**, so you still get k results when a filter is selective (the post-filter problem from the HNSW lesson).",
          ],
        },
      ],
    },
    {
      h: "Step 2: tests (test_minivec.py)",
      blocks: [
        {
          lang: "python",
          code: `import numpy as np
from minivec import MiniVec


def make():
    db = MiniVec(3)
    db.upsert(["a", "b", "c"], [[1, 0, 0], [0, 1, 0], [0.9, 0.1, 0]],
              [{"tenant": "x"}, {"tenant": "x"}, {"tenant": "y"}])
    return db


def test_nearest_first():
    assert make().query([1, 0, 0], k=2)[0][0] == "a"


def test_filter_is_applied_inside_search():
    hits = make().query([1, 0, 0], k=2, where={"tenant": "y"})
    assert [h[0] for h in hits] == ["c"]


def test_upsert_updates_and_delete_removes():
    db = make()
    db.upsert(["a"], [[0, 0, 1]], [{"tenant": "x"}])
    assert db.query([0, 0, 1], k=1)[0][0] == "a" and len(db.ids) == 3
    db.delete({"a"})
    assert "a" not in db.ids


def test_save_and_load(tmp_path):
    db = make()
    db.save(tmp_path)
    loaded = MiniVec.load(tmp_path)
    assert loaded.ids == db.ids and np.allclose(loaded.vectors, db.vectors)`,
        },
        {
          lang: "bash",
          code: `uv run pytest -q          # 4 passed`,
        },
      ],
    },
    {
      h: "Step 3: benchmark recall vs speed (benchmark.py)",
      blocks: [
        {
          lang: "python",
          code: `"""Recall vs speed: flat search against IVF with different n_probe values."""
import time
import numpy as np
from minivec import MiniVec, normalise

rng = np.random.default_rng(42)
N, DIM, K = 50_000, 128, 10
# clustered synthetic data (real embeddings are clustered by topic, not uniform noise)
centres = normalise(rng.normal(size=(200, DIM)))
data = normalise(centres[rng.integers(0, 200, N)] + 0.13 * rng.normal(size=(N, DIM)))
queries = normalise(centres[rng.integers(0, 200, 200)] + 0.13 * rng.normal(size=(200, DIM)))

db = MiniVec(DIM)
db.upsert([f"v{i}" for i in range(N)], data, [{"shard": i % 4} for i in range(N)])

def run(n_probe):
    start = time.perf_counter()
    results = [[r[0] for r in db.query(q, K, n_probe=n_probe)] for q in queries]
    return results, (time.perf_counter() - start) / len(queries) * 1000

truth, flat_ms = run(None)
t = time.perf_counter()
db.build_ivf(n_lists=100)
print(f"flat: {flat_ms:.2f} ms/query | IVF build: {time.perf_counter() - t:.1f}s")
for n_probe in (1, 3, 10, 30):
    got, ms = run(n_probe)
    recall = np.mean([len(set(g) & set(tr)) / K for g, tr in zip(got, truth)])
    print(f"IVF n_probe={n_probe:>2}: recall@{K} = {recall:.3f}, {ms:.2f} ms/query")`,
        },
        {
          lang: "text",
          code: `flat: 3.74 ms/query | IVF build: 0.1s
IVF n_probe= 1: recall@10 = 0.932, 0.13 ms/query
IVF n_probe= 3: recall@10 = 0.957, 0.49 ms/query
IVF n_probe=10: recall@10 = 0.973, 0.78 ms/query
IVF n_probe=30: recall@10 = 0.993, 1.75 ms/query`,
          caption: "Real output on a laptop (your timings will differ).",
        },
        {
          list: [
            "`n_probe=1` searches ~1% of the data: very fast, but misses neighbours that sit in a neighbouring cluster (recall 0.93).",
            "Raising `n_probe` trades speed for recall, exactly like `ef_search` in HNSW or `probes` in pgvector's IVFFlat.",
            "Flat search is *exact* but its cost grows linearly with N; IVF cost grows with `n_probe × N / n_lists`.",
          ],
        },
      ],
    },
    {
      h: "Extensions",
      blocks: [
        {
          list: [
            "Add **int8 scalar quantisation**: store `np.int8` copies, search them, then re-score the top 50 with float32 vectors, and measure memory and recall.",
            "Wrap MiniVec in a FastAPI service with `/upsert`, `/query` and `/delete` endpoints.",
            "Compare your IVF with `hnswlib` on the same data and plot recall vs latency for both.",
            "Add incremental IVF updates: assign new vectors to their nearest centroid instead of clearing the index.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Normalise on write → cosine = dot product → search is one matrix multiplication.",
    "IVF: k-means clusters; search the n_probe nearest clusters; n_probe trades recall for speed.",
    "Filter candidates before ranking to avoid returning too few results.",
    "Always benchmark recall@k against exact search, not just speed.",
  ],
  practice: [
    "Add int8 quantisation with re-scoring and report memory saved and recall@10.",
  ],
};
