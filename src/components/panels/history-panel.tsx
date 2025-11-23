"use client";

import { Button } from "~/components/ui/button";
import { formatRelativeTime } from "~/lib/utils";
import {
  useWorkflowRuns,
  useArchiveRun,
  useArchiveAllRuns,
  getOutputType,
  getOutputData,
  getDisplayName,
  getInputPrompt,
} from "~/hooks/workflow-runs";
import { useModalStore } from "~/store/use-modal-store";
import { usePanelStore } from "~/store/use-panel-store";
import { Clock, Info, Trash2, X, Link2 } from "lucide-react";
import HistoryDetailsModal from "../modals/history-details-modal";
import OutputPreview from "./helpers/output-preview";
import { useRouter } from "next/navigation";

export function HistoryPanel() {
  const { data: runs, isLoading } = useWorkflowRuns();
  const { mutate: archiveRun } = useArchiveRun();
  const { mutate: archiveAllRuns } = useArchiveAllRuns();
  const historyPanelOpen = usePanelStore((s) => s.historyPanelOpen);
  const setHistoryPanelOpen = usePanelStore((s) => s.setHistoryPanelOpen);
  const setSelectedHistoryItem = useModalStore((s) => s.setSelectedHistoryItem);
  const router = useRouter();

  return (
    <>
      <div
        className={`bg-surface-primary border-border-default fixed top-8 bottom-0 left-0 z-40 w-full transform border-r transition-transform duration-300 sm:left-10 sm:w-80 md:left-14 ${
          historyPanelOpen ? "translate-x-0" : "-translate-x-[150%]"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-border-default flex items-center justify-between border-b p-3">
            <div className="flex items-center space-x-2">
              <h2 className="font-mono text-sm font-bold">
                GENERATION HISTORY
              </h2>
            </div>
            <Button
              onClick={() => setHistoryPanelOpen(false)}
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
            ) : !runs || runs.length === 0 ? (
              <div className="text-text-muted flex h-full flex-col items-center justify-center font-mono text-xs">
                <p>NO GENERATION HISTORY</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="border-border-default bg-surface-secondary border p-2"
                  >
                    <div
                      className="bg-surface-primary relative mb-2 h-40 w-full cursor-pointer"
                      onClick={() => setSelectedHistoryItem(run)}
                    >
                      <OutputPreview
                        item={{
                          id: String(run.id),
                          workflowName: getDisplayName(run),
                          outputData: getOutputData(run),
                          outputType: getOutputType(run.output),
                          createdAt: run.completedAt || run.ranAt,
                          inputPrompt: getInputPrompt(run),
                          metadata: {
                            workflowSettings: run.inputs ?? {},
                            processingTime: run.output?.processingTime,
                            type: getOutputType(run.output),
                          },
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                        <Info size={24} className="text-white" />
                      </div>
                    </div>

                    <div className="mb-1 flex justify-between">
                      <span className="truncate font-mono text-xs font-bold">
                        {getDisplayName(run)}
                      </span>
                    </div>

                    <div className="text-text-secondary mb-2 line-clamp-2 font-mono text-[9px]">
                      {getInputPrompt(run)}
                    </div>

                    <div className="text-text-muted mb-1 flex items-center font-mono text-[9px]">
                      <Clock size={8} className="mr-1" />
                      <span>
                        {formatRelativeTime(run.completedAt || run.ranAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-end space-x-1">
                      <Button
                        onClick={() => {
                          const workflowName = getDisplayName(run);
                          router.push(
                            `/workflow/${encodeURIComponent(workflowName)}?runId=${run.eventId}`,
                          );
                          setHistoryPanelOpen(false);
                        }}
                        className="h-5 border-blue-500/30 bg-blue-500/10 px-1 text-[9px] text-blue-400 hover:bg-blue-500/20"
                      >
                        <Link2 size={10} />
                      </Button>
                      <Button
                        onClick={() => setSelectedHistoryItem(run)}
                        className="h-5 border-blue-500/30 bg-blue-500/10 px-1.5 text-[9px] text-blue-400 hover:bg-blue-500/20"
                      >
                        DETAILS
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-5 border border-red-500/30 bg-red-500/10 px-1 text-[10px] text-red-400 hover:bg-red-500/20"
                        onClick={() => archiveRun({ runId: run.id })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => archiveAllRuns()}
                    className="h-6 border-red-500/30 bg-red-500/10 px-2 text-[9px] text-red-400 hover:bg-red-500/20"
                  >
                    CLEAR HISTORY
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-border-default border-t p-2">
            <div className="text-text-muted flex justify-center font-mono text-xs">
              <span>TOTAL: {runs?.length ?? 0} GENERATIONS</span>
            </div>
          </div>
        </div>
        <HistoryDetailsModal />
      </div>
    </>
  );
}
