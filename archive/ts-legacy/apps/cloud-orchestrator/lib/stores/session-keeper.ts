import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SessionKeeperConfig } from '@jules/shared';
import type { DebateResult as OrchestrationDebateResult } from '@jules/shared';

export interface Log {
  id?: string;
  sessionId?: string;
  time: string;
  message: string;
  type: 'info' | 'action' | 'error' | 'skip';
  details?: Record<string, unknown>;
}

export interface DebateOpinion {
  participant: {
    provider: string;
    model: string;
    role?: string;
  };
  content: string;
  error?: string;
}

export interface DebateResult extends OrchestrationDebateResult {
  id: string;
  sessionId: string;
  timestamp: number;
  mode: 'debate' | 'conference';
  opinions: DebateOpinion[];
  finalInstruction: string;
}

export interface StatusSummary {
  monitoringCount: number;
  lastAction: string;
  nextCheckIn: number;
}

export interface SessionState {
  error?: { code: number; message: string; timestamp: number };
  ignoreUntil?: number;
  lastActivitySnippet?: string;
}

export interface SessionKeeperStats {
  totalNudges: number;
  totalApprovals: number;
  totalDebates: number;
}

export interface BorgSignal {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  data?: unknown;
}

interface SessionKeeperState {
  config: SessionKeeperConfig;
  logs: Log[];
  debates: DebateResult[];
  borgSignals: BorgSignal[];
  statusSummary: StatusSummary;
  sessionStates: Record<string, SessionState>;
  queue?: { pending: number; processing: number };
  stats: SessionKeeperStats;
  isLoading: boolean;
  isPausedAll: boolean;
  lastForcedCheckAt: number;
  lastReadLogTime: number;

  // Actions
  loadConfig: () => Promise<void>;
  setConfig: (config: SessionKeeperConfig) => void;
  saveConfig: (config: SessionKeeperConfig) => Promise<void>;

  loadLogs: () => Promise<void>;
  addLog: (message: string, type: Log['type'], details?: Record<string, unknown>, sessionId?: string) => void;
  markLogsAsRead: () => void;
  addDebate: (debate: DebateResult) => void;
  addBorgSignal: (signal: BorgSignal) => void;

  clearLogs: () => void;
  refreshSessionStates: () => void;

  setStatusSummary: (summary: Partial<StatusSummary>) => void;
  updateSessionState: (sessionId: string, state: Partial<SessionState>) => void;
  incrementStat: (stat: keyof SessionKeeperStats) => void;

  setPausedAll: (isPaused: boolean) => void;
}

const DEFAULT_CONFIG: SessionKeeperConfig = {
  isEnabled: false,
  autoSwitch: true,
  checkIntervalSeconds: 30,
  inactivityThresholdMinutes: 1,
  activeWorkThresholdMinutes: 30,
  messages: [
    "Great! Please keep going as you advise!",
    "Yes! Please continue to proceed as you recommend!",
    "This looks correct. Please proceed.",
    "Excellent plan. Go ahead.",
    "Looks good to me. Continue.",
  ],
  smartPilotEnabled: false,
  supervisorProvider: 'openai',
  supervisorApiKey: '',
  supervisorModel: '',
  contextMessageCount: 20,
  debateEnabled: false,
  debateParticipants: [],
};

export const useSessionKeeperStore = create<SessionKeeperState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      logs: [],
      debates: [],
      borgSignals: [],
      statusSummary: { monitoringCount: 0, lastAction: 'None', nextCheckIn: 0 },
      sessionStates: {},
      stats: { totalNudges: 0, totalApprovals: 0, totalDebates: 0 },
      isLoading: false,
      isPausedAll: false,
      lastForcedCheckAt: 0,
      lastReadLogTime: Date.now(),

      loadConfig: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/settings/keeper');
          if (res.ok) {
            const config = await res.json();
            set({ config });

            const statusRes = await fetch('/api/daemon/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              set((state) => ({
                config: { ...state.config, isEnabled: statusData.isEnabled },
                queue: statusData.queue,
                logs: statusData.logs.map((l: { id: string; sessionId?: string; createdAt: string | number | Date; message: string; type: string; metadata?: string }) => ({
                  id: l.id,
                  sessionId: l.sessionId,
                  time: new Date(l.createdAt).toLocaleTimeString(),
                  message: l.message,
                  type: l.type as Log['type'],
                  details: l.metadata ? JSON.parse(l.metadata) : undefined
                }))
              }));
            }
          }
        } catch {
          console.warn('Session Keeper: Backend not reachable. Is the server running?');
        } finally {
          set({ isLoading: false });
        }
      },

      setConfig: (config) => set({ config }),

      saveConfig: async (config) => {
        set({ config, isLoading: true });
        try {
          await fetch('/api/settings/keeper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
          });

          await fetch('/api/daemon/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: config.isEnabled ? 'start' : 'stop' })
          });

        } catch (error) {
          console.error('Failed to save keeper config:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadLogs: async () => {
        try {
          const res = await fetch('/api/daemon/status');
          if (res.ok) {
            const statusData = await res.json();
            const mappedLogs: Log[] = statusData.logs.map((l: { id: string; sessionId?: string; createdAt: string | number | Date; message: string; type: string; metadata?: string }) => ({
              id: l.id,
              sessionId: l.sessionId,
              time: new Date(l.createdAt).toLocaleTimeString(),
              message: l.message,
              type: l.type as Log['type'],
              details: l.metadata ? JSON.parse(l.metadata) : undefined
            }));
            set({ logs: mappedLogs, queue: statusData.queue });
          }
        } catch {
          // Silent fail for logs polling/loading if backend is down
          if (process.env.NODE_ENV === 'development') {
            console.warn('Session Keeper: Failed to load logs (backend offline?)');
          }
        }
      },

      addLog: (message, type, details, sessionId = 'global') => {
        const newLog: Log = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sessionId,
          time: new Date().toLocaleTimeString(),
          message,
          type,
          details
        };

        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, 100)
        }));
      },

      markLogsAsRead: () => set({ lastReadLogTime: Date.now() }),

      addDebate: (debate) => set((state) => ({
        debates: [debate, ...state.debates].slice(0, 50)
      })),

      addBorgSignal: (signal) => set((state) => ({
        borgSignals: [signal, ...state.borgSignals].slice(0, 50)
      })),

      clearLogs: () => set({ logs: [] }),

      refreshSessionStates: () => {
        const { addLog } = get();
        set({ sessionStates: {}, lastForcedCheckAt: Date.now() });
        addLog('Manual refresh: Resetting session states and forcing re-check.', 'info');
      },

      setStatusSummary: (summary) => set((state) => ({
        statusSummary: { ...state.statusSummary, ...summary }
      })),

      updateSessionState: (sessionId, newState) => set((state) => ({
        sessionStates: {
          ...state.sessionStates,
          [sessionId]: {
            ...state.sessionStates[sessionId],
            ...newState
          }
        }
      })),

      incrementStat: (stat) => set((state) => ({
        stats: { ...state.stats, [stat]: state.stats[stat] + 1 }
      })),

      setPausedAll: (isPausedAll) => set({ isPausedAll }),
    }),
    {
      name: 'jules-session-keeper-store',
      storage: createJSONStorage(() => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            // Test if we can actually write to it
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return window.localStorage;
          }
        } catch (_e) {
          console.warn('Session Keeper: localStorage access denied. State will not persist.');
        }
        
        // Fallback: In-memory mock storage
        const mockStore = new Map<string, string>();
        return {
          getItem: (key) => mockStore.get(key) || null,
          setItem: (key, value) => mockStore.set(key, value),
          removeItem: (key) => mockStore.delete(key),
        };
      }),
      partialize: (state) => ({
        stats: state.stats,
        isPausedAll: state.isPausedAll,
        lastForcedCheckAt: state.lastForcedCheckAt,
        debates: state.debates
      }),
      skipHydration: true,
    }
  )
);
