import { IS_REMOTE } from "@/config/env";
import { createHttpProgressStore } from "@/features/progress/stores/httpProgressStore";
import { createLocalProgressStore } from "@/features/progress/stores/localProgressStore";

/**
 * Returns the progress store for a user.
 * Every store implements: load(), setSolved(id, date|null), setFlagged(id, bool), setDailyGoal(n),
 * setDesignStatus(id, status|null), setDesignAttempt(id, attempt|null).
 */
export function getProgressStore(user) {
  return IS_REMOTE ? createHttpProgressStore() : createLocalProgressStore(user.id);
}
