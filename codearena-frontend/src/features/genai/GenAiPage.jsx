import { useEffect } from "react";
import { useLocation } from "react-router";
import { CourseShareButtons } from "@/features/share/components/CourseShareButtons";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { PageIntro } from "@/shared/layout/PageIntro";
import { Stack } from "@/shared/layout/Stack";
import { Card, ProgressBar, SectionHeader, SegmentedControl, StatNumber } from "@/shared/ui";
import { DayCard } from "./components/DayCard";
import {
  GENAI_DAYS,
  GENAI_PHASES,
  GENAI_TOTAL_HOURS,
  PORTFOLIO,
  QUESTION_BANK,
} from "./data/plan";
import { useGenAiPlan } from "./hooks/useGenAiPlan";
import styles from "./GenAiPage.module.css";

const PHASE_OPTIONS = [{ value: "all", label: "All days" }, ...GENAI_PHASES.map((p) => ({ value: p.id, label: p.short }))];

export function GenAiPage() {
  useDocumentTitle("GenAI 20-Day Sprint");
  const { progress, stats, toggleTask } = useGenAiPlan();
  const [view, setView] = usePersistentState("practice-ground:genai-view", { phase: "all" });
  const phases = view.phase === "all" ? GENAI_PHASES : GENAI_PHASES.filter((p) => p.id === view.phase);

  // Coming back from a lesson (/genai#day-3): show every phase and scroll to that day.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash.startsWith("#day-")) return;
    if (view.phase !== "all") setView({ phase: "all" });
    requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
  }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Stack gap="section">
      <PageIntro
        eyebrow="MERN → GenAI developer"
        title="GenAI 20-Day Sprint"
        actions={<CourseShareButtons moduleId="genai" />}
      >
        <p>
          A beginner-to-advanced plan for full-stack developers moving into GenAI roles: {GENAI_TOTAL_HOURS} hours over
          20 days, no deep ML maths. Start with the big picture, build LLM apps with LangChain one component at a time,
          then RAG, agents and deployment. Each day has concepts to learn, something to build and interview questions to
          answer out loud. By Day 20 you have three portfolio projects and a deployed capstone.
        </p>
      </PageIntro>

      <Card className={styles.summary}>
        <h2 className="visually-hidden">Your progress</h2>
        <StatNumber value={stats.done} of={stats.total} caption="tasks done" />
        <div className={styles.summaryDetail}>
          <ProgressBar
            total={stats.total}
            label={`${stats.done} of ${stats.total} tasks done`}
            segments={[{ value: stats.done, color: "var(--easy)" }]}
          />
          <ul className={styles.legend}>
            <li>
              Days complete <b>{stats.daysComplete}/20</b>
            </li>
            <li>
              Projects <b>{PORTFOLIO.length}</b>
            </li>
            <li>
              Start applying <b>Day 16</b>
            </li>
          </ul>
          {stats.nextDay && (
            <p className={styles.next}>
              Up next: <a href={`#day-${stats.nextDay.number}`}>Day {stats.nextDay.number} · {stats.nextDay.title}</a>
            </p>
          )}
        </div>
      </Card>

      <section className={styles.section} aria-label="The 20-day plan">
        <div className={styles.filter}>
          <SegmentedControl
            label="Show phase"
            options={PHASE_OPTIONS}
            value={view.phase}
            onChange={(phase) => setView({ phase })}
          />
        </div>

        {phases.map((phase) => (
          <div key={phase.id} className={styles.phase}>
            <div className={styles.phaseHead}>
              <span className={styles.phaseDays}>{phase.days}</span>
              <h3 className={styles.phaseTitle}>{phase.title}</h3>
              <p className={styles.phaseSummary}>{phase.summary}</p>
            </div>
            {GENAI_DAYS.filter((d) => d.phase === phase.id).map((day) => (
              <DayCard
                key={day.id}
                day={day}
                dayStats={stats.byDay[day.id]}
                progress={progress}
                onToggle={toggleTask}
                isNext={stats.nextDay?.id === day.id}
              />
            ))}
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="genai-portfolio">
        <SectionHeader
          id="genai-portfolio"
          title="Your portfolio by Day 20"
          description="Each project needs a README with an architecture diagram, a 2-minute demo video and a live link."
        />
        <div className={styles.grid}>
          {PORTFOLIO.map((p) => (
            <Card key={p.title} className={styles.projectCard}>
              <span className={styles.phaseDays}>{p.when}</span>
              <h3 className={styles.cardTitle}>{p.title}</h3>
              <p className={styles.cardText}>{p.detail}</p>
              <code className={styles.stack}>{p.stack}</code>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="genai-questions">
        <SectionHeader
          id="genai-questions"
          title="Question bank"
          description="Common questions in GenAI developer interviews at Indian product startups, service companies and GCCs. Practise them aloud on Days 19–20."
        />
        <div className={styles.grid}>
          {QUESTION_BANK.map((group) => (
            <Card key={group.topic} className={styles.projectCard}>
              <h3 className={styles.cardTitle}>{group.topic}</h3>
              <ol className={styles.bank}>
                {group.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </section>
    </Stack>
  );
}
