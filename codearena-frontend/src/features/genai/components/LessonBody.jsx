import { Fragment } from "react";
import { CodeBlock } from "@/shared/ui";
import styles from "./LessonBody.module.css";

// Inline formatting inside lesson text: `code`, **bold** and *italic*. Plain React nodes, never raw HTML.
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|(?<![\w*])\*(?!\s)[^*\n]+?(?<!\s)\*(?![\w*]))/g;

export function Rich({ text }) {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const CALLOUTS = { note: "Note", tip: "Pro tip", warn: "Watch out" };

// A flow diagram: steps left to right (top to bottom on phones). A step that is an array is a set of
// branches that run side by side, e.g. a parallel chain or the two paths of an if/else.
function Flow({ steps, caption, label }) {
  return (
    <figure className={styles.flowFigure}>
      <ol className={styles.flow} aria-label={caption || `${label}: flow`}>
        {steps.map((step, i) => (
          <li key={i} className={styles.flowStep}>
            {Array.isArray(step) ? (
              <ul className={styles.branches}>
                {step.map((branch) => (
                  <li key={branch} className={styles.node}>
                    <Rich text={branch} />
                  </li>
                ))}
              </ul>
            ) : (
              <span className={styles.node}>
                <Rich text={step} />
              </span>
            )}
          </li>
        ))}
      </ol>
      {caption && <figcaption className={styles.caption}><Rich text={caption} /></figcaption>}
    </figure>
  );
}

export function Block({ block, label }) {
  if (typeof block === "string") return <p className={styles.p}><Rich text={block} /></p>;

  if (block.code !== undefined) {
    return (
      <figure className={styles.figure}>
        {block.lang && <span className={styles.lang}>{block.lang}</span>}
        <CodeBlock code={block.code} label={block.caption || `${label}: code`} />
        {block.caption && <figcaption className={styles.caption}><Rich text={block.caption} /></figcaption>}
      </figure>
    );
  }

  if (block.flow) return <Flow steps={block.flow} caption={block.caption} label={label} />;

  if (block.list) {
    const List = block.ordered ? "ol" : "ul";
    return (
      <List className={styles.list}>
        {block.list.map((item) => (
          <li key={item}><Rich text={item} /></li>
        ))}
      </List>
    );
  }

  if (block.table) {
    return (
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={`${label}: table`}>
        <table className={styles.table}>
          <thead>
            <tr>{block.table.head.map((h) => <th key={h} scope="col"><Rich text={h} /></th>)}</tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, r) => (
              <tr key={r}>{row.map((cell, c) => <td key={c}><Rich text={cell} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const kind = Object.keys(CALLOUTS).find((k) => block[k]);
  if (kind) {
    return (
      <aside className={`${styles.callout} ${styles[kind]}`}>
        <span className={styles.calloutLabel}>{CALLOUTS[kind]}</span>
        <p><Rich text={block[kind]} /></p>
      </aside>
    );
  }
  return null;
}

// The teaching part of a lesson: numbered sections, each a list of blocks (see data/lessons/index.js).
export function LessonBody({ sections }) {
  return (
    <div className={styles.body}>
      {sections.map((section, i) => (
        <section key={section.h} className={styles.section} aria-labelledby={`lesson-s${i}`}>
          <h2 id={`lesson-s${i}`} className={styles.h}>
            <span className={styles.num}>{i + 1}</span>
            <Rich text={section.h} />
          </h2>
          {section.blocks.map((block, j) => (
            <Block key={j} block={block} label={section.h} />
          ))}
        </section>
      ))}
    </div>
  );
}
