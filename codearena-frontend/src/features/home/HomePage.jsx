import { APP_TAGLINE } from "@/config/app";
import { MODULES } from "@/config/modules";
import { useAccess } from "@/features/access/AccessContext";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { PageIntro } from "@/shared/layout/PageIntro";
import { Stack } from "@/shared/layout/Stack";
import { ModuleCard } from "./components/ModuleCard";
import { useModuleProgress } from "./useModuleProgress";
import styles from "./HomePage.module.css";

export function HomePage() {
  useDocumentTitle(null);
  const { canAccess, paywallEnabled } = useAccess();
  const progress = useModuleProgress();

  return (
    <Stack gap="section">
      <PageIntro eyebrow="Welcome to CodeArena" title="Crack your next interview, one module at a time">
        <p>{APP_TAGLINE} Start with DSA, then system design, then the Node.js and MySQL rounds.</p>
      </PageIntro>
      <div className={styles.grid}>
        {MODULES.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            unlocked={canAccess(module.id)}
            paywallEnabled={paywallEnabled}
            progress={progress[module.id]}
          />
        ))}
      </div>
    </Stack>
  );
}
