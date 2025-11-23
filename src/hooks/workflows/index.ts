import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { Trpc } from "~/types/query";

/* ---------- Queries ---------- */
export const useAllWorkflows = () => {
  const trpc = useTRPC();
  return useQuery(trpc.workflow.getAllWorkflows.queryOptions({}));
};

export const useWorkflowBySlug = (slug: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.workflow.getWorkflowBySlug.queryOptions({ slug }));
};

export const useWorkflowByTitle = (title: string, enabled: boolean = true) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.workflow.getWorkflowByTitle.queryOptions({ title }),
    enabled: !!title && enabled,
  });
};

export const useExecuteWorkflow = (
  options?: Parameters<
    Trpc["workflow"]["executeWorkflow"]["mutationOptions"]
  >[0],
) => {
  const trpc = useTRPC();
  return useMutation(trpc.workflow.executeWorkflow.mutationOptions(options));
};

export const useInngestRunStatus = (
  eventId: string,
  enabled: boolean = true,
) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.workflow.getInngestRunStatus.queryOptions({ eventId }),
    enabled: !!eventId && enabled,
    refetchInterval: (data) => {
      // Keep polling if status is pending or processing
      if (
        data?.state?.data?.status === "pending" ||
        data?.state?.data?.status === "processing"
      ) {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling
    },
  });
};

/* ---------- Mutations ---------- */

// Add user workflow mutation
export const useAddUserWorkflow = (
  options?: Parameters<
    Trpc["workflow"]["addUserWorkflow"]["mutationOptions"]
  >[0],
) => {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.workflow.addUserWorkflow.mutationOptions(options),
    meta: {
      ...options?.meta,
      invalidate: [
        trpc.workflow.getUserWorkflows.pathKey(),
        trpc.workflow.getAllWorkflows.pathKey(),
      ],
      successToast: {
        title: "Workflow added successfully",
        description: "The workflow has been added to your collection.",
      },
      errorToast: (error: any) => ({
        title: "Failed to add workflow",
        description: error.message || "Please try again later",
      }),
    },
  });
};

// Increment runs mutation
export const useIncrementRuns = (
  options?: Parameters<Trpc["workflow"]["incrementRuns"]["mutationOptions"]>[0],
) => {
  const trpc = useTRPC();

  return useMutation(trpc.workflow.incrementRuns.mutationOptions(options));
};

// Add workflow run mutation
export const useAddRun = (
  options?: Parameters<Trpc["workflow"]["addRun"]["mutationOptions"]>[0],
) => {
  const trpc = useTRPC();
  return useMutation(trpc.workflow.addRun.mutationOptions(options));
};

// Update workflow run mutation
export const useUpdateRun = (
  options?: Parameters<Trpc["workflow"]["updateRun"]["mutationOptions"]>[0],
) => {
  const trpc = useTRPC();
  return useMutation(trpc.workflow.updateRun.mutationOptions(options));
};

// Cancel workflow mutation
export const useCancelWorkflow = (
  options?: Parameters<
    Trpc["workflow"]["cancelWorkflow"]["mutationOptions"]
  >[0],
) => {
  const trpc = useTRPC();
  return useMutation({
    ...trpc.workflow.cancelWorkflow.mutationOptions(options),
    meta: {
      ...options?.meta,
      successToast: {
        title: "Workflow cancelled",
        description: "The workflow has been cancelled successfully.",
      },
      errorToast: (error: any) => ({
        title: "Failed to cancel workflow",
        description: error.message || "Please try again later",
      }),
    },
  });
};

// Check cached run query
export const useCheckCachedRun = (
  workflowId: number,
  inputs: Record<string, any>,
  enabled: boolean = true,
) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.workflow.checkCachedRun.queryOptions({ workflowId, inputs }),
    enabled: enabled && !!workflowId,
  });
};

// Get run status query
export const useRunStatus = (
  runId: number | undefined,
  workflowId: number,
  enabled: boolean = true,
) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.workflow.getRunStatus.queryOptions({ runId, workflowId }),
    enabled: enabled && !!workflowId,
    refetchInterval: (data) => {
      if (
        data.state?.data?.status === "pending" ||
        data?.state?.data?.status === "running"
      ) {
        return 2000;
      }
      return false;
    },
  });
};

// Get user runs (history)
export const useUserRuns = (options?: {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}) => {
  const trpc = useTRPC();
  return useQuery(trpc.workflow.getUserRuns.queryOptions());
};

// Archive run mutation
export const useArchiveRun = (
  options?: Parameters<Trpc["workflow"]["archiveRun"]["mutationOptions"]>[0],
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.workflow.archiveRun.mutationOptions(options),
    meta: {
      ...options?.meta,
      invalidate: [trpc.workflow.getUserRuns.pathKey()],
    },
  });
};

// Archive all runs mutation
export const useArchiveAllRuns = (
  options?: Parameters<
    Trpc["workflow"]["archiveAllRuns"]["mutationOptions"]
  >[0],
) => {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.workflow.archiveAllRuns.mutationOptions(options),
    meta: {
      ...options?.meta,
      invalidate: [trpc.workflow.getUserRuns.pathKey()],
      successToast: {
        title: "All runs archived",
        description: "All workflow runs have been archived successfully.",
      },
    },
  });
};
