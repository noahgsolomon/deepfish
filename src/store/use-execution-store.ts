import { create } from "zustand";

interface ExecutionState {
  runningFlows: Record<
    string,
    {
      isRunning: boolean;
      currentStep: string | null;
      startTime: number;
      progress: number;
    }
  >;
  startExecution: (flowId: string) => void;
  completeExecution: (flowId: string) => void;
  updateProgress: (flowId: string, nodeId: string, progress: number) => void;
  isFlowRunning: (flowId: string) => boolean;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  runningFlows: {},

  startExecution: (flowId) =>
    set((s) => ({
      runningFlows: {
        ...s.runningFlows,
        [flowId]: {
          isRunning: true,
          currentStep: null,
          startTime: Date.now(),
          progress: 0,
        },
      },
    })),

  completeExecution: (flowId) =>
    set((s) => {
      const { [flowId]: _, ...rest } = s.runningFlows;
      return { runningFlows: rest };
    }),

  updateProgress: (flowId, nodeId, progress) =>
    set((s) => ({
      runningFlows: {
        ...s.runningFlows,
        [flowId]: {
          ...s.runningFlows[flowId],
          currentStep: nodeId,
          progress,
        },
      },
    })),

  isFlowRunning: (flowId) => get().runningFlows[flowId]?.isRunning,
}));
