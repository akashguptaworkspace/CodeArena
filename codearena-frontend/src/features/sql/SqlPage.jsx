import { Navigate, useParams } from "react-router";
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
import { NavTabs } from "@/shared/ui";
import { SQL_TRACKS } from "./data/sql";
import styles from "./SqlPage.module.css";

const TABS = [
  { to: SQL_TRACKS.queries.path, label: `Query questions · ${SQL_TRACKS.queries.questions.length}` },
  { to: SQL_TRACKS.concepts.path, label: `Concepts · ${SQL_TRACKS.concepts.questions.length}` },
];

export function SqlPage() {
  const { section } = useParams();
  const track = SQL_TRACKS[section];
  useDocumentTitle(track ? `SQL · ${track.title}` : "SQL");

  if (!track) return <Navigate to={SQL_TRACKS.queries.path} replace />;

  return (
    <Stack gap="section">
      <PageIntro eyebrow="Tier 2 backend rounds" title="SQL" actions={<CourseShareButtons moduleId="sql" />}>
        <p>
          Write the query for the tables you're given, then learn the MySQL concepts behind it. Write your answer first,
          reveal the model answer, and tick the key points you got right.
        </p>
      </PageIntro>

      <Stack>
        <NavTabs items={TABS} label="SQL sections" variant="secondary" />
        <TrackView key={track.id} track={track} />
      </Stack>
    </Stack>
  );
}

function TrackView({ track }) {
  const [filters, setFilters] = usePersistentState(`practice-ground:design-filters:sql-${track.id}`, DEFAULT_DESIGN_FILTERS);
  const stats = useDesignTrack(track, filters);
  const totalsByCategory = Object.fromEntries(stats.categories.map((c) => [c.category, c]));

  return (
    <Stack gap="section">
      <Stack>
        <p className={styles.intro}>{track.intro}</p>
        <DesignSummary trackShort={track.short} stats={stats} />
        <CategoryOverview trackId={`sql-${track.id}`} categories={stats.categories} />
      </Stack>
      <div>
        <DesignToolbar filters={filters} onChange={setFilters} placeholder={track.searchPlaceholder} />
        <div className={styles.list}>
          <DesignQuestionList
            trackId={`sql-${track.id}`}
            groups={stats.visibleGroups}
            totalsByCategory={totalsByCategory}
            onClearFilters={() => setFilters(DEFAULT_DESIGN_FILTERS)}
          />
        </div>
      </div>
    </Stack>
  );
}
