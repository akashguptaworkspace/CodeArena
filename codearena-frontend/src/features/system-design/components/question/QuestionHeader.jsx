import { Link } from "react-router";
import { DESIGN_STATUSES } from "@/features/system-design/data/systemDesign";
import { STATUS_OPTIONS } from "@/features/system-design/utils/attemptScore";
import { DifficultyBadge, Select, Tag } from "@/shared/ui";
import styles from "./QuestionHeader.module.css";

export function QuestionHeader({ question, track, status, onStatusChange }) {
  return (
    <header className={styles.header}>
      <Link to={`/system-design/${track.id}`} className={styles.back}>
        ← All {track.short} questions
      </Link>
      <p className={styles.eyebrow}>
        {track.short} · {question.category}
      </p>
      <h1 className={styles.title}>{question.title}</h1>
      <div className={styles.meta}>
        <DifficultyBadge difficulty={question.level} />
        {question.core && <Tag title="Most frequently asked">Core</Tag>}
        <span className={styles.statusWrap}>
          <Select
            id={`status-${question.id}`}
            label="Your progress"
            hideLabel={false}
            options={STATUS_OPTIONS(DESIGN_STATUSES)}
            value={status || ""}
            tone={status || undefined}
            onChange={(v) => onStatusChange(v || null)}
          />
        </span>
      </div>
    </header>
  );
}
