import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";

/**
 * Hook to fetch workflow run data based on eventId
 * Used for restoring state from URL parameters
 */
export function useWorkflowRun(runId: string | null) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.workflow.getRunByEventId.queryOptions({
      eventId: runId!,
    }),
    enabled: !!runId,
  });
}
