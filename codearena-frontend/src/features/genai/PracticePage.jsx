import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/AuthContext";
import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { AttemptNotes } from "@/features/system-design/components/question/AttemptNotes";
import { LoadingState } from "@/shared/feedback/LoadingState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { Stack } from "@/shared/layout/Stack";
import { Badge, Button, Card, CodeBlock, ProgressBar } from "@/shared/ui";
import { Block, Rich } from "./components/LessonBody";
import { getGenAiDay } from "./data/plan";
import { loadPractice, practiceId, practiceNotesId } from "./data/practice";
import styles from "./PracticePage.module.css";

const LEVEL_TONE = { Easy: "easy", Medium: "medium", Hard: "hard" };

const NOTES_TRACK = {
  attemptNoun: "practice notes",
  notesPrompt: "Mistakes you made, patterns worth remembering, snippets to reuse. Saved to your account.",
  notesPlaceholder: "e.g.\n- I forgot that list.sort() returns None…\n- Pattern: Counter(...).most_common(k)…",
};

function usePractice(dayId) {
  const [state, setState] = useState({ dayId: null, data: undefined, error: false });
  useEffect(() => {
    let live = true;
    loadPractice(dayId)
      .then((data) => live && setState({ dayId, data, error: false }))
      .catch(() => live && setState({ dayId, data: null, error: true }));
    return () => {
      live = false;
    };
  }, [dayId]);
  return state.dayId === dayId ? state : { dayId, data: undefined, error: false };
}

function Exercise({ exercise, number, solved, onToggleSolved }) {
  const [showSolution, setShowSolution] = useState(false);
  const label = `Exercise ${number}: ${exercise.title}`;

  return (
    <details className={styles.exercise}>
      <summary className={styles.summary}>
        <span className={styles.num}>{number}</span>
        <span className={styles.exTitle}>{exercise.title}</span>
        <span className={styles.badges}>
          <Badge tone={LEVEL_TONE[exercise.level] ?? "neutral"}>{exercise.level}</Badge>
          {solved && <Badge tone="easy">Solved</Badge>}
        </span>
      </summary>

      <div className={styles.body}>
        <section className={styles.part} aria-label="Task">
          <span className={styles.partLabel}>Your task</span>
          {exercise.task.map((b, i) => (
            <Block key={i} block={b} label={label} />
          ))}
        </section>

        {exercise.starter && (
          <section className={styles.part} aria-label="Starter code">
            <span className={styles.partLabel}>Start from this</span>
            <CodeBlock code={exercise.starter} label={`${label}: starter code`} />
          </section>
        )}

        {exercise.hint && (
          <details className={styles.hint}>
            <summary>Stuck? Show a hint</summary>
            <p>
              <Rich text={exercise.hint} />
            </p>
          </details>
        )}

        {!showSolution ? (
          <div className={styles.gate}>
            <p>Write and run your own version on your laptop first. Then compare.</p>
            <Button variant="secondary" size="sm" onClick={() => setShowSolution(true)}>
              Show solution
            </Button>
          </div>
        ) : (
          <>
            <section className={styles.part} aria-label="Solution">
              <span className={`${styles.partLabel} ${styles.solutionLabel}`}>Solution</span>
              <CodeBlock code={exercise.solution} label={`${label}: solution`} />
            </section>
            <section className={styles.part} aria-label="Explanation">
              <span className={styles.partLabel}>How it works</span>
              {exercise.explanation.map((b, i) => (
                <Block key={i} block={b} label={label} />
              ))}
            </section>
            {exercise.concepts?.length > 0 && (
              <section className={styles.part} aria-label="Concepts used">
                <span className={styles.partLabel}>Concepts used</span>
                <dl className={styles.concepts}>
                  {exercise.concepts.map(([term, def]) => (
                    <div key={term} className={styles.concept}>
                      <dt>
                        <Rich text={term} />
                      </dt>
                      <dd>
                        <Rich text={def} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </>
        )}

        <div className={styles.actions}>
          <Button variant={solved ? "secondary" : "primary"} size="sm" onClick={onToggleSolved}>
            {solved ? "Mark as not solved" : "Mark as solved"}
          </Button>
          {showSolution && (
            <Button variant="ghost" size="sm" onClick={() => setShowSolution(false)}>
              Hide solution
            </Button>
          )}
        </div>
      </div>
    </details>
  );
}

// Small exercises for one day: try it on your laptop, reveal the solution, read what each concept means.
export function PracticePage() {
  const { dayId } = useParams();
  const day = getGenAiDay(dayId);
  const { data, error } = usePractice(dayId);
  const { progress } = useProgressState();
  const { setDesignStatus, runAfterSignIn } = useProgressActions();
  const { user } = useAuth();
  useDocumentTitle(day ? `Day ${day.number} practice` : null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [dayId]);

  if (!day) return <Navigate to="/genai" replace />;

  const backTo = `/genai#day-${day.number}`;
  const all = data?.groups.flatMap((g) => g.exercises) ?? [];
  const isSolved = (ex) => progress.design[practiceId(day.id, ex.id)] === "ready";
  const solvedCount = all.filter(isSolved).length;

  const toggle = (ex) => {
    const id = practiceId(day.id, ex.id);
    if (!user) {
      return runAfterSignIn("save your practice progress", (actions, saved) => {
        if (saved.design[id] !== "ready") actions.setDesignStatus(id, "ready");
      });
    }
    setDesignStatus(id, isSolved(ex) ? null : "ready");
  };

  let n = 0;

  return (
    <Stack gap="section" className={styles.page}>
      <header className={styles.header}>
        <Link to={backTo} className={styles.back}>
          ← Back to Day {day.number}
        </Link>
        <p className={styles.eyebrow}>Day {day.number} · Practice</p>
        <h1 className={styles.title}>{day.title}: hands-on exercises</h1>
        {data?.intro && (
          <p className={styles.intro}>
            <Rich text={data.intro} />
          </p>
        )}
      </header>

      {data === undefined && <LoadingState message="Loading exercises…" />}
      {(error || data === null) && (
        <Card>
          <p className={styles.muted}>{error ? "Exercises couldn't load. Refresh to try again." : "Exercises for this day are coming soon."}</p>
        </Card>
      )}

      {data && (
        <>
          <Card className={styles.progress}>
            <p className={styles.count}>
              <b>{solvedCount}</b> / {all.length} solved
            </p>
            <ProgressBar
              size="sm"
              total={all.length}
              label={`${solvedCount} of ${all.length} exercises solved`}
              segments={[{ value: solvedCount, color: "var(--easy)" }]}
            />
            <p className={styles.muted}>
              How to practise: open an exercise, write the code in a file on your laptop and run it. Use the hint only if
              stuck. Reveal the solution after your attempt runs, even if it's wrong.
            </p>
          </Card>

          {data.setup?.length > 0 && (
            <details className={styles.setup}>
              <summary>One-time setup for this day's exercises</summary>
              <div className={styles.setupBody}>
                {data.setup.map((b, i) => (
                  <Block key={i} block={b} label="Setup" />
                ))}
              </div>
            </details>
          )}

          {data.groups.map((group) => (
            <section key={group.title} className={styles.group} aria-labelledby={`g-${group.title}`}>
              <div className={styles.groupHead}>
                <h2 id={`g-${group.title}`} className={styles.groupTitle}>
                  {group.title}
                </h2>
                <span className={styles.muted}>
                  {group.exercises.filter(isSolved).length}/{group.exercises.length} solved
                </span>
              </div>
              <div className={styles.list}>
                {group.exercises.map((ex) => {
                  n += 1;
                  return <Exercise key={ex.id} exercise={ex} number={n} solved={isSolved(ex)} onToggleSolved={() => toggle(ex)} />;
                })}
              </div>
            </section>
          ))}

          <AttemptNotes
            key={practiceNotesId(day.id)}
            question={{ id: practiceNotesId(day.id) }}
            track={NOTES_TRACK}
            notes={progress.designAttempts[practiceNotesId(day.id)]?.notes ?? ""}
          />
        </>
      )}

      <Link to={backTo} className={styles.back}>
        ← Back to Day {day.number}: {day.title}
      </Link>
    </Stack>
  );
}
