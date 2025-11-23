import { create } from "zustand";

interface StatusBarStore {
  currentPage: string;
  systemStatus: "unknown" | "ready" | "partial" | "not-ready";
  leftText: string;
  leftUrl: string | null;
  rightText: string | null;
  statusText: string | null;
  statusType: "idle" | "processing" | "complete" | "error" | null;
  setCurrentPage: (page: string) => void;
  setSystemStatus: (
    status: "unknown" | "ready" | "partial" | "not-ready",
  ) => void;
  setLeftText: (text: string) => void;
  setLeftUrl: (url: string | null) => void;
  setRightText: (text: string | null) => void;
  setStatusText: (text: string | null) => void;
  setStatusType: (
    type: "idle" | "processing" | "complete" | "error" | null,
  ) => void;
}

export const useStatusBarStore = create<StatusBarStore>((set) => ({
  currentPage: "home",
  systemStatus: "unknown",
  leftText: "",
  leftUrl: null,
  rightText: null,
  statusText: null,
  statusType: null,

  setCurrentPage: (page) => set({ currentPage: page }),
  setSystemStatus: (status) => set({ systemStatus: status }),
  setLeftText: (text) => set({ leftText: text }),
  setLeftUrl: (url) => set({ leftUrl: url }),
  setRightText: (text) => set({ rightText: text }),
  setStatusText: (text) => set({ statusText: text }),
  setStatusType: (type) => set({ statusType: type }),
}));
