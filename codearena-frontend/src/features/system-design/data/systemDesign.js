// System design question bank: 50 HLD + 50 LLD.
//
// Each question has two halves:
//   Shown up front:   title, scenario, requirements, constraints   (no hints)
//   Hidden until the student reveals it:
//     solution { summary, parts, flow, decisions }   the model answer (content/*.js)
//     rubric                                          key points used for the self-check score
//     twist                                           the follow-up interviewers typically add
//
// `id` is stable and prefixed by track so it can be used as a DB key.

import hldCommerce from "./content/hldCommerce";
import hldCore from "./content/hldCore";
import hldPlatform from "./content/hldPlatform";
import lldClassicGames from "./content/lldClassicGames";
import lldCommerce from "./content/lldCommerce";
import lldInfraSocial from "./content/lldInfraSocial";

import { DESIGN_STATUSES, HLD_BASE, LEVELS, LLD_BASE, TRACK_META } from "./catalog";

export { DESIGN_STATUSES, LEVELS };

const CONTENT = { ...hldCore, ...hldCommerce, ...hldPlatform, ...lldClassicGames, ...lldInfraSocial, ...lldCommerce };

const withContent = (question) => ({ ...question, ...CONTENT[question.id] });

export const HLD_QUESTIONS = HLD_BASE.map(withContent);
export const LLD_QUESTIONS = LLD_BASE.map(withContent);
export const ALL_DESIGN_QUESTIONS = [...HLD_QUESTIONS, ...LLD_QUESTIONS];
export const getDesignQuestion = (id) => ALL_DESIGN_QUESTIONS.find((q) => q.id === id) || null;

export const DESIGN_TRACKS = {
  hld: { ...TRACK_META.hld, questions: HLD_QUESTIONS },
  lld: { ...TRACK_META.lld, questions: LLD_QUESTIONS },
};
