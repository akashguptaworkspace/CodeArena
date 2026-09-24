import { BrowserRouter } from "react-router";
import { AccessProvider } from "@/features/access/AccessContext";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { SignInDialog } from "@/features/auth/SignInDialog";
import { PresenceProvider } from "@/features/presence/PresenceContext";
import { ProgressProvider } from "@/features/progress/ProgressContext";
import { LoadingState } from "@/shared/feedback/LoadingState";
import { AppRoutes } from "./routes";

// Provider order: who is signed in → what they can open → their saved progress.
// Signed-out visitors are guests: the whole app is open to them, and SignInDialog asks them
// to sign in only when they try to save something.
function AuthGate() {
  const { status } = useAuth();

  if (status === "checking") return <LoadingState message="Checking your session…" />;

  return (
    <AccessProvider>
      <ProgressProvider>
        <PresenceProvider>
          <AppRoutes />
          <SignInDialog />
        </PresenceProvider>
      </ProgressProvider>
    </AccessProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  );
}
