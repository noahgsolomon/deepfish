import { create } from "zustand";

interface PanelState {
  queueOpen: boolean;
  installPanelOpen: boolean;
  historyPanelOpen: boolean;
  flowPanelOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  setInstallPanelOpen: (open: boolean) => void;
  setHistoryPanelOpen: (open: boolean) => void;
  setFlowPanelOpen: (open: boolean) => void;
  toggleQueueOpen: () => void;
  toggleInstallPanelOpen: () => void;
  toggleHistoryPanelOpen: () => void;
  toggleFlowPanelOpen: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  queueOpen: false,
  installPanelOpen: false,
  historyPanelOpen: false,
  flowPanelOpen: false,
  setQueueOpen: (open: boolean) =>
    set(() => ({
      queueOpen: open,
      installPanelOpen: false,
      historyPanelOpen: false,
      flowPanelOpen: false,
    })),
  setInstallPanelOpen: (open: boolean) =>
    set(() => ({
      installPanelOpen: open,
      queueOpen: false,
      historyPanelOpen: false,
      flowPanelOpen: false,
    })),
  setHistoryPanelOpen: (open: boolean) =>
    set(() => ({
      historyPanelOpen: open,
      queueOpen: false,
      installPanelOpen: false,
      flowPanelOpen: false,
    })),
  setFlowPanelOpen: (open: boolean) =>
    set(() => ({
      flowPanelOpen: open,
      queueOpen: false,
      installPanelOpen: false,
      historyPanelOpen: false,
    })),
  toggleQueueOpen: () =>
    set((state) => ({
      queueOpen: !state.queueOpen,
      installPanelOpen: false,
      historyPanelOpen: false,
      flowPanelOpen: false,
    })),
  toggleInstallPanelOpen: () =>
    set((state) => ({
      installPanelOpen: !state.installPanelOpen,
      queueOpen: false,
      historyPanelOpen: false,
      flowPanelOpen: false,
    })),
  toggleHistoryPanelOpen: () =>
    set((state) => ({
      historyPanelOpen: !state.historyPanelOpen,
      queueOpen: false,
      installPanelOpen: false,
      flowPanelOpen: false,
    })),
  toggleFlowPanelOpen: () =>
    set((state) => ({
      flowPanelOpen: !state.flowPanelOpen,
      queueOpen: false,
      installPanelOpen: false,
      historyPanelOpen: false,
    })),
}));
