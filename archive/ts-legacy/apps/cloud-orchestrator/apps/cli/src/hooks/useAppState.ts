import { create } from 'zustand';
import type { KeeperLog } from '@jules/shared';

interface Session {
  id: string;
  sourceId: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'awaiting_approval';
  rawState?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

type LogEntry = KeeperLog;

interface DaemonStatus {
  isEnabled: boolean;
  lastCheck?: string;
  logs: LogEntry[];
}

interface AppState {
  isConnected: boolean;
  error: string | null;
  daemonStatus: DaemonStatus | null;
  sessions: Session[];
  selectedSession: Session | null;
  logs: LogEntry[];
  
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshStatus: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  startDaemon: () => Promise<void>;
  stopDaemon: () => Promise<void>;
  interruptAllSessions: () => Promise<void>;
  continueAllSessions: () => Promise<void>;
  setError: (error: string | null) => void;
}

const API_BASE = process.env.JULES_API_URL || 'http://localhost:8080';

export const useAppStore = create<AppState>((set, get) => ({
  isConnected: false,
  error: null,
  daemonStatus: null,
  sessions: [],
  selectedSession: null,
  logs: [],

  connect: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/status`);
      if (!response.ok) throw new Error('Failed to connect to daemon');
      
      const status = await response.json();
      set({ 
        isConnected: true, 
        error: null,
        daemonStatus: status,
        logs: status.logs || []
      });
      
      get().refreshSessions();
    } catch (error) {
      set({ 
        isConnected: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  },

  disconnect: () => {
    set({ isConnected: false, daemonStatus: null });
  },

  refreshStatus: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/status`);
      if (!response.ok) throw new Error('Failed to refresh status');
      
      const status = await response.json();
      set({ 
        daemonStatus: status,
        logs: status.logs || [],
        error: null
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Refresh failed' });
    }
  },

  refreshSessions: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/status`);
      if (!response.ok) throw new Error('Failed to refresh sessions');
      
      const status = await response.json();
      set({ 
        daemonStatus: status,
        logs: status.logs || []
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Session refresh failed' });
    }
  },

  startDaemon: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to start daemon');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Start failed' });
    }
  },

  stopDaemon: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to stop daemon');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Stop failed' });
    }
  },

  interruptAllSessions: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/interrupt-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to interrupt sessions');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Interrupt failed' });
    }
  },

  continueAllSessions: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/continue-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to continue sessions');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Continue failed' });
    }
  },

  setError: (error: string | null) => set({ error })
}));
