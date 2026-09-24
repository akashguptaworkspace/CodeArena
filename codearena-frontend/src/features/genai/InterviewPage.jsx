import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/AuthContext";
import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { LoadingState } from "@/shared/feedback/LoadingState";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { Stack } from "@/shared/layout/Stack";
import { Badge, Button, Card, ProgressBar, SegmentedControl, TextField } from "@/shared/ui";
import { Block, Rich } from "./components/LessonBody";
import { getGenAiDay } from "./data/plan";
import { interviewId, loadInterview } from "./data/interview";
import styles from "./InterviewPage.module.css";

const LEVEL_TONE = { Basic: "easy", Intermediate: "medium", Advanced: "hard" };
const LEVELS = [
  { value: "all", label: "All levels" },
  { value: "Basic", label: "Basic" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];

function useInterview(dayId) {
  const [state, setState] = useState({ dayId: null, data: undefined, error: false });
  useEffect(() => {
    let live = true;
    loadInterview(dayId)
      .then((data) => live && setState({ dayId, data, error: false }))
      .catch(() => live && setState({ dayId, data: null, error: true }));
    return () => {
      live = false;
    };
  }, [dayId]);
  return state.dayId === dayId ? state : { dayId, data: undefined, error: false };
}

function Question({ item, number, ready, onToggle, open, onOpenChange }) {
  return (
    <details className={styles.item} open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
      <summary className={styles.summary}>
        <span className={styles.num}>{number}</span>
        <span className={styles.q}>
          <Rich text={item.q} />
        </span>
        <span className={styles.badges}>
          {item.common && <Badge tone="neutral">Often asked</Badge>}
          <Badge tone={LEVEL_TONE[item.level] ?? "neutral"}>{item.level}</Badge>
          {ready && <Badge tone="easy">Ready</Badge>}
        </span>
      </summary>
      <div className={styles.body}>
        <section className={styles.answer} aria-label="Answer">
          <span className={styles.label}>Say this</span>
          <p>
            <Rich text={item.answer} />
          </p>
        </section>
        {item.detail?.length > 0 && (
          <section className={styles.detail} aria-label="In depth">
            <span className={styles.label}>In depth</span>
            {item.detail.map((b, i) => (
              <Block key={i} block={b} label={item.q} />
            ))}
          </section>
        )}
        {item.followups?.length > 0 && (
          <section className={styles.followups} aria-label="Likely follow-ups">
            <span className={styles.label}>Likely follow-up questions</span>
            <ul>
              {item.followups.map((f) => (
                <li key={f}>
                  <Rich text={f} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <div>
          <Button variant={ready ? "secondary" : "primary"} size="sm" onClick={onToggle}>
            {ready ? "Mark as not ready" : "I can answer this"}
          </Button>
        </div>
      </div>
    </details>
  );
}

// A day's interview question bank: questions grouped by topic, each opening to a model answer.
export function InterviewPage() {
  const { dayId } = useParams();
  const day = getGenAiDay(dayId);
  const { data, error } = useInterview(dayId);
  const { progress } = useProgressState();
  const { setDesignStatus, runAfterSignIn } = useProgressActions();
  const { user } = useAuth();
  const [filters, setFilters] = usePersistentState("practice-ground:genai-interview-filters", {
    level: "all",
    hideReady: false,
  });
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState(() => new Set());
  useDocumentTitle(data?.title ? `Day ${day?.number} · ${data.title}` : null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpenIds(new Set());
  }, [dayId]);

  const isReady = (q) => progress.design[interviewId(dayId, q.id)] === "ready";

  const visibleGroups = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.groups
      .map((g) => ({
        ...g,
        questions: g.questions.filter(
          (q) =>
            (filters.level === "all" || q.level === filters.level) &&
            (!filters.hideReady || progress.design[interviewId(dayId, q.id)] !== "ready") &&
            (!needle || q.q.toLowerCase().includes(needle) || q.answer.toLowerCase().includes(needle)),
        ),
      }))
      .filter((g) => g.questions.length > 0);
  }, [data, query, filters, progress.design, dayId]);

  if (!day) return <Navigate to="/genai" replace />;

  const all = data?.groups.flatMap((g) => g.questions) ?? [];
  const readyCount = all.filter(isReady).length;
  const visibleIds = visibleGroups.flatMap((g) => g.questions.map((q) => q.id));
  const backTo = `/genai#day-${day.number}`;

  const toggle = (q) => {
    const id = interviewId(dayId, q.id);
    if (!user) {
      return runAfterSignIn("save your interview prep progress", (actions, saved) => {
        if (saved.design[id] !== "ready") actions.setDesignStatus(id, "ready");
      });
    }
    setDesignStatus(id, isReady(q) ? null : "ready");
  };

  const setOpen = (id, open) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  let n = 0;

  return (
    <Stack gap="section" className={styles.page}>
      <header className={styles.header}>
        <Link to={backTo} className={styles.back}>
          ← Back to Day {day.number}
        </Link>
        <p className={styles.eyebrow}>Day {day.number} · Interview questions</p>
        <h1 className={styles.title}>{data?.title ?? "Interview questions"}</h1>
        {data?.intro && (
          <p className={styles.intro}>
            <Rich text={data.intro} />
          </p>
        )}
      </header>

      {data === undefined && <LoadingState message="Loading questions…" />}
      {(error || data === null) && (
        <Card>
          <p className={styles.muted}>{error ? "Questions couldn't load. Refresh to try again." : "Interview questions for this day are coming soon."}</p>
        </Card>
      )}

      {data && (
        <>
          <Card className={styles.progress}>
            <p className={styles.count}>
              <b>{readyCount}</b> / {all.length} ready to answer
            </p>
            <ProgressBar
              size="sm"
              total={all.length}
              label={`${readyCount} of ${all.length} questions ready`}
              segments={[{ value: readyCount, color: "var(--easy)" }]}
            />
            <p className={styles.muted}>
              How to prepare: read the question, answer it out loud in about a minute, then open it and compare. Mark it
              ready only when you could say it confidently to an interviewer.
            </p>
          </Card>

          <div className={styles.toolbar}>
            <TextField
              id="genai-interview-search"
              label="Search questions"
              hideLabel
              type="search"
              placeholder="Search (e.g. decorator, GIL, Depends)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.search}
            />
            <SegmentedControl
              label="Filter by level"
              options={LEVELS}
              value={filters.level}
              onChange={(level) => setFilters((f) => ({ ...f, level }))}
            />
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filters.hideReady}
                onChange={(e) => setFilters((f) => ({ ...f, hideReady: e.target.checked }))}
              />
              Hide ready
            </label>
            <div className={styles.expand}>
              <Button variant="ghost" size="sm" onClick={() => setOpenIds(new Set(visibleIds))}>
                Expand all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpenIds(new Set())}>
                Collapse all
              </Button>
            </div>
          </div>

          {visibleGroups.length === 0 && (
            <Card>
              <p className={styles.muted}>No questions match these filters.</p>
            </Card>
          )}

          {visibleGroups.map((group) => {
            const total = data.groups.find((g) => g.title === group.title).questions;
            return (
              <section key={group.title} className={styles.group} aria-label={group.title}>
                <div className={styles.groupHead}>
                  <h2 className={styles.groupTitle}>{group.title}</h2>
                  <span className={styles.muted}>
                    {total.filter(isReady).length}/{total.length} ready
                  </span>
                </div>
                <div className={styles.list}>
                  {group.questions.map((q) => {
                    n += 1;
                    return (
                      <Question
                        key={q.id}
                        item={q}
                        number={n}
                        ready={isReady(q)}
                        onToggle={() => toggle(q)}
                        open={openIds.has(q.id)}
                        onOpenChange={(open) => setOpen(q.id, open)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}

      <Link to={backTo} className={styles.back}>
        ← Back to Day {day.number}: {day.title}
      </Link>
    </Stack>
  );
}
