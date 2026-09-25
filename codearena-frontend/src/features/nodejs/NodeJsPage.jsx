import { CategoryOverview } from "@/features/system-design/components/CategoryOverview";
import { DesignQuestionList } from "@/features/system-design/components/DesignQuestionList";
import { DesignSummary } from "@/features/system-design/components/DesignSummary";
import { DesignToolbar } from "@/features/system-design/components/DesignToolbar";
import { useDesignTrack } from "@/features/system-design/hooks/useDesignTrack";
import { DEFAULT_DESIGN_FILTERS } from "@/features/system-design/utils/designFilters";
import { CourseShareButtons } from "@/features/share/components/CourseShareButtons";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { PageIntro } from "@/shared/layout/PageIntro";
import { Stack } from "@/shared/layout/Stack";
import { NODE_TRACK } from "./data/nodejs";
import styles from "./NodeJsPage.module.css";

export function NodeJsPage() {
  useDocumentTitle("Node.js 100");
  const [filters, setFilters] = usePersistentState("practice-ground:design-filters:node", DEFAULT_DESIGN_FILTERS);
  const stats = useDesignTrack(NODE_TRACK, filters);
  const totalsByCategory = Object.fromEntries(stats.categories.map((c) => [c.category, c]));

  return (
    <Stack gap="section">
      <PageIntro eyebrow="Tier 2 backend rounds" title="Node.js 100" actions={<CourseShareButtons moduleId="nodejs" />}>
        <p>
          The Node.js questions backend interviewers ask most, from the event loop to production. Open a question,
          write your answer as you'd say it in the interview, then reveal the model answer and tick the key points you
          covered.
        </p>
      </PageIntro>

      <Stack>
        <DesignSummary trackShort={NODE_TRACK.short} stats={stats} />
        <CategoryOverview trackId={NODE_TRACK.id} categories={stats.categories} />
      </Stack>

      <div>
        <DesignToolbar filters={filters} onChange={setFilters} placeholder="Search questions (e.g. event loop, JWT)" />
        <div className={styles.list}>
          <DesignQuestionList
            trackId={NODE_TRACK.id}
            groups={stats.visibleGroups}
            totalsByCategory={totalsByCategory}
            onClearFilters={() => setFilters(DEFAULT_DESIGN_FILTERS)}
          />
        </div>
      </div>
    </Stack>
  );
}
