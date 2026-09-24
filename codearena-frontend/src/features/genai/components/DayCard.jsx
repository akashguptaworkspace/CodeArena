import { memo } from "react";
import { Link } from "react-router";
import { Badge, Card } from "@/shared/ui";
import styles from "./DayCard.module.css";

function TaskList({ tasks, progress, onToggle }) {
  return (
    <ul className={styles.tasks}>
      {tasks.map((task) => {
        const done = progress.design[task.id] === "ready";
        return (
          <li key={task.id} className={styles.taskRow}>
            <label className={`${styles.task} ${done ? styles.done : ""}`}>
              <input type="checkbox" className={styles.checkbox} checked={done} onChange={() => onToggle(task.id)} />
              <span>{task.text}</span>
            </label>
            <Link to={task.path} className={styles.read} aria-label={`${task.kind === "learn" ? "Read lesson" : "Open guide"}: ${task.text}`}>
              {task.kind === "learn" ? "Read" : "Guide"}
              <span aria-hidden="true"> →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// One day of the plan: what to learn, what to build, and the interview questions to drill.
export const DayCard = memo(function DayCard({ day, dayStats, progress, onToggle, isNext }) {
  const headingId = `genai-${day.id}-title`;
  const practicePrefix = `genai-${day.id}-px-`;
  const practiceSolved = Object.entries(progress.design).filter(
    ([id, status]) => status === "ready" && id.startsWith(practicePrefix) && !id.endsWith("-px-notes"),
  ).length;

  return (
    <Card as="article" id={`day-${day.number}`} aria-labelledby={headingId} className={`${styles.card} ${dayStats.complete ? styles.complete : ""}`}>
      <div className={styles.side}>
        <span className={styles.dayLabel}>Day</span>
        <span className={styles.dayNumber}>{String(day.number).padStart(2, "0")}</span>
        <span className={styles.meta}>{day.hours} hrs</span>
        <span className={styles.meta}>
          {dayStats.done}/{dayStats.total} done
        </span>
      </div>

      <div className={styles.main}>
        <div className={styles.head}>
          <h3 id={headingId} className={styles.title}>
            {day.title}
          </h3>
          {dayStats.complete ? <Badge tone="easy">Done</Badge> : isNext && <Badge tone="medium">Up next</Badge>}
        </div>
        <p className={styles.why}>{day.why}</p>
        {day.project && (
          <p className={styles.project}>
            <b>{day.project}</b>: today's build goes into your portfolio.
          </p>
        )}

        <div className={styles.columns}>
          <section className={styles.column} aria-label="Learn">
            <span className={`${styles.kind} ${styles.learn}`}>Learn</span>
            <TaskList tasks={day.learn} progress={progress} onToggle={onToggle} />
          </section>
          <section className={styles.column} aria-label="Build and interview drill">
            <span className={`${styles.kind} ${styles.build}`}>Build</span>
            <TaskList tasks={day.build} progress={progress} onToggle={onToggle} />
            <span className={`${styles.kind} ${styles.drill}`}>Interview drill</span>
            <ol className={styles.questions}>
              {day.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </section>
        </div>

        <div className={styles.practice}>
          <div className={styles.practiceText}>
            <span className={`${styles.kind} ${styles.practiceTag}`}>Practice</span>
            <p>
              Small hands-on exercises to solve on your laptop. Try first, then reveal the solution and the concepts it
              uses.
              {practiceSolved > 0 && <b> {practiceSolved} solved.</b>}
            </p>
          </div>
          <Link to={`/genai/${day.id}/practice`} className={styles.practiceLink}>
            Practice questions <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.resources}>
          <span className={styles.dayLabel}>Resources</span>
          {day.resources.map(([label, href]) => (
            <a key={href + label} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
});
