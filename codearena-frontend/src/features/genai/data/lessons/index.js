/**
 * Lesson content, one file per day, loaded only when a lesson is opened.
 *
 * Each file default-exports { [taskSlug]: Lesson }:
 *
 * Lesson = {
 *   minutes: number,                       // reading + trying time
 *   level: "Beginner" | "Intermediate" | "Advanced",
 *   intro: string,                         // why this matters, in plain words
 *   sections: [{ h: string, blocks: Block[] }],
 *   revise: string[],                      // quick-revision points
 *   mistakes?: string[],
 *   interview?: [{ q: string, a: string }],
 *   practice?: string[],
 * }
 *
 * Block = string                                  // paragraph; `code` and **bold** are supported inline
 *       | { code: string, lang?: string, caption?: string }
 *       | { list: string[], ordered?: boolean }
 *       | { table: { head: string[], rows: string[][] } }
 *       | { note: string } | { tip: string } | { warn: string }
 */
const LOADERS = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => {
    const id = `d${String(i + 1).padStart(2, "0")}`;
    return [id, id];
  }).map(([id]) => [id, () => import(`./${id}.js`).then((m) => m.default)]),
);

export function loadLessons(dayId) {
  const load = LOADERS[dayId];
  return load ? load() : Promise.resolve({});
}
