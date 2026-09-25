import "./helpers/testEnv.js";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createMigrator } from "../src/db/migrator.js";
import { sequelize } from "../src/models/index.js";

const migrator = createMigrator({ logger: undefined });
const now = new Date();

const insert = (table, row) => sequelize.getQueryInterface().bulkInsert(table, [{ ...row, created_at: now, updated_at: now }]);
const rows = (table, userId) =>
  sequelize.query(`SELECT question_id, ${table === "design_progress" ? "status" : "notes"} AS value FROM ${table} WHERE user_id = :userId ORDER BY question_id`, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT,
  });
const asMap = (list) => Object.fromEntries(list.map((r) => [r.question_id, r.value]));

before(async () => {
  await migrator.up({ to: "20260924-004-create-entitlements.js" });
  await insert("users", { id: 1, google_sub: "g-1", email: "one@example.com", name: "One" });
  await insert("users", { id: 2, google_sub: "g-2", email: "two@example.com", name: "Two" });

  // Student 1: ticks and notes on items that moved, plus one that didn't.
  for (const id of ["genai-d05-similarity", "genai-d04-prompting", "genai-d07-px-first-chain", "genai-d05-iq-hnsw", "genai-d01-types"]) {
    await insert("design_progress", { user_id: 1, question_id: id, status: "ready" });
  }
  const notes = {
    "genai-d05-similarity": "cosine notes", // lesson notes: d05 → d08
    "genai-d06-px-notes": "rag practice notes", // d06 practice → d09, while…
    "genai-d07-px-notes": "langchain practice notes", // …d07 practice → d06 (a chain)
    "genai-d13-px-notes": "production notes", // d13 and d14 merged into d16
    "genai-d14-px-notes": "job search notes",
  };
  for (const [id, text] of Object.entries(notes)) {
    await insert("design_attempts", { user_id: 1, question_id: id, notes: text, covered: "[]", revealed: false });
  }
  // Student 2 is untouched by student 1's rows.
  await insert("design_progress", { user_id: 2, question_id: "genai-d06-pipeline", status: "ready" });
});

after(() => sequelize.close());

test("GenAI restructure moves every student's progress and notes to the new day ids", async () => {
  await migrator.up();

  assert.deepEqual(asMap(await rows("design_progress", 1)), {
    "genai-d01-types": "ready",
    "genai-d05-prompting": "ready",
    "genai-d06-px-first-chain": "ready",
    "genai-d08-iq-hnsw": "ready",
    "genai-d08-similarity": "ready",
  });
  assert.deepEqual(asMap(await rows("design_attempts", 1)), {
    "genai-d06-px-notes": "langchain practice notes",
    "genai-d08-similarity": "cosine notes",
    "genai-d09-px-notes": "rag practice notes",
    "genai-d16-px-notes": "production notes\n\njob search notes",
  });
  assert.deepEqual(asMap(await rows("design_progress", 2)), { "genai-d09-pipeline": "ready" });
});

test("rolling it back restores the old ids", async () => {
  await migrator.down();

  assert.deepEqual(Object.keys(asMap(await rows("design_progress", 1))), [
    "genai-d01-types",
    "genai-d04-prompting",
    "genai-d05-iq-hnsw",
    "genai-d05-similarity",
    "genai-d07-px-first-chain",
  ]);
  assert.deepEqual(asMap(await rows("design_attempts", 1)), {
    "genai-d05-similarity": "cosine notes",
    "genai-d06-px-notes": "rag practice notes",
    "genai-d07-px-notes": "langchain practice notes",
    "genai-d13-px-notes": "production notes\n\njob search notes",
  });
});
