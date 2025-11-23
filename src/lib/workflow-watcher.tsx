import type { QueryClient } from "@tanstack/react-query";
import type { useTRPC } from "~/trpc/client";
import { RouterOutputs } from "~/types";

interface WatcherEntry {
  controller: AbortController;
  watchId: symbol;
}

class WorkflowWatcher {
  private watchers = new Map<string, WatcherEntry>();
  private previousServerRunIds = new Set<string>();

  cancel(eventId: string): void {
    const entry = this.watchers.get(eventId);
    if (entry) {
      entry.controller.abort();
      this.watchers.delete(eventId);
    }
  }

  cancelAll(): void {
    for (const entry of this.watchers.values()) {
      entry.controller.abort();
    }
    this.watchers.clear();
  }

  isWatching(eventId: string): boolean {
    return this.watchers.has(eventId);
  }

  async syncActiveRuns(
    serverRuns: RouterOutputs["workflow"]["getUserActiveRuns"],
    queryClient: QueryClient,
    trpc: ReturnType<typeof useTRPC>,
  ): Promise<void> {
    const currentServerRunIds = new Set(serverRuns.map((r) => r.eventId));

    let shouldInvalidate = false;
    const runsToInvalidate = new Set<string>();

    // Check if any runs that were previously active are now gone (completed)
    for (const previousRunId of this.previousServerRunIds) {
      if (!currentServerRunIds.has(previousRunId)) {
        shouldInvalidate = true;
        runsToInvalidate.add(previousRunId);
      }
    }

    // Also clean up watchers for completed runs
    for (const [eventId] of this.watchers) {
      if (!serverRuns.find((run) => run.eventId === eventId)) {
        this.cancel(eventId);
        shouldInvalidate = true;
        runsToInvalidate.add(eventId);
      }
    }

    // If any runs were completed, invalidate the workflow runs query
    if (shouldInvalidate) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.workflow.getUserRuns.queryKey(),
        }),
        Array.from(runsToInvalidate).map((eventId) =>
          queryClient.refetchQueries({
            queryKey: trpc.workflow.getRunByEventId.queryKey({ eventId }),
          }),
        ),
      ]);
    }
    // Update the previous runs set for next comparison
    this.previousServerRunIds = currentServerRunIds;
  }
}

// Singleton instance
let instance: WorkflowWatcher | null = null;

export function getWorkflowWatcher(): WorkflowWatcher {
  if (!instance) {
    instance = new WorkflowWatcher();
  }
  return instance;
}
