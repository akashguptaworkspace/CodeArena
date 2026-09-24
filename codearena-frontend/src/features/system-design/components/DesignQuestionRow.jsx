import { memo } from "react";
import { Link } from "react-router";
import { DESIGN_STATUSES } from "@/features/system-design/data/systemDesign";
import { attemptScore, STATUS_OPTIONS } from "@/features/system-design/utils/attemptScore";
import { Badge, DifficultyBadge, Select, Tag } from "@/shared/ui";
import styles from "./DesignQuestionRow.module.css";

const OPTIONS = STATUS_OPTIONS(DESIGN_STATUSES);

// One question in the list: opens the practice page; shows score and progress at a glance.
export const DesignQuestionRow = memo(function DesignQuestionRow({ question, status, attempt, onStatusChange }) {
  const score = attempt?.revealed && attempt.covered.length ? attemptScore(question, attempt) : null;
  const drafted = !attempt?.revealed && attempt?.notes?.trim();

  return (
    <li className={`${styles.row} ${status === "ready" ? styles.ready : ""}`}>
      <Link to={question.path} className={styles.link}>
        <span className={styles.title}>{question.title}</span>
        <span className={styles.meta}>
          <DifficultyBadge difficulty={question.level} />
          {question.core && <Tag title="Most frequently asked">Core</Tag>}
          {score && <Badge tone={score.tone}>{score.percent}% covered</Badge>}
          {drafted && <Badge tone="neutral">Draft</Badge>}
        </span>
      </Link>
      <Select
        id={`status-${question.id}`}
        label={`Progress on ${question.title}`}
        options={OPTIONS}
        value={status || ""}
        tone={status || undefined}
        onChange={(value) => onStatusChange(question.id, value || null)}
      />
    </li>
  );
});
