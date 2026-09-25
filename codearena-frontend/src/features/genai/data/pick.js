/**
 * Day files (lessons/d04.js, practice/d04.js, interview/d04.js, …) are tables of contents: they pick
 * lessons, exercises and questions out of topic files (llm-apis.js, vectors.js, langchain-*.js, …),
 * so the course order can change without moving content around. Every helper throws when an id is
 * missing, so a typo fails the build instead of silently dropping content.
 */

const need = (value, what) => {
  if (!value) throw new Error(`GenAI course data: ${what} not found`);
  return value;
};

// { slug: Lesson } for the given slugs, in order.
export const pickLessons = (source, slugs) => Object.fromEntries(slugs.map((s) => [s, need(source[s], `lesson "${s}"`)]));

const findIn = (source, key, id) => {
  for (const group of source.groups) {
    const item = group[key].find((x) => x.id === id);
    if (item) return item;
  }
  return need(null, `${key === "exercises" ? "exercise" : "question"} "${id}"`);
};

// A practice group built from exercises (by id) of a practice file.
export const exerciseGroup = (title, source, ids) => ({ title, exercises: ids.map((id) => findIn(source, "exercises", id)) });

// An interview group built from questions (by id) of an interview bank.
export const questionGroup = (title, source, ids) => ({ title, questions: ids.map((id) => findIn(source, "questions", id)) });

// A whole group of a practice file or interview bank, by its title.
export const groupNamed = (source, title) => need(source.groups.find((g) => g.title === title), `group "${title}"`);
