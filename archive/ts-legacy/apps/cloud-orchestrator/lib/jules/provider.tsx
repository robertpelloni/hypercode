"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { JulesClient } from './client';
import { safeLocalStorage } from '@/lib/utils';

interface JulesContextType {
  client: JulesClient | null;
  isLoading: boolean;
  refresh: () => void;
  triggerRefresh: () => void;
  refreshTrigger: number;
}

const JulesContext = createContext<JulesContextType | undefined>(undefined);

export function JulesProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<JulesClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initialized = useRef(false);

  const initClient = useCallback(() => {
    try {
      const localJulesKey = typeof window !== 'undefined' ? safeLocalStorage.getItem('jules_api_key') : null;
      
      console.log(`[JulesProvider] Initializing client (API Key: ${!!localJulesKey})`);
      
      const newClient = new JulesClient(
        localJulesKey || undefined
      );
      
      setClient(newClient);
      console.log("[JulesProvider] Client initialized and set in state.");
    } catch (e) {
      console.error("[JulesProvider] Failed to initialize client:", e);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initClient();

    // Listen for storage changes (other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jules_api_key') {
        initClient();
      }
    };

    // Listen for custom settings changes (this tab)
    const handleSettingsChange = () => {
      initClient();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('jules-api-key-updated', handleSettingsChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('jules-api-key-updated', handleSettingsChange);
    };
  }, [initClient]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    initClient();
  }, [initClient]);

  return (
    <JulesContext.Provider value={{ 
      client, 
      isLoading, 
      refresh, 
      triggerRefresh: refresh, 
      refreshTrigger 
    }}>
      {isLoading ? (
        <div className="h-screen w-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Initialising Core...</p>
          </div>
        </div>
      ) : children}
    </JulesContext.Provider>
  );
}

export function useJules() {
  const context = useContext(JulesContext);
  if (context === undefined) {
    throw new Error("useJules must be used within a JulesProvider");
  }
  return context;
}
