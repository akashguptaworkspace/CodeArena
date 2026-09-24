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
import { getNodeQuestion, NODE_TRACK } from "./data/nodejs";
import styles from "./NodeQuestionPage.module.css";

const REVEAL_HINT =
  "Reveal the model answer to compare: the short answer, the in-depth points, code and common mistakes. Then tick what you covered to get your score.";

// Read the question → write your answer → reveal → self-check → follow-up.
export function NodeQuestionPage() {
  const { questionId } = useParams();
  const question = getNodeQuestion(questionId);
  const { progress } = useProgressState();
  const { setDesignStatus, updateDesignAttempt, resetDesignAttempt } = useProgressActions();
  const { isGuest } = useAuth();
  useDocumentTitle(question?.title);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [questionId]);

  if (!question) return <Navigate to={NODE_TRACK.path} replace />;

  const attempt = progress.designAttempts[question.id] || null;
  const status = progress.design[question.id] || null;
  const revealed = Boolean(attempt?.revealed);

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
        track={NODE_TRACK}
        status={status}
        onStatusChange={(value) => setDesignStatus(question.id, value)}
      />

      <Stack>
        <QaQuestionCard question={question} />
        <AttemptNotes key={question.id} question={question} track={NODE_TRACK} notes={attempt?.notes ?? ""} />

        {revealed ? (
          <>
            <QaAnswer question={question} />
            <SelfCheck
              question={question}
              attempt={attempt}
              status={status}
              noun="answer"
              onToggle={toggleCovered}
              onMarkPractised={() => setDesignStatus(question.id, "practised")}
            />
            <FollowUp
              twist={question.twist}
              hint="Answer it in your notes, then compare with the model answer above."
              onHide={() => updateDesignAttempt(question.id, { revealed: false })}
              onReset={() => resetDesignAttempt(question.id)}
            />
          </>
        ) : (
          <RevealGate hasNotes={Boolean(attempt?.notes?.trim())} onReveal={reveal} noun="answer" hint={REVEAL_HINT} />
        )}
      </Stack>

      <QuestionPager track={NODE_TRACK} question={question} />
    </Stack>
  );
}
