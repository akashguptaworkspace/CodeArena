import { Card, FlowDiagram } from "@/shared/ui";
import styles from "./ModelAnswer.module.css";

export function ModelAnswer({ question, track }) {
  const { summary, parts, flow, decisions } = question.solution;

  return (
    <Card size="lg" as="section" className={styles.card} aria-labelledby="answer-heading">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Model answer</p>
        <h2 id="answer-heading" className={styles.heading}>
          The approach
        </h2>
        <p className={styles.summary}>{summary}</p>
      </div>

      <section className={styles.block} aria-labelledby="parts-heading">
        <h3 id="parts-heading" className={styles.subheading}>
          {track.partsLabel}
        </h3>
        <ul className={styles.parts}>
          {parts.map(([name, detail]) => (
            <li key={name} className={styles.part}>
              <span className={styles.partName}>{name}</span>
              <span className={styles.partDetail}>{detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.block} aria-labelledby="flow-heading">
        <h3 id="flow-heading" className={styles.subheading}>
          {track.id === "hld" ? "How a request flows" : "How the main flow runs"}
        </h3>
        <FlowDiagram steps={flow} label={`${question.title} flow`} />
      </section>

      <section className={styles.block} aria-labelledby="decisions-heading">
        <h3 id="decisions-heading" className={styles.subheading}>
          {track.id === "hld" ? "Key decisions and trade-offs" : "Patterns and design decisions"}
        </h3>
        <ul className={styles.decisions}>
          {decisions.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
    </Card>
  );
}
