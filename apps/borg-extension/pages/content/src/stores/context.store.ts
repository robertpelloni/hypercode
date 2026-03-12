import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ContextItem {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface ContextStore {
  contexts: ContextItem[];
  addContext: (content: string, name?: string) => void;
  updateContext: (id: string, updates: Partial<Omit<ContextItem, 'id' | 'createdAt'>>) => void;
  deleteContext: (id: string) => void;
  getContext: (id: string) => ContextItem | undefined;
  clearContexts: () => void;
}

export const useContextStore = create<ContextStore>()(
  persist(
    (set, get) => ({
      contexts: [],

      addContext: (content: string, name?: string) => set((state) => {
        const id = crypto.randomUUID();
        // Generate a name if not provided (first 20 chars)
        const finalName = name || (content.length > 30 ? content.substring(0, 30) + '...' : content);

        return {
          contexts: [
            {
              id,
              name: finalName,
              content,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...state.contexts,
          ],
        };
      }),

      updateContext: (id, updates) => set((state) => ({
        contexts: state.contexts.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
        ),
      })),

      deleteContext: (id) => set((state) => ({
        contexts: state.contexts.filter((c) => c.id !== id),
      })),

      getContext: (id) => get().contexts.find((c) => c.id === id),

      clearContexts: () => set({ contexts: [] }),
    }),
    {
      name: 'mcp-context',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
