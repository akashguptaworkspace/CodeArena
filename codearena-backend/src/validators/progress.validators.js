import { z } from "zod";
import { DESIGN_STATUSES } from "../models/DesignProgress.js";
import { MAX_NOTES_LENGTH } from "../models/DesignAttempt.js";
import { isDesignQuestionId, isProblemId } from "../utils/catalog.js";

// A real calendar date as "YYYY-MM-DD" (the user's local day).
const dayKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), "Not a real date");

const problemParams = z.object({
  problemId: z.string().refine(isProblemId, "Unknown problem"),
});
const questionParams = z.object({
  questionId: z.string().refine(isDesignQuestionId, "Unknown design question"),
});

export const updateProblemSchema = {
  params: problemParams,
  body: z
    .object({
      solvedOn: dayKey.nullable().optional(),
      flagged: z.boolean().optional(),
    })
    .strict()
    .refine((b) => b.solvedOn !== undefined || b.flagged !== undefined, "Send solvedOn and/or flagged"),
};

export const updateSettingsSchema = {
  body: z.object({ dailyGoal: z.number().int().min(1).max(20) }).strict(),
};

export const setDesignStatusSchema = {
  params: questionParams,
  body: z.object({ status: z.enum(DESIGN_STATUSES).nullable() }).strict(),
};

export const saveDesignAttemptSchema = {
  params: questionParams,
  body: z
    .object({
      notes: z.string().max(MAX_NOTES_LENGTH, `Notes can be at most ${MAX_NOTES_LENGTH} characters`),
      covered: z.array(z.number().int().min(0)).max(50),
      revealed: z.boolean(),
    })
    .strict(),
};

export const designAttemptParamsSchema = { params: questionParams };
