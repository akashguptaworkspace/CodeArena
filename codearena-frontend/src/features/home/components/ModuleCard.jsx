import { Link } from "react-router";
import { Badge, Card, LockIcon, MODULE_ICONS, ProgressBar } from "@/shared/ui";
import styles from "./ModuleCard.module.css";

function accessBadge(module, unlocked, paywallEnabled) {
  if (module.status === "coming-soon") return <Badge tone="neutral">Coming soon</Badge>;
  if (module.access === "free") return <Badge tone="easy">Free</Badge>;
  if (!paywallEnabled) return <Badge tone="easy">Free for now</Badge>;
  if (unlocked) return <Badge tone="easy">Unlocked</Badge>;
  return <Badge tone="medium">₹{module.priceInr}</Badge>;
}

// The whole card is one link, so it's a big, easy tap target on phones.
export function ModuleCard({ module, unlocked, paywallEnabled, progress }) {
  const live = module.status === "live";
  const locked = live && !unlocked;
  const cta = !live ? "See what's coming" : locked ? "See what's inside" : progress?.done ? "Continue" : "Start";
  const Icon = MODULE_ICONS[module.icon];

  return (
    <Card as={Link} to={module.path} variant={live ? "default" : "dashed"} interactive className={styles.card}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          <Icon />
        </span>
        {accessBadge(module, unlocked, paywallEnabled)}
      </div>

      <div className={styles.text}>
        <h2 className={styles.title}>{module.title}</h2>
        <p className={styles.summary}>{module.summary}</p>
      </div>

      {live && progress && !locked && (
        <div className={styles.progress}>
          <ProgressBar
            size="sm"
            total={progress.total}
            label={`${progress.done} of ${progress.total} ${progress.label}`}
            segments={[{ value: progress.done, color: "var(--easy)" }]}
          />
          <span className={styles.count}>
            {progress.done} / {progress.total} {progress.label}
          </span>
        </div>
      )}

      <span className={styles.cta}>
        {locked && <LockIcon />}
        {cta}
        <span aria-hidden="true" className={styles.arrow}>
          →
        </span>
      </span>
    </Card>
  );
}
