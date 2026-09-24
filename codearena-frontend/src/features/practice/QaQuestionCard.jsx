import { Card, CodeBlock } from "@/shared/ui";
import styles from "./QaQuestionCard.module.css";

// What the interviewer asks: the question, any code or table schemas they show you. No hints.
export function QaQuestionCard({ question, externalLink }) {
  return (
    <Card size="lg" as="section" className={styles.card} aria-labelledby="question-heading">
      <h2 id="question-heading" className={styles.heading}>
        The question
      </h2>

      {question.tables?.length > 0 && (
        <div className={styles.tables}>
          {question.tables.map((table) => (
            <div key={table.name} className={styles.table}>
              <p className={styles.tableName}>{table.name}</p>
              <dl className={styles.columns}>
                {table.columns.map(([name, type]) => (
                  <div key={name} className={styles.column}>
                    <dt>{name}</dt>
                    <dd>{type}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}

      <p className={styles.scenario}>{question.scenario}</p>
      {question.code && <CodeBlock code={question.code} label="Code shown with the question" />}

      {externalLink && (
        <a className={styles.external} href={externalLink.href} target="_blank" rel="noopener noreferrer">
          {externalLink.label} ↗
        </a>
      )}
    </Card>
  );
}
