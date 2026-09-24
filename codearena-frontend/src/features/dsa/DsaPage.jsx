import { useRef } from "react";
import { DailyGoalCard } from "@/features/dsa/components/DailyGoalCard";
import { DsaHero } from "@/features/dsa/components/DsaHero";
import { OverallProgress } from "@/features/dsa/components/OverallProgress";
import { ProblemToolbar } from "@/features/dsa/components/ProblemToolbar";
import { TopicList } from "@/features/dsa/components/TopicList";
import { TopicOverview } from "@/features/dsa/components/TopicOverview";
import { useDsaStats } from "@/features/dsa/hooks/useDsaStats";
import { useFilteredTopics } from "@/features/dsa/hooks/useFilteredTopics";
import { DEFAULT_FILTERS } from "@/features/dsa/utils/filters";
import { LinkedInWelcome } from "@/features/share/components/LinkedInWelcome";
import { campaignUrl, dsaShareText } from "@/features/share/share";
import { useReferralSource } from "@/features/share/useReferralSource";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { Stack } from "@/shared/layout/Stack";
import styles from "./DsaPage.module.css";

const SHARE_URL = campaignUrl("/dsa", "dsa200_share");

export function DsaPage() {
  useDocumentTitle("DSA 200");
  const [filters, setFilters] = usePersistentState("practice-ground:filters", DEFAULT_FILTERS);
  const stats = useDsaStats();
  const topics = useFilteredTopics(filters);
  const referral = useReferralSource();
  const listRef = useRef(null);

  const shareText = dsaShareText({ solved: stats.overall.solved, total: stats.overall.total });

  const showCore = () => {
    setFilters({ ...DEFAULT_FILTERS, view: "core" });
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <Stack gap="section">
      {referral === "linkedin" && <LinkedInWelcome onShowCore={showCore} />}

      <DsaHero shareUrl={SHARE_URL} shareText={shareText} />

      <Stack>
        <div className={styles.dashboard}>
          <OverallProgress overall={stats.overall} dailyGoal={stats.today.goal} />
          <DailyGoalCard today={stats.today} streak={stats.streak} activity={stats.activity} />
        </div>
        <TopicOverview />
      </Stack>

      <div ref={listRef} className={styles.listSection}>
        <ProblemToolbar filters={filters} onChange={setFilters} />
        <div className={styles.topics}>
          <TopicList topics={topics} onClearFilters={() => setFilters(DEFAULT_FILTERS)} />
        </div>
      </div>

      <p className={styles.footer}>
        Spend 25–30 minutes on a problem before opening hints. If you needed the solution, flag it and redo it from
        scratch 3–4 days later.
      </p>
    </Stack>
  );
}
