import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useProgressState } from "@/features/progress/ProgressContext";
import { AttemptNotes } from "@/features/system-design/components/question/AttemptNotes";
import { LoadingState } from "@/shared/feedback/LoadingState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { Stack } from "@/shared/layout/Stack";
import { Badge, Button, Card } from "@/shared/ui";
import { LessonBody, Rich } from "./components/LessonBody";
import { getGenAiDay, getGenAiTask, GENAI_TASKS } from "./data/plan";
import { loadLessons } from "./data/lessons";
import { MOVED_LESSONS } from "./data/movedLessons";
import { isTaskDone, useGenAiPlan } from "./hooks/useGenAiPlan";
import styles from "./LessonPage.module.css";

const NOTES_TRACK = {
  attemptNoun: "notes",
  notesPrompt: "Your revision notes for this lesson, in your own words. They're saved to your account.",
  notesPlaceholder: "e.g.\n- The one idea I must remember…\n- Code pattern I'll reuse…\n- What confused me, and the answer…",
};

function useLesson(dayId, slug) {
  const [state, setState] = useState({ key: null, lesson: null, error: false });
  const key = `${dayId}/${slug}`;
  useEffect(() => {
    let live = true;
    loadLessons(dayId)
      .then((lessons) => live && setState({ key, lesson: lessons[slug] || null, error: false }))
      .catch(() => live && setState({ key, lesson: null, error: true }));
    return () => {
      live = false;
    };
  }, [dayId, slug, key]);
  return state.key === key ? state : { key, lesson: undefined, error: false };
}

// One lesson: learn it here, tick it done, keep your own revision notes next to it.
export function LessonPage() {
  const { dayId, slug } = useParams();
  const day = getGenAiDay(dayId);
  const task = getGenAiTask(dayId, slug);
  const { lesson, error } = useLesson(dayId, slug);
  const { progress } = useProgressState();
  const { toggleTask } = useGenAiPlan();
  useDocumentTitle(task?.text);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [dayId, slug]);

  if (!day || !task) {
    const moved = MOVED_LESSONS[`${dayId}/${slug}`];
    return <Navigate to={moved ? `/genai/${moved}` : "/genai"} replace />;
  }

  const done = isTaskDone(progress, task.id);
  const i = GENAI_TASKS.findIndex((t) => t.id === task.id);
  const prev = GENAI_TASKS[i - 1];
  const next = GENAI_TASKS[i + 1];
  const kindLabel = task.kind === "learn" ? "Learn" : "Build";
  const backTo = `/genai#day-${day.number}`;

  return (
    <Stack gap="section" className={styles.page}>
      <header className={styles.header}>
        <Link to={backTo} className={styles.back}>
          ← Back to Day {day.number}
        </Link>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/genai">GenAI 20-Day Sprint</Link>
          <span aria-hidden="true">/</span>
          <Link to={backTo}>
            Day {day.number} · {day.title}
          </Link>
        </nav>
        <div className={styles.metaRow}>
          <Badge tone={task.kind === "learn" ? "neutral" : "easy"}>{kindLabel}</Badge>
          {lesson && <span className={styles.meta}>{lesson.level}</span>}
          {lesson && <span className={styles.meta}>~{lesson.minutes} min</span>}
          {done && <Badge tone="easy">Done</Badge>}
        </div>
        <h1 className={styles.title}>{task.text}</h1>
        {lesson?.intro && (
          <p className={styles.intro}>
            <Rich text={lesson.intro} />
          </p>
        )}
        {lesson?.recap && (
          <p className={styles.recap}>
            <span className={styles.recapLabel}>Where we are</span>
            <Rich text={lesson.recap} />
          </p>
        )}
        <div className={styles.actions}>
          <Button variant={done ? "secondary" : "primary"} onClick={() => toggleTask(task.id)}>
            {done ? "Mark as not done" : "Mark as done"}
          </Button>
          <a className={styles.jump} href="#lesson-notes">
            Jump to my notes ↓
          </a>
        </div>
      </header>

      {lesson === undefined && <LoadingState message="Loading lesson…" />}
      {(error || lesson === null) && (
        <Card>
          <p className={styles.muted}>
            {error ? "This lesson couldn't load. Check your connection and refresh." : "This lesson is being written. Use the day's resources for now, and keep notes below."}
          </p>
        </Card>
      )}

      {lesson && (
        <>
          <nav className={styles.toc} aria-label="In this lesson">
            <span className={styles.tocLabel}>In this lesson</span>
            <ol>
              {lesson.sections.map((s, n) => (
                <li key={s.h}>
                  <a href={`#lesson-s${n}`}>
                    <Rich text={s.h} />
                  </a>
                </li>
              ))}
              <li>
                <a href="#lesson-revise">Quick revision</a>
              </li>
              {lesson.check?.length > 0 && (
                <li>
                  <a href="#lesson-check">Check your understanding</a>
                </li>
              )}
            </ol>
          </nav>

          <LessonBody sections={lesson.sections} />

          <Card size="lg" as="section" className={styles.revise} aria-labelledby="lesson-revise">
            <h2 id="lesson-revise" className={styles.boxTitle}>
              Quick revision
            </h2>
            <p className={styles.muted}>Read this before interviews. If any line feels unfamiliar, re-read that section.</p>
            <ul className={styles.reviseList}>
              {lesson.revise.map((r) => (
                <li key={r}>
                  <Rich text={r} />
                </li>
              ))}
            </ul>
          </Card>

          {lesson.check?.length > 0 && (
            <section className={styles.box} aria-labelledby="lesson-check">
              <h2 id="lesson-check" className={styles.boxTitle}>
                Check your understanding
              </h2>
              <p className={styles.muted}>Answer each one in your own words, without scrolling up. Any you can't answer, re-read that section.</p>
              <ol className={styles.plainList}>
                {lesson.check.map((c) => (
                  <li key={c}>
                    <Rich text={c} />
                  </li>
                ))}
              </ol>
            </section>
          )}

          {lesson.mistakes?.length > 0 && (
            <section className={styles.box} aria-labelledby="lesson-mistakes">
              <h2 id="lesson-mistakes" className={styles.boxTitle}>
                Common mistakes
              </h2>
              <ul className={`${styles.plainList} ${styles.mistakes}`}>
                {lesson.mistakes.map((m) => (
                  <li key={m}>
                    <Rich text={m} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lesson.interview?.length > 0 && (
            <section className={styles.box} aria-labelledby="lesson-interview">
              <h2 id="lesson-interview" className={styles.boxTitle}>
                Interview questions
              </h2>
              <p className={styles.muted}>Answer out loud first, then open the model answer.</p>
              <div className={styles.qa}>
                {lesson.interview.map(({ q, a }) => (
                  <details key={q} className={styles.qaItem}>
                    <summary>
                      <Rich text={q} />
                    </summary>
                    <p>
                      <Rich text={a} />
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {lesson.practice?.length > 0 && (
            <section className={styles.box} aria-labelledby="lesson-practice">
              <h2 id="lesson-practice" className={styles.boxTitle}>
                Try it yourself
              </h2>
              <ol className={styles.plainList}>
                {lesson.practice.map((p) => (
                  <li key={p}>
                    <Rich text={p} />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      <div id="lesson-notes" className={styles.notes}>
        <AttemptNotes key={task.id} question={{ id: task.id }} track={NOTES_TRACK} notes={progress.designAttempts[task.id]?.notes ?? ""} />
      </div>

      <Link to={backTo} className={`${styles.back} ${styles.backBottom}`}>
        ← Back to Day {day.number}: {day.title}
      </Link>

      <nav className={styles.pager} aria-label="Other lessons">
        {prev ? (
          <Link to={prev.path} className={styles.pagerLink}>
            <span className={styles.dir}>← Previous · Day {Number(prev.dayId.slice(1))}</span>
            <span className={styles.pagerName}>{prev.text}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={next.path} className={`${styles.pagerLink} ${styles.nextLink}`}>
            <span className={styles.dir}>Next · Day {Number(next.dayId.slice(1))} →</span>
            <span className={styles.pagerName}>{next.text}</span>
          </Link>
        )}
      </nav>
    </Stack>
  );
}
