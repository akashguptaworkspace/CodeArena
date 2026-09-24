import { Card, CodeBlock } from "@/shared/ui";
import styles from "./QaAnswer.module.css";

const DEFAULT_LABELS = { summary: "Say this first", points: "In depth", code: "Code", alt: "Another way" };

// Model answer for a question-and-answer module: short answer, depth, code, and common mistakes.
export function QaAnswer({ question, labels, codeFirst = false }) {
  const { summary, points, code, alt, pitfalls } = question.answer;
  const l = { ...DEFAULT_LABELS, ...labels };

  const codeSection = code && (
    <section className={styles.block} aria-labelledby="code-heading">
      <h3 id="code-heading" className={styles.subheading}>
        {l.code}
      </h3>
      <CodeBlock code={code} label={`${question.title}: ${l.code}`} />
    </section>
  );

  return (
    <Card size="lg" as="section" className={styles.card} aria-labelledby="answer-heading">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Model answer</p>
        <h2 id="answer-heading" className={styles.heading}>
          {l.summary}
        </h2>
        <p className={styles.summary}>{summary}</p>
      </div>

      {codeFirst && codeSection}
      <section className={styles.block} aria-labelledby="depth-heading">
        <h3 id="depth-heading" className={styles.subheading}>
          {l.points}
        </h3>
        <ul className={styles.list}>
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      {!codeFirst && codeSection}

      {alt && (
        <section className={styles.block} aria-labelledby="alt-heading">
          <h3 id="alt-heading" className={styles.subheading}>
            {l.alt}
          </h3>
          <CodeBlock code={alt} label={`${question.title}: ${l.alt}`} />
        </section>
      )}

      {pitfalls?.length > 0 && (
        <section className={styles.block} aria-labelledby="pitfalls-heading">
          <h3 id="pitfalls-heading" className={styles.subheading}>
            Mistakes that cost marks
          </h3>
          <ul className={`${styles.list} ${styles.pitfalls}`}>
            {pitfalls.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}
