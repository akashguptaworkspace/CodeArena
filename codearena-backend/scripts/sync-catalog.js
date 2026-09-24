// CLI:  npm run sync:catalog
// Copies the valid DSA problem ids and system design question ids from the frontend's data files
// into src/data/catalog.json, so the API can reject ids that don't exist.
// Re-run whenever problems or questions are added in the frontend.
import { writeFile } from "node:fs/promises";

const { ALL_PROBLEMS } = await import("../../codearena-frontend/src/features/dsa/data/problems.js");
const { HLD_BASE, LLD_BASE } = await import("../../codearena-frontend/src/features/system-design/data/catalog.js");

const catalog = {
  generatedAt: new Date().toISOString(),
  problems: ALL_PROBLEMS.map((p) => p.id),
  designQuestions: Object.fromEntries([...HLD_BASE, ...LLD_BASE].map((q) => [q.id, q.rubric.length])),
  modules: ["dsa", "system-design", "nodejs", "mysql"],
};

await writeFile(new URL("../src/data/catalog.json", import.meta.url), JSON.stringify(catalog, null, 2) + "\n");
console.log(
  `Catalog: ${catalog.problems.length} problems, ${Object.keys(catalog.designQuestions).length} design questions.`,
);
