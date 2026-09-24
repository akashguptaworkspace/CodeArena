import { MODULES } from "@/config/modules";
import { useAccess } from "@/features/access/AccessContext";

// Nav entries shared by the desktop sidebar and the phone tab bar.
export function useNavItems() {
  const { canAccess } = useAccess();

  return [
    { to: "/", label: "Home", shortLabel: "Home", icon: "home", end: true },
    ...MODULES.map((m) => ({
      to: m.path,
      label: m.title,
      shortLabel: m.shortLabel,
      icon: m.icon,
      locked: m.status === "live" && !canAccess(m.id),
      soon: m.status === "coming-soon",
    })),
  ];
}
