'use client';

import { useState } from "react";
import { DebateDialog } from './debate-dialog';
import { AppHeader } from "./layout/app-header";
import { AppSidebar } from "./layout/app-sidebar";
import { SearchCommandDialog } from "./search-command-dialog";
import type { Session } from '@jules/shared';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentView: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins';
  onViewChange: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins') => void;
  selectedSessionId?: string;
  onSessionSelect: (session: Session | string) => void;
}

export function AppLayout({ 
  children, 
  currentView, 
  onViewChange, 
  selectedSessionId, 
  onSessionSelect 
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Debate State (managed locally in layout for now)
  const [isDebateOpen, setIsDebateOpen] = useState(false);
  const [debateTopic] = useState("");
  const [debateContext] = useState("");

  return (
    <div className="flex h-screen flex-col bg-black max-w-full overflow-hidden">
      <SearchCommandDialog 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen} 
        onNavigate={onViewChange}
      />

      <AppHeader 
        onSearchClick={() => setIsSearchOpen(true)}
        onNewSession={() => {}}
      />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar 
          currentView={currentView}
          onViewChange={onViewChange}
          selectedSessionId={selectedSessionId}
          onSessionSelect={onSessionSelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-hidden relative bg-background">
          {children}
        </main>
      </div>

      {isDebateOpen && (
        <DebateDialog
          open={isDebateOpen}
          onOpenChange={setIsDebateOpen}
          initialTopic={debateTopic}
          initialContext={debateContext}
          onDebateStart={() => {}}
        />
      )}
    </div>
  );
}
