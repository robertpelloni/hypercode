import { TemplatesPage } from "@/components/templates-page";
import { KanbanBoard } from "@/components/kanban-board";
import { SessionBoard } from "@/components/session-board";
import { ActivityFeed } from "@/components/activity-feed";
import { PluginMarketplace } from "@/components/plugins/plugin-marketplace";
import { CodeDiffSidebar } from "@/components/code-diff-sidebar";
import { DebateHistoryList } from "@/components/debate-history-list";
import { SystemLogs } from "@/components/system-logs";
import { SystemHealthDashboard } from "@/components/system-health-dashboard";
import { AuditTrail } from "@/components/audit-trail";
import { SwarmDashboard } from "@/components/swarm-dashboard";
import { Session, Activity, SessionTemplate } from '@jules/shared';

interface MainContentProps {
  view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins';
  selectedSession: Session | null;
  onSessionSelect: (session: Session | string) => void;
  onStartSessionFromTemplate: (template: SessionTemplate) => void;
  onViewChange: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins') => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
  currentActivities: Activity[];
  onRefresh: () => void;
  onStartDebate: (topic?: string, context?: string) => void;
  onSaveTemplate: () => void;
}

export function MainContent({
  view,
  selectedSession,
  onSessionSelect,
  onStartSessionFromTemplate,
  onViewChange,
  showCodeDiffs,
  onToggleCodeDiffs,
  onActivitiesChange,
  currentActivities,
  onRefresh,
  onStartDebate,
  onSaveTemplate,
}: MainContentProps) {
  return (
    <div className="flex h-full w-full flex-row min-w-0">
      <main className="flex-1 overflow-hidden bg-black flex flex-col min-w-0">
        {view === "templates" ? (
          <TemplatesPage 
            onStartSession={onStartSessionFromTemplate}
          />
        ) : view === "kanban" ? (
          <KanbanBoard 
            onSelectSession={onSessionSelect}
          />
        ) : view === "debates" ? (
          <DebateHistoryList 
            onRefresh={onRefresh}
          />
        ) : view === "logs" ? (
          <SystemLogs />
        ) : view === "health" ? (
          <SystemHealthDashboard />
        ) : view === "audit" ? (
          <AuditTrail />
        ) : view === "swarms" ? (
          <SwarmDashboard />
        ) : view === "plugins" ? (
          <PluginMarketplace />
        ) : selectedSession ? (
          <ActivityFeed
            session={selectedSession}
            showCodeDiffs={showCodeDiffs}
            onToggleCodeDiffs={onToggleCodeDiffs}
            onActivitiesChange={onActivitiesChange}
            onStartDebate={onStartDebate}
            onSaveTemplate={onSaveTemplate}
          />
        ) : (
          <SessionBoard 
            onSelectSession={(s) => onSessionSelect(s)}
            onOpenNewSession={() => onViewChange('templates')}
          />
        )}
      </main>

      {showCodeDiffs && selectedSession && (
        <CodeDiffSidebar
          activities={currentActivities}
          onClose={() => onToggleCodeDiffs(false)}
        />
      )}
    </div>
  );
}
