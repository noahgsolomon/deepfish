"use client";

import { downloadFile, formatDate } from "~/lib/utils";
import { useModalStore } from "~/store/use-modal-store";
import {
  getOutputData,
  getOutputType,
  getDisplayName,
  getInputPrompt,
} from "~/hooks/workflow-runs";
import OutputPreview, { getOutputInfo } from "../panels/helpers/output-preview";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "~/hooks/use-toast";

export default function HistoryDetailsModal() {
  const selectedHistoryItem = useModalStore((s) => s.selectedHistoryItem);
  const setSelectedHistoryItem = useModalStore((s) => s.setSelectedHistoryItem);

  if (!selectedHistoryItem) return null;

  // Convert WorkflowRunWithDetails to the format OutputPreview expects
  const previewItem = {
    id: String(selectedHistoryItem.id as number),
    workflowName: getDisplayName(selectedHistoryItem),
    outputData: getOutputData(selectedHistoryItem),
    outputType: getOutputType(selectedHistoryItem.output),
    createdAt: selectedHistoryItem.completedAt || selectedHistoryItem.ranAt,
    inputPrompt: getInputPrompt(selectedHistoryItem),
    metadata: {
      workflowSettings: selectedHistoryItem.inputs ?? {},
      processingTime: selectedHistoryItem.output?.processingTime,
      type: getOutputType(selectedHistoryItem.output),
    },
  };

  return (
    <Dialog
      open={!!selectedHistoryItem}
      onOpenChange={(open) => !open && setSelectedHistoryItem(null)}
    >
      <DialogContent className="bg-surface-primary border-border-default text-white">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">
            GENERATION DETAILS
          </DialogTitle>
        </DialogHeader>

        {selectedHistoryItem && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-surface-secondary border-border-default border p-2">
              <div className="bg-surface-primary aspect-square w-full">
                <OutputPreview item={previewItem} />
              </div>

              <div className="mt-2 text-xs">
                {previewItem.outputType === "text" ? (
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        getOutputData(selectedHistoryItem),
                      );
                      toast({
                        title: "Copied to clipboard",
                        description: "Text copied to clipboard",
                      });
                    }}
                    className="h-7 w-full border border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-400 hover:bg-blue-500/20"
                  >
                    COPY TEXT
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      downloadFile(getOutputData(selectedHistoryItem))
                    }
                    className="h-7 w-full border border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-400 hover:bg-blue-500/20"
                  >
                    DOWNLOAD {previewItem.outputType?.toUpperCase() || "IMAGE"}
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden space-y-4 sm:block">
              <div>
                <h3 className="text-text-secondary mb-1 font-mono text-xs">
                  WORKFLOW
                </h3>
                <p className="text-sm font-bold">
                  {getDisplayName(selectedHistoryItem)}
                </p>
              </div>

              <div>
                <h3 className="text-text-secondary mb-1 font-mono text-xs">
                  CREATED
                </h3>
                <p className="text-sm">
                  {formatDate(
                    selectedHistoryItem.completedAt ||
                      selectedHistoryItem.ranAt,
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-text-secondary mb-1 font-mono text-xs">
                  OUTPUT TYPE
                </h3>
                <p className="text-sm uppercase">
                  {previewItem.outputType || "IMAGE"}
                </p>
              </div>

              {selectedHistoryItem.inputs && (
                <div>
                  <h3 className="text-text-secondary mb-1 font-mono text-xs">
                    SETTINGS
                  </h3>
                  <div className="bg-surface-secondary border-border-default max-h-32 overflow-y-auto border p-2 text-sm">
                    {Object.entries(selectedHistoryItem.inputs).map(
                      ([key, value]) => (
                        <div key={key} className="mb-2">
                          <div className="text-text-secondary mb-0.5 font-mono text-xs">
                            {key}:
                          </div>
                          <div className="overflow-wrap-anywhere text-text-emphasis pl-2 text-xs break-all">
                            {typeof value === "string" && value.length > 300
                              ? `${value.substring(0, 300)}...`
                              : String(value)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {selectedHistoryItem.output?.processingTime !== undefined && (
                <div>
                  <h3 className="text-text-secondary mb-1 font-mono text-xs">
                    PROCESSING TIME
                  </h3>
                  <p className="text-sm">
                    {Math.round(
                      selectedHistoryItem.output.processingTime / 1000,
                    )}{" "}
                    seconds
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
