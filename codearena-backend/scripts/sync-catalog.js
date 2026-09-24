// CLI:  npm run sync:catalog
// Copies the valid DSA problem ids and system design / Node.js / SQL question ids from the frontend's data files
// into src/data/catalog.json, so the API can reject ids that don't exist.
// Re-run whenever problems or questions are added in the frontend.
import { writeFile } from "node:fs/promises";

const { ALL_PROBLEMS } = await import("../../codearena-frontend/src/features/dsa/data/problems.js");
const { HLD_BASE, LLD_BASE } = await import("../../codearena-frontend/src/features/system-design/data/catalog.js");
const { NODE_BASE } = await import("../../codearena-frontend/src/features/nodejs/data/catalog.js");
const { SQL_QUERY_BASE, SQL_CONCEPT_BASE } = await import("../../codearena-frontend/src/features/sql/data/catalog.js");

const catalog = {
  generatedAt: new Date().toISOString(),
  problems: ALL_PROBLEMS.map((p) => p.id),
  designQuestions: Object.fromEntries([...HLD_BASE, ...LLD_BASE, ...NODE_BASE, ...SQL_QUERY_BASE, ...SQL_CONCEPT_BASE].map((q) => [q.id, q.rubric.length])),
  modules: ["dsa", "system-design", "nodejs", "sql"],
};

await writeFile(new URL("../src/data/catalog.json", import.meta.url), JSON.stringify(catalog, null, 2) + "\n");
console.log(
  `Catalog: ${catalog.problems.length} problems, ${Object.keys(catalog.designQuestions).length} design questions.`,
);
