import { getModule } from "@/config/modules";
import { useAccess } from "./AccessContext";
import { ComingSoon } from "./components/ComingSoon";
import { Paywall } from "./components/Paywall";

// Wrap a module's page: shows Coming soon, the paywall, or the page itself.
export function ModuleGate({ moduleId, children }) {
  const { canAccess } = useAccess();
  const module = getModule(moduleId);

  if (!module) throw new Error(`Unknown module "${moduleId}". Add it to config/modules.js.`);
  if (module.status === "coming-soon") return <ComingSoon module={module} />;
  if (!canAccess(moduleId)) return <Paywall module={module} />;
  return children;
}
