import styles from "./SectionHeader.module.css";

// Heading for a block of content: title, optional count on the right, optional one-line description.
export function SectionHeader({ id, title, meta, description, as: Heading = "h2" }) {
  return (
    <div className={styles.header}>
      <div className={styles.row}>
        <Heading id={id} className={styles.title}>
          {title}
        </Heading>
        {meta && <span className={styles.meta}>{meta}</span>}
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
