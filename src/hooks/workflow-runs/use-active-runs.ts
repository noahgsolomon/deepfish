import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTRPC } from "~/trpc/client";
import { getWorkflowWatcher } from "~/lib/workflow-watcher";

export type QueueItemStatus = "queued" | "running";

export function useUserActiveRuns() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const watcher = getWorkflowWatcher();

  const query = useQuery({
    ...trpc.workflow.getUserActiveRuns.queryOptions(),
    refetchInterval: (data) => {
      // Only poll if there are active runs
      if (data?.state?.data && data.state.data.length > 0) {
        return 2_000; // Poll every 2 seconds
      }
      return 10_000; // Check less frequently when no active runs
    },
  });

  // Sync watcher whenever data changes
  useEffect(() => {
    if (query.data) {
      watcher.syncActiveRuns(query.data, queryClient, trpc);
    }
  }, [query.data, watcher, queryClient, trpc]);

  return query;
}

// Helper hook to get just the count
export function useActiveRunCount() {
  const { data } = useUserActiveRuns();
  return {
    running: data?.filter((item) => item.status === "running").length ?? 0,
    queued: data?.filter((item) => item.status === "queued").length ?? 0,
    total: data?.length ?? 0,
  };
}
