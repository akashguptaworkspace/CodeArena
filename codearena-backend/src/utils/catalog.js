import { createRequire } from "node:module";

// Valid ids, generated from the frontend by `npm run sync:catalog`.
const catalog = createRequire(import.meta.url)("../data/catalog.json");

const problemIds = new Set(catalog.problems);
const designRubricSizes = new Map(Object.entries(catalog.designQuestions));

export const isProblemId = (id) => problemIds.has(id);
export const isDesignQuestionId = (id) => designRubricSizes.has(id);
export const rubricSize = (questionId) => designRubricSizes.get(questionId) ?? 0;
