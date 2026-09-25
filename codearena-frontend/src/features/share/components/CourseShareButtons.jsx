import { getModule } from "@/config/modules";
import { campaignUrl } from "../share";
import { ShareButtons } from "./ShareButtons";

/**
 * LinkedIn + native share buttons for a module's landing page. The shared URL is the module's own
 * path, so LinkedIn shows that module's preview card (title, description and image come from
 * `share` in config/modules.js, written into dist/<module>/index.html at build time).
 */
export function CourseShareButtons({ moduleId }) {
  const module = getModule(moduleId);
  if (!module?.share) return null;
  return (
    <ShareButtons
      url={campaignUrl(module.path, `${module.id}_share`)}
      title={module.title}
      text={module.share.text}
    />
  );
}
