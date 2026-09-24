import { useEffect } from "react";
import { Navigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/AuthContext";
import { QaAnswer } from "@/features/practice/QaAnswer";
import { QaQuestionCard } from "@/features/practice/QaQuestionCard";
import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { AttemptNotes } from "@/features/system-design/components/question/AttemptNotes";
import { FollowUp } from "@/features/system-design/components/question/FollowUp";
import { QuestionHeader } from "@/features/system-design/components/question/QuestionHeader";
import { QuestionPager } from "@/features/system-design/components/question/QuestionPager";
import { RevealGate } from "@/features/system-design/components/question/RevealGate";
import { SelfCheck } from "@/features/system-design/components/question/SelfCheck";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { Stack } from "@/shared/layout/Stack";
import { getSqlQuestion, SQL_TRACKS } from "./data/sql";
import styles from "./SqlQuestionPage.module.css";

const QUERY_LABELS = { summary: "Approach", code: "Query", points: "Why it works", alt: "Another way" };
const REVEAL_HINTS = {
  queries: "Reveal the model query to compare: the approach, the query, why it works and the edge cases. Then tick what you covered.",
  concepts: "Reveal the model answer to compare: the short answer, the in-depth points and common mistakes. Then tick what you covered.",
};

// Read the question → write your query/answer → reveal → self-check → follow-up.
export function SqlQuestionPage() {
  const { section, questionId } = useParams();
  const track = SQL_TRACKS[section];
  const question = getSqlQuestion(questionId);
  const { progress } = useProgressState();
  const { setDesignStatus, updateDesignAttempt, resetDesignAttempt } = useProgressActions();
  const { isGuest } = useAuth();
  useDocumentTitle(question?.title);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [questionId]);

  if (!track || !question || question.track !== track.id) {
    return <Navigate to={track ? track.path : SQL_TRACKS.queries.path} replace />;
  }

  const isQuery = track.id === "queries";
  const attempt = progress.designAttempts[question.id] || null;
  const status = progress.design[question.id] || null;
  const revealed = Boolean(attempt?.revealed);
  const leetcode = question.leetcode
    ? { href: `https://leetcode.com/problems/${question.leetcode}/`, label: "Run a similar problem on LeetCode" }
    : null;

  const reveal = () => {
    updateDesignAttempt(question.id, { revealed: true });
    if (!status && !isGuest) setDesignStatus(question.id, "studied");
  };

  const toggleCovered = (index) => {
    const covered = new Set(attempt?.covered ?? []);
    if (covered.has(index)) covered.delete(index);
    else covered.add(index);
    updateDesignAttempt(question.id, { covered: [...covered] });
  };

  return (
    <Stack gap="section" className={styles.page}>
      <QuestionHeader
        question={question}
        track={track}
        status={status}
        onStatusChange={(value) => setDesignStatus(question.id, value)}
      />

      <Stack>
        <QaQuestionCard question={question} externalLink={leetcode} />
        <AttemptNotes key={question.id} question={question} track={track} notes={attempt?.notes ?? ""} />

        {revealed ? (
          <>
            <QaAnswer question={question} labels={isQuery ? QUERY_LABELS : undefined} codeFirst={isQuery} />
            <SelfCheck
              question={question}
              attempt={attempt}
              status={status}
              noun={track.attemptNoun}
              onToggle={toggleCovered}
              onMarkPractised={() => setDesignStatus(question.id, "practised")}
            />
            <FollowUp
              twist={question.twist}
              hint={isQuery ? "Write the follow-up query in your notes, then compare with the answer above." : "Answer it in your notes, then compare with the model answer above."}
              onHide={() => updateDesignAttempt(question.id, { revealed: false })}
              onReset={() => resetDesignAttempt(question.id)}
            />
          </>
        ) : (
          <RevealGate
            hasNotes={Boolean(attempt?.notes?.trim())}
            onReveal={reveal}
            noun={track.attemptNoun}
            hint={REVEAL_HINTS[track.id]}
          />
        )}
      </Stack>

      <QuestionPager track={track} question={question} />
    </Stack>
  );
}
