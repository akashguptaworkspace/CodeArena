import { Navigate, useParams } from "react-router";
import { CategoryOverview } from "@/features/system-design/components/CategoryOverview";
import { DesignQuestionList } from "@/features/system-design/components/DesignQuestionList";
import { DesignSummary } from "@/features/system-design/components/DesignSummary";
import { DesignToolbar } from "@/features/system-design/components/DesignToolbar";
import { PracticeGuide } from "@/features/system-design/components/PracticeGuide";
import { DESIGN_TRACKS } from "@/features/system-design/data/systemDesign";
import { useDesignTrack } from "@/features/system-design/hooks/useDesignTrack";
import { DEFAULT_DESIGN_FILTERS } from "@/features/system-design/utils/designFilters";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { PageIntro } from "@/shared/layout/PageIntro";
import { Stack } from "@/shared/layout/Stack";
import { NavTabs } from "@/shared/ui";
import styles from "./SystemDesignPage.module.css";

const TABS = [
  { to: "/system-design/hld", label: `HLD · ${DESIGN_TRACKS.hld.questions.length}` },
  { to: "/system-design/lld", label: `LLD · ${DESIGN_TRACKS.lld.questions.length}` },
  { to: "/system-design/guide", label: "How to practise" },
];

export function SystemDesignPage() {
  const { section } = useParams();
  useDocumentTitle(section === "guide" ? "How to practise system design" : `System Design · ${section === "lld" ? "LLD" : "HLD"}`);
  const isGuide = section === "guide";
  const track = DESIGN_TRACKS[section];

  if (!isGuide && !track) return <Navigate to="/system-design/hld" replace />;

  return (
    <Stack gap="section">
      <PageIntro eyebrow="Tier 2 design rounds" title="System Design">
        <p>
          The 100 questions most often asked in high-level design and machine-coding rounds. Open a question to see
          what to cover and the follow-up interviewers usually add, then move it through the stages as you practise.
        </p>
      </PageIntro>

      <Stack>
        <NavTabs items={TABS} label="System design sections" variant="secondary" />
        {isGuide ? <PracticeGuide /> : <TrackView key={track.id} track={track} />}
      </Stack>
    </Stack>
  );
}

function TrackView({ track }) {
  const [filters, setFilters] = usePersistentState(`practice-ground:design-filters:${track.id}`, DEFAULT_DESIGN_FILTERS);
  const stats = useDesignTrack(track, filters);
  const totalsByCategory = Object.fromEntries(stats.categories.map((c) => [c.category, c]));

  return (
    <Stack gap="section">
      <Stack>
        <p className={styles.intro}>{track.intro}</p>
        <DesignSummary trackShort={track.short} stats={stats} />
        <CategoryOverview trackId={track.id} categories={stats.categories} />
      </Stack>
      <div>
        <DesignToolbar filters={filters} onChange={setFilters} />
        <div className={styles.list}>
          <DesignQuestionList
            trackId={track.id}
            groups={stats.visibleGroups}
            totalsByCategory={totalsByCategory}
            onClearFilters={() => setFilters(DEFAULT_DESIGN_FILTERS)}
          />
        </div>
      </div>
    </Stack>
  );
}
