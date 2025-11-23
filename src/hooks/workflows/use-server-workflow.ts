import { useRef, useState } from "react";
import { useTRPC } from "~/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkflowWatcher } from "~/lib/workflow-watcher";
import { useUserActiveRuns } from "../workflow-runs/use-active-runs";
import { useQueryState } from "nuqs";
import { useUser } from "../auth";

export interface UseServerWorkflowOptions {
  workflowId: number;
}

export function useServerWorkflow({ workflowId }: UseServerWorkflowOptions) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const trpc = useTRPC();
  const watcher = useRef(getWorkflowWatcher());
  const { refetch: refetchActiveRuns } = useUserActiveRuns();
  const { refetch: refetchUser } = useUser();

  // URL state for the run ID (using eventId as the identifier)
  const [_, setUrlRunId] = useQueryState("runId");

  const { mutate: executeWorkflowMutation } = useMutation({
    ...trpc.workflow.executeWorkflow.mutationOptions(),
    onSuccess: async (data) => {
      // Set the eventId in the URL immediately
      await setUrlRunId(data.eventId);

      refetchActiveRuns();

      refetchUser();

      // Store event ID for cancellation
      setEventId(data.eventId);

      // Clear local state after completion (URL state persists)
      setEventId(null);
      setRunId(null);
    },
    meta: {
      invalidate: [trpc.workflow.getUserActiveRuns.queryKey()],
      successToast: "Workflow request sent!",
      errorToast: (error) => {
        return `Error executing workflow: ${(error as Error).message}`;
      },
    },
  });

  const cancelWorkflowMutation = useMutation({
    ...trpc.workflow.cancelWorkflow.mutationOptions(),
    onSuccess: () => {
      console.log("Workflow cancelled in database");
    },
    onError: (error: any) => {
      console.error("Error cancelling database run:", error);
    },
  });

  const execute = async (inputs: Record<string, any>) => {
    // No longer setting status/progress - will be derived from active runs
    // Execute the workflow - queue tracking now handled by Inngest status
    executeWorkflowMutation({
      workflowId,
      inputs,
    });
  };

  const cancel = async () => {
    // Clear the URL runId when cancelling
    await setUrlRunId(null);

    // Cancel the watcher if watching
    if (eventId) {
      watcher.current.cancel(eventId);
      setEventId(null);
    }

    // Cancel database run if exists
    if (runId) {
      await cancelWorkflowMutation.mutateAsync({ runId });
    }

    setRunId(null);
  };

  return {
    execute,
    cancel,
    runId,
  };
}
