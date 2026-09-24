import { useEffect } from "react";
import { Navigate, useParams } from "react-router";
import { AttemptNotes } from "@/features/system-design/components/question/AttemptNotes";
import { FollowUp } from "@/features/system-design/components/question/FollowUp";
import { ModelAnswer } from "@/features/system-design/components/question/ModelAnswer";
import { ProblemStatement } from "@/features/system-design/components/question/ProblemStatement";
import { QuestionHeader } from "@/features/system-design/components/question/QuestionHeader";
import { QuestionPager } from "@/features/system-design/components/question/QuestionPager";
import { RevealGate } from "@/features/system-design/components/question/RevealGate";
import { SelfCheck } from "@/features/system-design/components/question/SelfCheck";
import { DESIGN_TRACKS, getDesignQuestion } from "@/features/system-design/data/systemDesign";
import { useAuth } from "@/features/auth/AuthContext";
import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { Stack } from "@/shared/layout/Stack";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import styles from "./QuestionPage.module.css";

/**
 * One design question as a practice session:
 *   1. read the scenario   2. write your design   3. reveal the model answer
 *   4. tick what you covered (score)   5. try the follow-up
 */
export function QuestionPage() {
  const { section, questionId } = useParams();
  const track = DESIGN_TRACKS[section];
  const question = getDesignQuestion(questionId);
  const { progress } = useProgressState();
  const { setDesignStatus, updateDesignAttempt, resetDesignAttempt } = useProgressActions();
  const { isGuest } = useAuth();
  useDocumentTitle(question?.title);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [questionId]);

  if (!track || !question || question.track !== track.id) {
    return <Navigate to={`/system-design/${track ? track.id : "hld"}`} replace />;
  }

  const attempt = progress.designAttempts[question.id] || null;
  const status = progress.design[question.id] || null;
  const revealed = Boolean(attempt?.revealed);

  const reveal = () => {
    updateDesignAttempt(question.id, { revealed: true });
    // Guests can read the answer; the "studied" stage is recorded if they sign in later.
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
        <ProblemStatement question={question} track={track} />
        <AttemptNotes key={question.id} question={question} track={track} notes={attempt?.notes ?? ""} />

        {revealed ? (
          <>
            <ModelAnswer question={question} track={track} />
            <SelfCheck
              question={question}
              attempt={attempt}
              status={status}
              onToggle={toggleCovered}
              onMarkPractised={() => setDesignStatus(question.id, "practised")}
            />
            <FollowUp
              twist={question.twist}
              onHide={() => updateDesignAttempt(question.id, { revealed: false })}
              onReset={() => resetDesignAttempt(question.id)}
            />
          </>
        ) : (
          <RevealGate hasNotes={Boolean(attempt?.notes?.trim())} onReveal={reveal} />
        )}
      </Stack>

      <QuestionPager track={track} question={question} />
    </Stack>
  );
}
