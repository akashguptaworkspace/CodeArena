import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProgressActions } from "@/features/progress/ProgressContext";
import { Card, TextArea } from "@/shared/ui";
import styles from "./AttemptNotes.module.css";

const SAVE_DELAY_MS = 800;

// The student's own design, written before revealing the model answer.
export function AttemptNotes({ question, track, notes }) {
  const noun = track.attemptNoun ?? "design";
  const { updateDesignAttempt, flushDesignAttempt, runAfterSignIn } = useProgressActions();
  const { isGuest } = useAuth();
  // What a guest typed. Nothing is saved until they sign in; then it's added to their account's notes.
  const guestDraft = useRef("");
  // Local copy so typing never waits on the store. The parent keys this component by question,
  // so the draft starts fresh per question; it also clears when the attempt is reset.
  const [draft, setDraft] = useState(notes);
  useEffect(() => {
    setDraft(notes);
  }, [notes]);

  const askToSave = () =>
    runAfterSignIn(`save your ${noun} notes`, (actions, progress) => {
      const typed = guestDraft.current.trim();
      guestDraft.current = "";
      if (!typed) return;
      const saved = progress.designAttempts[question.id]?.notes?.trim();
      actions.updateDesignAttempt(question.id, { notes: saved ? `${saved}\n\n${typed}` : typed });
    });

  const onChange = (e) => {
    setDraft(e.target.value);
    if (isGuest) {
      guestDraft.current = e.target.value;
      return;
    }
    updateDesignAttempt(question.id, { notes: e.target.value }, { debounceMs: SAVE_DELAY_MS });
  };

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  return (
    <Card size="lg" as="section" className={styles.card} aria-labelledby="attempt-heading">
      <div className={styles.head}>
        <h2 id="attempt-heading" className={styles.heading}>
          Your {noun}
        </h2>
        <span className={styles.count}>{words} words</span>
      </div>
      <TextArea
        id={`notes-${question.id}`}
        label={`Your ${noun} notes`}
        hideLabel
        hint={track.notesPrompt}
        value={draft}
        onChange={onChange}
        // Guests are asked once they've written something and leave the box.
        onBlur={() => (isGuest ? guestDraft.current.trim() && askToSave() : flushDesignAttempt(question.id))}
        placeholder={track.notesPlaceholder ?? "e.g.\n- Requirements I'd ask about…\n- Main parts…\n- Flow of one request…"}
        spellCheck
      />
    </Card>
  );
}
