// CLI:  npm run sync:catalog
// Copies the valid DSA problem ids and system design / Node.js / SQL question / GenAI task ids from the frontend's data files
// into src/data/catalog.json, so the API can reject ids that don't exist.
// Re-run whenever problems or questions are added in the frontend.
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const { ALL_PROBLEMS } = await import("../../codearena-frontend/src/features/dsa/data/problems.js");
const { HLD_BASE, LLD_BASE } = await import("../../codearena-frontend/src/features/system-design/data/catalog.js");
const { NODE_BASE } = await import("../../codearena-frontend/src/features/nodejs/data/catalog.js");
const { SQL_QUERY_BASE, SQL_CONCEPT_BASE } = await import("../../codearena-frontend/src/features/sql/data/catalog.js");
const { GENAI_TASKS, GENAI_DAYS } = await import("../../codearena-frontend/src/features/genai/data/plan.js");
const { practiceId, practiceNotesId } = await import("../../codearena-frontend/src/features/genai/data/practice/index.js");

// GenAI practice exercise ids (solved state) and the per-day practice notes id.
const genaiPractice = [];
for (const day of GENAI_DAYS) {
  const file = new URL(`../../codearena-frontend/src/features/genai/data/practice/${day.id}.js`, import.meta.url);
  if (!existsSync(file)) continue; // no exercises for this day yet
  const practice = (await import(file.href)).default;
  genaiPractice.push(practiceNotesId(day.id));
  for (const group of practice.groups) for (const ex of group.exercises) genaiPractice.push(practiceId(day.id, ex.id));
}

const catalog = {
  generatedAt: new Date().toISOString(),
  problems: ALL_PROBLEMS.map((p) => p.id),
  designQuestions: Object.fromEntries([
    ...[...HLD_BASE, ...LLD_BASE, ...NODE_BASE, ...SQL_QUERY_BASE, ...SQL_CONCEPT_BASE].map((q) => [q.id, q.rubric.length]),
    // GenAI plan tasks are tracked as design statuses ("ready" = done) and have no rubric.
    ...GENAI_TASKS.map((t) => [t.id, 0]),
    ...genaiPractice.map((id) => [id, 0]),
  ]),
  modules: ["dsa", "system-design", "nodejs", "sql", "genai"],
};

await writeFile(new URL("../src/data/catalog.json", import.meta.url), JSON.stringify(catalog, null, 2) + "\n");
console.log(
  `Catalog: ${catalog.problems.length} problems, ${Object.keys(catalog.designQuestions).length} design questions.`,
);
