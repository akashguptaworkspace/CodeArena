import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { ModuleGate } from "@/features/access/ModuleGate";
import { HomePage } from "@/features/home/HomePage";
import { LoadingState } from "@/shared/feedback/LoadingState";
import { AppShell } from "./AppShell";

// Each module's pages load on first visit, so the app stays fast as modules are added.
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const DsaPage = page(() => import("@/features/dsa/DsaPage"), "DsaPage");
const SystemDesignPage = page(() => import("@/features/system-design/SystemDesignPage"), "SystemDesignPage");
const QuestionPage = page(() => import("@/features/system-design/QuestionPage"), "QuestionPage");

// One route per module, each wrapped in ModuleGate (Coming soon / paywall / page).
// To add a module: register it in config/modules.js, then add its route here.
export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />

        <Route
          path="dsa"
          element={
            <ModuleGate moduleId="dsa">
              <DsaPage />
            </ModuleGate>
          }
        />

        <Route path="system-design" element={<Navigate to="/system-design/hld" replace />} />
        <Route
          path="system-design/:section"
          element={
            <ModuleGate moduleId="system-design">
              <SystemDesignPage />
            </ModuleGate>
          }
        />

        <Route
          path="system-design/:section/:questionId"
          element={
            <ModuleGate moduleId="system-design">
              <QuestionPage />
            </ModuleGate>
          }
        />

        <Route path="nodejs" element={<ModuleGate moduleId="nodejs" />} />
        <Route path="mysql" element={<ModuleGate moduleId="mysql" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
