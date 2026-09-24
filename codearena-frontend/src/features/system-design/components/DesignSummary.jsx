import { Link } from "react-router";
import { DESIGN_STATUSES } from "@/features/system-design/data/systemDesign";
import { Card, ProgressBar, StatNumber } from "@/shared/ui";
import { STATUS_COLORS, statusSegments } from "./statusStyles";
import styles from "./DesignSummary.module.css";

export function DesignSummary({ trackShort, stats }) {
  const { total, counts, core, nextUp } = stats;

  return (
    <Card className={styles.card}>
      <h2 className="visually-hidden">{trackShort} progress</h2>
      <StatNumber value={counts.ready} of={total} caption="interview-ready" />
      <div className={styles.detail}>
        <ProgressBar total={total} label={`${counts.ready} of ${total} interview-ready`} segments={statusSegments(counts)} />
        <ul className={styles.legend}>
          {[...DESIGN_STATUSES].reverse().map((s) => (
            <li key={s.value} style={{ "--c": STATUS_COLORS[s.value] }}>
              <i aria-hidden="true" />
              {s.label} <b>{counts[s.value]}</b>
            </li>
          ))}
          <li>
            Core ready{" "}
            <b>
              {core.ready}/{core.total}
            </b>
          </li>
        </ul>
        {nextUp && (
          <p className={styles.next}>
            Next up: <Link to={nextUp.path}>{nextUp.title}</Link>
          </p>
        )}
      </div>
    </Card>
  );
}
