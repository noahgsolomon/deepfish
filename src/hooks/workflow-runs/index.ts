import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import type { Trpc } from "~/types/query";

// Types
export type OutputType = "image" | "video" | "text" | "3d" | "audio";

export interface WorkflowRunWithDetails {
  id: number;
  userId: number;
  workflowId: number;
  provider: string;
  inputs: Record<string, any> | null;
  output: any;
  status: string;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  ranAt: Date;
  archived: boolean;
  displayName: string | null;
  thumbnailUrl: string | null;
  workflowTitle: string;
  workflowData: any;
}

// Helper to extract output type from the run output
export function getOutputType(output: any): OutputType {
  if (!output) return "image";

  // Check if output has explicit type field
  if (output.type) {
    return output.type as OutputType;
  }

  // Check output path for file extension
  const outputPath = output.outputPath || output.output;
  if (typeof outputPath === "string") {
    if (outputPath.includes(".mp4") || outputPath.includes(".webm"))
      return "video";
    if (outputPath.includes(".mp3") || outputPath.includes(".wav"))
      return "audio";
    if (outputPath.includes(".glb") || outputPath.includes(".gltf"))
      return "3d";
    if (outputPath.includes(".txt")) return "text";
  }

  return "image";
}

// Helper to get output URL/data
export function getOutputData(run: WorkflowRunWithDetails): string {
  if (!run.output) return "";

  // Handle different output structures
  if (run.output.outputPath) {
    return Array.isArray(run.output.outputPath)
      ? run.output.outputPath[0]
      : run.output.outputPath;
  }

  if (run.output.output) {
    return Array.isArray(run.output.output)
      ? run.output.output[0]
      : run.output.output;
  }

  if (typeof run.output === "string") {
    return run.output;
  }

  return "";
}

// Helper to get display name
export function getDisplayName(run: WorkflowRunWithDetails): string {
  return run.displayName || run.workflowTitle || "Unknown Workflow";
}

// Helper to get input prompt
export function getInputPrompt(run: WorkflowRunWithDetails): string {
  if (!run.inputs) return "";

  // Common prompt field names
  const promptFields = ["prompt", "input", "text", "message", "query"];
  for (const field of promptFields) {
    if (run.inputs[field]) {
      return String(run.inputs[field]);
    }
  }

  // Return first string value as fallback
  const firstString = Object.values(run.inputs).find(
    (v) => typeof v === "string",
  );
  return firstString ? firstString : "";
}

/* ---------- Queries ---------- */

// Get user's workflow runs (history)
export function useWorkflowRuns(options?: { includeArchived?: boolean }) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.workflow.getUserRuns.queryOptions(),
    select: (data) => {
      // Transform runs into history items
      return data.map((run) => ({
        ...run,
        outputType: getOutputType(run.output),
        outputData: getOutputData(run as WorkflowRunWithDetails),
        displayName: getDisplayName(run as WorkflowRunWithDetails),
        inputPrompt: getInputPrompt(run as WorkflowRunWithDetails),
      }));
    },
  });
}

/* ---------- Mutations ---------- */

// Archive a single run (soft delete)
export function useArchiveRun(
  options?: Parameters<Trpc["workflow"]["archiveRun"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.workflow.archiveRun.mutationOptions(options),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: trpc.workflow.getUserRuns.queryKey(),
      });

      // Get the exact query key with parameters matching useWorkflowRuns defaults
      const queryKey = trpc.workflow.getUserRuns.queryKey();

      // Get the previous data
      const previousRuns = queryClient.getQueryData(queryKey);

      // Optimistically update by filtering out the archived run
      if (previousRuns) {
        queryClient.setQueryData(
          queryKey,
          previousRuns.filter((run: any) => run.id !== variables.runId),
        );
      }

      return { previousRuns, queryKey };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.queryKey && context?.previousRuns) {
        queryClient.setQueryData(context.queryKey, context.previousRuns);
      }
    },
    meta: {
      invalidate: [trpc.workflow.getUserRuns.queryKey()],
      prefetch: [trpc.workflow.getUserRuns.queryKey()],
    },
  });
}

// Archive all runs (clear history)
export function useArchiveAllRuns(
  options?: Parameters<
    Trpc["workflow"]["archiveAllRuns"]["mutationOptions"]
  >[0],
) {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.workflow.archiveAllRuns.mutationOptions(options),
    meta: {
      invalidate: [trpc.workflow.getUserRuns.queryKey()],
      prefetch: [trpc.workflow.getUserRuns.queryKey()],
    },
  });
}
