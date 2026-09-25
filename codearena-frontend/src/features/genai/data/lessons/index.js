/**
 * Lesson content, loaded only when a lesson is opened. Each day file (d04.js, …) default-exports
 * { [taskSlug]: Lesson }, picking lessons from topic files (llm-apis.js, langchain-basics.js, …) so the
 * course order can change without moving content (see ../pick.js). Days 1–3 keep their content inline.
 *
 * Lesson = {
 *   minutes: number,                       // reading + trying time
 *   level: "Beginner" | "Intermediate" | "Advanced",
 *   intro: string,                         // why this matters, in plain words
 *   recap?: string,                        // "Where we are": what came before and how this lesson follows
 *   sections: [{ h: string, blocks: Block[] }],
 *   revise: string[],                      // quick-revision points
 *   check?: string[],                      // "Check your understanding" questions, answered without scrolling up
 *   mistakes?: string[],
 *   interview?: [{ q: string, a: string }],
 *   practice?: string[],
 * }
 *
 * Block = string                                  // paragraph; `code` and **bold** are supported inline
 *       | { code: string, lang?: string, caption?: string }
 *       | { list: string[], ordered?: boolean }
 *       | { table: { head: string[], rows: string[][] } }
 *       | { flow: (string | string[])[], caption?: string } // steps with arrows; an array = side-by-side branches
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
