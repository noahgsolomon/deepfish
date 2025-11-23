import { create } from "zustand";
import type { WorkflowRunWithDetails } from "~/hooks/workflow-runs";

interface ModalStore {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  selectedHistoryItem: WorkflowRunWithDetails | null;
  setSelectedHistoryItem: (item: WorkflowRunWithDetails | null) => void;
  registerWorkflowOpen: boolean;
  setRegisterWorkflowOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  commandPaletteMode: "search" | "recommended";
  setCommandPaletteMode: (mode: "search" | "recommended") => void;
  giftOpen: boolean;
  setGiftOpen: (open: boolean) => void;
  giftsHistoryOpen: boolean;
  setGiftsHistoryOpen: (open: boolean) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  selectedHistoryItem: null,
  setSelectedHistoryItem: (item) => set({ selectedHistoryItem: item }),
  registerWorkflowOpen: false,
  setRegisterWorkflowOpen: (open) => set({ registerWorkflowOpen: open }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  commandPaletteMode: "search",
  setCommandPaletteMode: (mode) => set({ commandPaletteMode: mode }),
  giftOpen: false,
  setGiftOpen: (open) => set({ giftOpen: open }),
  giftsHistoryOpen: false,
  setGiftsHistoryOpen: (open) => set({ giftsHistoryOpen: open }),
}));
