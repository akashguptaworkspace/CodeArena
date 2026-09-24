import { apiRequest } from "@/shared/api/apiClient";
import { normalizeProgress } from "@/features/progress/progressModel";

// Talks to the Node.js backend. Contract: docs/API.md → "Progress".
// Each change is a small PATCH, so two devices editing different problems never overwrite each other.
export function createHttpProgressStore() {
  const patchProblem = (problemId, body) =>
    apiRequest(`/api/progress/problems/${encodeURIComponent(problemId)}`, { method: "PATCH", body });

  return {
    async load() {
      return normalizeProgress(await apiRequest("/api/progress"));
    },
    setSolved(problemId, solvedOn) {
      return patchProblem(problemId, { solvedOn: solvedOn || null });
    },
    setFlagged(problemId, flagged) {
      return patchProblem(problemId, { flagged });
    },
    setDailyGoal(dailyGoal) {
      return apiRequest("/api/progress/settings", { method: "PATCH", body: { dailyGoal } });
    },
    setDesignStatus(questionId, status) {
      return apiRequest(`/api/progress/design/${encodeURIComponent(questionId)}`, {
        method: "PATCH",
        body: { status: status || null },
      });
    },
    setDesignAttempt(questionId, attempt) {
      const path = `/api/progress/design/${encodeURIComponent(questionId)}/attempt`;
      return attempt ? apiRequest(path, { method: "PUT", body: attempt }) : apiRequest(path, { method: "DELETE" });
    },
  };
}
