import { create } from "zustand";

export interface EphemeralWorkflowState {
  status?: "idle" | "processing" | "complete" | "error";
  progress?: number;
  logs?: string[];
  outputAssetSrc?: string | string[] | null;
  result?: {
    type?: string;
    outputPath?: string | string[];
    processingTime?: number;
  } | null;
}

export interface EphemeralWorkflowStore {
  // Map workflow ID to ephemeral state
  workflows: Record<number, EphemeralWorkflowState>;

  // State management methods
  setStatus: (
    workflowId: number,
    status: "idle" | "processing" | "complete" | "error",
  ) => void;
  updateProgress: (workflowId: number, progress: number) => void;
  setOutputAsset: (
    workflowId: number,
    outputAssetSrc: string | string[] | null,
  ) => void;
  setResult: (
    workflowId: number,
    result: EphemeralWorkflowState["result"],
  ) => void;
  clearState: (workflowId: number) => void;
  resetToIdle: (workflowId: number) => void;

  // Helper to get workflow state
  getWorkflowState: (workflowId: number) => EphemeralWorkflowState;
}

export const useEphemeralWorkflowStore = create<EphemeralWorkflowStore>(
  (set, get) => ({
    workflows: {},

    setStatus: (
      workflowId: number,
      status: "idle" | "processing" | "complete" | "error",
    ) => {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...state.workflows[workflowId],
            status,
          },
        },
      }));
    },

    updateProgress: (workflowId: number, progress: number) => {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...state.workflows[workflowId],
            progress,
          },
        },
      }));
    },

    setOutputAsset: (
      workflowId: number,
      outputAssetSrc: string | string[] | null,
    ) => {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...state.workflows[workflowId],
            outputAssetSrc,
          },
        },
      }));
    },

    setResult: (
      workflowId: number,
      result: EphemeralWorkflowState["result"],
    ) => {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...state.workflows[workflowId],
            result,
          },
        },
      }));
    },

    clearState: (workflowId: number) => {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [workflowId]: {
            status: "idle",
            progress: 0,
            logs: [],
            outputAssetSrc: null,
            result: null,
          },
        },
      }));
    },

    resetToIdle: (workflowId: number) => {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...state.workflows[workflowId],
            status: "idle",
            progress: 0,
          },
        },
      }));
    },

    getWorkflowState: (workflowId: number) => {
      return get().workflows[workflowId] || {};
    },
  }),
);
