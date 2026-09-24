import { Link } from "react-router";
import styles from "./QuestionPager.module.css";

export function QuestionPager({ track, question }) {
  const list = track.questions;
  const i = list.findIndex((q) => q.id === question.id);
  const prev = list[i - 1];
  const next = list[i + 1];

  return (
    <nav className={styles.pager} aria-label="Other questions">
      {prev ? (
        <Link to={`/system-design/${track.id}/${prev.id}`} className={styles.link}>
          <span className={styles.dir}>← Previous</span>
          <span className={styles.name}>{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`/system-design/${track.id}/${next.id}`} className={`${styles.link} ${styles.next}`}>
          <span className={styles.dir}>Next →</span>
          <span className={styles.name}>{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
