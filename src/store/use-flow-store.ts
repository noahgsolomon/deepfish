import { create } from "zustand";

// Simple store for UI state only - data fetching is handled by React Query hooks
interface FlowUIState {
  /* Map of flowId -> dirty flag (true when there are unsaved edits) */
  dirty: Record<string, boolean>;
  /* Set/clear dirty flag */
  setDirty: (id: string, val: boolean) => void;
  clearDirty: (id: string) => void;
  clearAllDirty: () => void;
}

export const useFlowStore = create<FlowUIState>((set) => ({
  dirty: {},

  setDirty: (id, val) =>
    set((s) => ({
      dirty: { ...s.dirty, [id]: val },
    })),

  clearDirty: (id) =>
    set((s) => {
      const { [id]: _, ...newDirty } = s.dirty;
      return { dirty: newDirty };
    }),

  clearAllDirty: () => set({ dirty: {} }),
}));
