// SQL question bank, in two tracks:
//   queries:  write the query for the given tables (LeetCode-style, MySQL 8)
//   concepts: theory questions following the backend interview roadmap
//
// Each question: title, scenario, optional tables/code shown up front; answer { summary, code?, points,
// alt?, pitfalls? }, rubric and twist are hidden until the student reveals the answer.
// Progress reuses the design stages and attempts, keyed by the `sql-` prefixed id.

import conceptsCore from "./content/conceptsCore";
import conceptsDesign from "./content/conceptsDesign";
import conceptsOps from "./content/conceptsOps";
import queriesBasics from "./content/queriesBasics";
import queriesPatterns from "./content/queriesPatterns";
import queriesWindows from "./content/queriesWindows";
import { SQL_CONCEPT_BASE, SQL_QUERY_BASE } from "./catalog";

const CONTENT = {
  ...queriesBasics,
  ...queriesWindows,
  ...queriesPatterns,
  ...conceptsCore,
  ...conceptsDesign,
  ...conceptsOps,
};

const withContent = (question) => ({
  ...question,
  ...CONTENT[question.id],
  path: `/sql/${question.track}/${question.id}`,
});

export const SQL_TRACKS = {
  queries: {
    id: "queries",
    title: "Query questions",
    short: "SQL",
    backLabel: "All query questions",
    path: "/sql/queries",
    questions: SQL_QUERY_BASE.map(withContent),
    intro:
      "Write the query for the tables shown, the way tier 2 companies ask it in coding rounds. Answers use MySQL 8 (CTEs and window functions). Where a similar LeetCode problem exists, run your query there too.",
    attemptNoun: "query",
    notesPrompt: "Write your query before revealing the answer. Then say out loud why it works and what edge cases (NULLs, ties, duplicates, empty groups) it handles.",
    notesPlaceholder: "SELECT …\nFROM …\nWHERE …",
    searchPlaceholder: "Search questions (e.g. second highest, streak)",
  },
  concepts: {
    id: "concepts",
    title: "Concepts",
    short: "SQL",
    backLabel: "All concept questions",
    path: "/sql/concepts",
    questions: SQL_CONCEPT_BASE.map(withContent),
    intro:
      "The MySQL theory backend interviewers ask: transactions and locking, indexing, modelling, scaling, production safety, security and Sequelize.",
    attemptNoun: "answer",
    notesPrompt: "Answer as you would out loud: the definition, how it works in MySQL/InnoDB, an example, trade-offs, and what goes wrong in production.",
    notesPlaceholder: "e.g.\n- Short answer…\n- How it works in InnoDB…\n- Example…\n- Trade-offs and gotchas…",
    searchPlaceholder: "Search questions (e.g. deadlock, index, replica)",
  },
};

export const getSqlQuestion = (id) =>
  SQL_TRACKS.queries.questions.find((q) => q.id === id) || SQL_TRACKS.concepts.questions.find((q) => q.id === id) || null;
