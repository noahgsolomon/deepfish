"use client";

import { Button } from "~/components/ui/button";
import { getProgressColor } from "~/lib/utils";
import { usePanelStore } from "~/store/use-panel-store";
import {
  useUserActiveRuns,
  type QueueItemStatus,
} from "~/hooks/workflow-runs/use-active-runs";
import { useCancelWorkflow } from "~/hooks/workflows";
import { X, Link2 } from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { useRouter } from "next/navigation";

export function QueuePanel() {
  const { data: queueItems = [], isLoading } = useUserActiveRuns();
  const cancelWorkflow = useCancelWorkflow();
  const router = useRouter();

  const setQueueOpen = usePanelStore((s) => s.setQueueOpen);
  const queueOpen = usePanelStore((s) => s.queueOpen);

  const getStatusColor = (status: QueueItemStatus) => {
    switch (status) {
      case "running":
        return "text-green-400";
      case "queued":
        return "text-yellow-400";
      default:
        return "text-white";
    }
  };

  const formatElapsedTime = (startTime: Date | string) => {
    const startDate =
      typeof startTime === "string" ? new Date(startTime) : startTime;
    const elapsedMs = Date.now() - startDate.getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatRemainingTime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleCancel = async (dbRunId: number) => {
    try {
      await cancelWorkflow.mutateAsync({ runId: dbRunId });
      toast({
        title: "Workflow cancelled",
        description: "The workflow has been cancelled successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Failed to cancel",
        description: "Could not cancel the workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={`bg-surface-primary border-border-default fixed top-8 bottom-0 left-0 z-40 w-full transform border-r transition-transform duration-300 sm:left-10 sm:w-72 md:left-14 ${
        queueOpen ? "translate-x-0" : "-translate-x-[150%]"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="border-border-default flex items-center justify-between border-b p-3">
          <h2 className="font-mono text-sm font-bold">QUEUE</h2>
          <Button
            onClick={() => setQueueOpen(false)}
            variant="default"
            size="icon"
            className="h-6 w-6"
          >
            <X size={12} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-text-muted flex h-full flex-col items-center justify-center font-mono text-xs">
              <p>LOADING...</p>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="text-text-muted flex h-full flex-col items-center justify-center font-mono text-xs">
              <p>NO ACTIVE JOBS</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {[...queueItems]
                .sort((a, b) => (a.status === "running" ? -1 : 1))
                .map((item) => (
                  <div
                    key={item.id}
                    className="border-border-default bg-surface-secondary border p-2"
                  >
                    <div className="mb-1 flex justify-between">
                      <span className="truncate font-mono text-xs font-bold">
                        {item.workflowName}
                      </span>
                      <span
                        className={`font-mono text-xs ${getStatusColor(
                          item.status as QueueItemStatus,
                        )}`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    {item.inputPrompt && (
                      <div className="text-text-secondary mb-2 line-clamp-2 font-mono text-[9px]">
                        {item.inputPrompt}
                      </div>
                    )}

                    {item.status === "running" && (
                      <div className="bg-surface-elevated border-border-default relative mb-2 h-3 w-full overflow-visible rounded-none border">
                        <div
                          className={`${getProgressColor(
                            item.progress,
                          )} h-full`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    <div className="text-text-muted flex justify-between font-mono text-[9px]">
                      <span>
                        Started: {formatElapsedTime(item.startTime)} ago
                      </span>
                      {item.status === "running" &&
                        item.estimatedTimeRemaining !== undefined && (
                          <span>
                            ETA:{" "}
                            {formatRemainingTime(item.estimatedTimeRemaining)}
                          </span>
                        )}
                    </div>

                    <div className="mt-2 flex justify-end space-x-1">
                      <Button
                        onClick={() => {
                          router.push(
                            `/workflow/${encodeURIComponent(item.workflowName)}?runId=${item.eventId}`,
                          );
                          setQueueOpen(false);
                        }}
                        size={"xs"}
                        className="border border-blue-500/30 bg-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/30"
                      >
                        <Link2 size={10} />
                      </Button>
                      <Button
                        onClick={() => handleCancel(item.dbRunId)}
                        size={"xs"}
                        className="border border-red-500/30 bg-red-500/20 text-xs text-red-400 hover:bg-red-500/30"
                        disabled={cancelWorkflow.isPending}
                      >
                        CANCEL
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="border-border-default border-t p-2">
          <div className="text-text-muted flex justify-between font-mono text-xs">
            <span>
              ACTIVE: {queueItems.filter((i) => i.status === "running").length}
            </span>
            <span>
              QUEUED: {queueItems.filter((i) => i.status === "queued").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
