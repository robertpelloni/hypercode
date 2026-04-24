import { useState, useCallback } from "react";
import { JulesProvider } from "@/lib/jules/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/app-layout";
import { MainContent } from "@/components/layout/main-content";
import { useDaemonWebSocket } from "@/lib/hooks/use-daemon-websocket";
import type { Session, Activity } from "@jules/shared";

// Sub-component to ensure hooks are called inside JulesProvider
function AppContent() {
  // Global WebSocket Connection
  useDaemonWebSocket();

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins'>('sessions');
  const [showCodeDiffs, setShowCodeDiffs] = useState(false);
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([]);

  const handleSessionSelect = useCallback((session: Session | string) => {
    if (typeof session === 'string') {
      console.log("Selected session ID:", session);
    } else {
      setSelectedSession(session);
      setView('sessions');
    }
  }, []);

  return (
    <AppLayout
      currentView={view}
      onViewChange={setView}
      selectedSessionId={selectedSession?.id}
      onSessionSelect={handleSessionSelect}
    >
      <MainContent 
        view={view}
        selectedSession={selectedSession}
        onSessionSelect={handleSessionSelect}
        showCodeDiffs={showCodeDiffs}
        onToggleCodeDiffs={setShowCodeDiffs}
        onActivitiesChange={setCurrentActivities}
        currentActivities={currentActivities}
        onStartSessionFromTemplate={() => {}}
        onViewChange={setView}
        onRefresh={() => {}}
        onStartDebate={() => {}}
        onSaveTemplate={() => {}}
      />
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <JulesProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster position="bottom-right" theme="dark" className="font-mono text-xs uppercase" />
        </TooltipProvider>
      </JulesProvider>
    </ThemeProvider>
  );
}

export default App;
