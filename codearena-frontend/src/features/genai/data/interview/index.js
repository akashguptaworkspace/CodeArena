/**
 * Interview question banks, one file per day, loaded only when the interview page opens.
 *
 * Each file default-exports:
 * {
 *   title: string,                         // e.g. "Python interview questions"
 *   intro: string,
 *   groups: [{
 *     title: string,                       // topic, e.g. "OOP"
 *     questions: [{
 *       id: string,                        // stable slug; "ready" state is saved under it
 *       q: string,                         // the question (inline `code` allowed)
 *       level: "Basic" | "Intermediate" | "Advanced",
 *       common?: boolean,                  // asked very often
 *       answer: string,                    // what to say first, in 2-5 sentences
 *       detail?: Block[],                  // deeper explanation / code (see lessons/index.js)
 *       followups?: string[],              // what interviewers usually ask next
 *     }],
 *   }],
 * }
 *
 * Run `npm run sync:catalog` in the backend after adding or renaming questions.
 */
// Days that have an interview bank. Day files pick questions from topic banks (llm-apis.js, vectors.js, …).
export const INTERVIEW_DAYS = new Set(["d01", "d02", "d03", "d04", "d05", "d06", "d07", "d08", "d09", "d10", "d12", "d13", "d14", "d17"]);

export const interviewId = (dayId, questionId) => `genai-${dayId}-iq-${questionId}`;

const LOADERS = Object.fromEntries([...INTERVIEW_DAYS].map((id) => [id, () => import(`./${id}.js`).then((m) => m.default)]));

export function loadInterview(dayId) {
  const load = LOADERS[dayId];
  return load ? load() : Promise.resolve(null);
}
