import { emptyProgress, normalizeProgress } from "@/features/progress/progressModel";

// Browser-only store. Same interface as httpProgressStore, so the UI never knows which one it uses.
export function createLocalProgressStore(userId) {
  const key = `practice-ground:progress:${userId}`;

  const read = () => {
    try {
      return normalizeProgress(JSON.parse(localStorage.getItem(key)));
    } catch {
      return emptyProgress();
    }
  };

  const write = (progress) => {
    try {
      localStorage.setItem(key, JSON.stringify(progress));
    } catch {
      throw new Error("Couldn't save: browser storage is full or blocked.");
    }
  };

  const update = (mutate) => {
    const progress = read();
    mutate(progress);
    write(progress);
  };

  return {
    async load() {
      return read();
    },
    async setSolved(problemId, solvedOn) {
      update((p) => {
        if (solvedOn) p.solved[problemId] = solvedOn;
        else delete p.solved[problemId];
      });
    },
    async setFlagged(problemId, flagged) {
      update((p) => {
        if (flagged) p.flagged[problemId] = true;
        else delete p.flagged[problemId];
      });
    },
    async setDailyGoal(dailyGoal) {
      update((p) => {
        p.dailyGoal = dailyGoal;
      });
    },
    async setDesignStatus(questionId, status) {
      update((p) => {
        if (status) p.design[questionId] = status;
        else delete p.design[questionId];
      });
    },
    async setDesignAttempt(questionId, attempt) {
      update((p) => {
        if (attempt) p.designAttempts[questionId] = attempt;
        else delete p.designAttempts[questionId];
      });
    },
  };
}
