import { useMemo } from "react";
import { useWorkflowBySlug } from "./workflows";
import { Workflow } from "~/types";
import { useUserActiveRuns } from "./workflow-runs/use-active-runs";
import { useQueryState } from "nuqs";
import { useWorkflowRun } from "./workflows/use-workflow-run";

export interface WorkflowDisplayState {
  status: "idle" | "processing" | "complete" | "error";
  progress: number;
  outputAssetSrc: string | string[] | null;
  result: {
    type?: string;
    outputPath?: string | string[];
    processingTime?: number;
  } | null;
}

export const useWorkflowDisplayState = (
  slug: string,
): {
  workflow: ReturnType<typeof useWorkflowBySlug>["data"];
  displayState: WorkflowDisplayState;
  isLoading: boolean;
  error: any;
} => {
  const { data: workflow, isLoading, error } = useWorkflowBySlug(slug);

  const { data: activeRuns } = useUserActiveRuns();

  // Get runId from URL
  const [runId] = useQueryState("runId");

  // Fetch run data if runId exists
  // Returns null if runId is invalid, user doesn't own it, or it doesn't exist
  const { data: runData, isLoading: isLoadingRun } = useWorkflowRun(runId);

  // Check if this workflow is currently running in the active runs
  const activeRun = useMemo(() => {
    if (!activeRuns) return null;

    // If we have a runId in URL, match by eventId for precise matching
    if (runId) {
      return activeRuns.find((run) => run.eventId === runId);
    }

    return null;
  }, [activeRuns, runId]);

  const displayState: WorkflowDisplayState = {
    // Priority for status:
    // 1. If we have a runId but data is still loading, optimistically show processing
    // 2. If we have a runId but no data yet (new run), optimistically show processing
    // 3. Active run (if still running - either from URL or current session)
    // 4. Historical run data (if runId present and completed)
    // 5. Workflow defaults
    status:
      runId && (isLoadingRun || (!runData && !activeRun))
        ? "processing" // Optimistic: assume it's processing while loading or if it's a new run
        : activeRun
          ? activeRun.status === "running" || activeRun.status === "queued"
            ? "processing"
            : "idle"
          : runData
            ? runData.status === "complete"
              ? "complete"
              : runData.status === "failed"
                ? "error"
                : "idle"
            : (workflow?.data?.status ?? "idle"),

    // Progress:
    // - If optimistically processing, show initial progress
    // - Otherwise: active run > run data > defaults
    progress:
      runId && (isLoadingRun || (!runData && !activeRun))
        ? 5 // Show small initial progress while loading or for new runs
        : (activeRun?.progress ??
          (runData?.status === "completed" ? 100 : runData?.progress) ??
          workflow?.data.progress ??
          0),

    // Output: run data > defaults (active runs don't have output yet)
    outputAssetSrc:
      runData?.outputAssetSrc ?? workflow?.data.outputAssetSrc ?? null,

    // Result: run data > defaults
    result: runData?.result ?? workflow?.data.result ?? null,
  };

  return {
    workflow,
    displayState,
    isLoading,
    error,
  };
};
