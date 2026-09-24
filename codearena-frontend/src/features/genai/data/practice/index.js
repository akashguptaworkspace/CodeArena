/**
 * Hands-on practice exercises, one file per day, loaded only when the practice page opens.
 *
 * Each file default-exports:
 * {
 *   intro: string,                              // what this set practises
 *   setup?: Block[],                            // one-time setup on your laptop (see lessons/index.js for Block)
 *   groups: [{
 *     title: string,                            // e.g. "Strings and f-strings"
 *     exercises: [{
 *       id: string,                             // stable slug; progress is saved under it
 *       title: string,
 *       level: "Easy" | "Medium" | "Hard",
 *       task: Block[],                          // what to build; include expected output
 *       hint?: string,
 *       starter?: string,                       // code to start from
 *       solution: string,                       // full working code
 *       explanation: Block[],                   // why it works, line by line where useful
 *       concepts: [term, definition][],         // "Concepts used", e.g. ["str", "Python's text type..."]
 *     }],
 *   }],
 * }
 *
 * Solved state is stored in progress.design under practiceId(dayId, exerciseId), so run
 * `npm run sync:catalog` in the backend after adding or renaming exercises.
 */
export const practiceId = (dayId, exerciseId) => `genai-${dayId}-px-${exerciseId}`;
export const practiceNotesId = (dayId) => `genai-${dayId}-px-notes`;

const LOADERS = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => `d${String(i + 1).padStart(2, "0")}`).map((id) => [
    id,
    () => import(`./${id}.js`).then((m) => m.default),
  ]),
);

export function loadPractice(dayId) {
  const load = LOADERS[dayId];
  return load ? load() : Promise.resolve(null);
}
