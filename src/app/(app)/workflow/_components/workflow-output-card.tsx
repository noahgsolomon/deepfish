import { TerminalHistory } from "~/components/icons/terminal-history";
import { getProgressColor } from "~/lib/utils";
import WorkflowOutput from "./workflow-output";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { useWorkflowDisplayState } from "~/hooks/use-workflow-display-state";

export default function WorkflowOutputCard({ slug }: { slug: string }) {
  const { workflow, displayState } = useWorkflowDisplayState(slug);

  console.log("DISPLAY STATE:", displayState);

  const status = displayState.status;
  const outputAssetSrc = displayState.outputAssetSrc;
  const result = displayState.result;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Check if the output is an array of images
  const isMultipleImages = Array.isArray(outputAssetSrc);

  // Get the current image to display
  const currentImage = isMultipleImages
    ? outputAssetSrc?.[currentImageIndex]
    : outputAssetSrc;

  // If we have output but only history errors, treat as complete for display purposes
  const displayStatus = status;

  // Handle navigation between multiple images
  const goToPreviousImage = () => {
    if (!isMultipleImages || !outputAssetSrc) return;
    const newIndex =
      currentImageIndex === 0
        ? outputAssetSrc.length - 1
        : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
  };

  const goToNextImage = () => {
    if (!isMultipleImages || !outputAssetSrc) return;
    const newIndex =
      currentImageIndex === outputAssetSrc.length - 1
        ? 0
        : currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
  };

  // Create a compatible result object for WorkflowOutput
  const safeResult = result
    ? {
        type: result.type,
        outputPath: result.outputPath,
        processingTime: result.processingTime,
      }
    : null;

  // Helper: when we have a completed result, dump a copy-paste JSON snippet to console
  useEffect(() => {
    if (displayStatus === "complete" && displayState.outputAssetSrc) {
      const snippet = {
        status: "complete",
        progress: 100,
        outputAssetSrc: displayState.outputAssetSrc,
        result: safeResult,
      } as const;

      console.log(
        "%c—— Workflow Complete - Copy JSON Below ——",
        "color: #00d8ff; font-weight: bold; font-size: 14px;",
      );
      console.log(JSON.stringify(snippet, null, 2));
    }
  }, [displayStatus, displayState.outputAssetSrc, safeResult]);

  const creditCost = workflow?.creditCost ?? 1;

  const getCreditCostDisplay = (cost: number) => {
    if (cost === 0) {
      return {
        bgColor: "bg-green-500/20",
        borderColor: "border-green-500/30",
        textColor: "text-green-400",
        label: "FREE",
      };
    } else if (cost > 0 && cost < 3) {
      return {
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/30",
        textColor: "text-blue-400",
        label: `${cost} ${cost === 1 ? "CREDIT" : "CREDITS"}`,
      };
    } else if (cost >= 3 && cost < 5) {
      return {
        bgColor: "bg-cyan-500/20",
        borderColor: "border-cyan-500/30",
        textColor: "text-cyan-400",
        label: `${cost} CREDITS`,
      };
    } else if (cost >= 5 && cost < 7) {
      return {
        bgColor: "bg-purple-500/20",
        borderColor: "border-purple-500/30",
        textColor: "text-purple-400",
        label: `${cost} CREDITS`,
      };
    } else if (cost >= 7 && cost < 9) {
      return {
        bgColor: "bg-pink-500/20",
        borderColor: "border-pink-500/30",
        textColor: "text-pink-400",
        label: `${cost} CREDITS`,
      };
    } else if (cost >= 9 && cost < 12) {
      return {
        bgColor: "bg-orange-500/20",
        borderColor: "border-orange-500/30",
        textColor: "text-orange-400",
        label: `${cost} CREDITS`,
      };
    } else {
      return {
        bgColor: "bg-red-500/20",
        borderColor: "border-red-500/30",
        textColor: "text-red-400",
        label: `${cost} CREDITS`,
      };
    }
  };

  const creditDisplay = getCreditCostDisplay(creditCost);

  return (
    <div className="border-border-default bg-surface-secondary h-[65vh] w-full overflow-y-auto border p-4 md:w-1/2">
      <div className="border-border-default mb-4 flex items-center justify-between border-b pb-2">
        <div className="flex w-full items-center justify-end gap-3">
          <div
            className={`flex items-center gap-1 ${creditDisplay.bgColor} border ${creditDisplay.borderColor} ${creditDisplay.textColor} rounded-none px-2 py-0.5 font-mono text-[10px]`}
          >
            <Coins size={10} />
            <span className="font-bold">{creditDisplay.label}</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-[300px] flex-col items-center justify-center">
        {displayStatus === "idle" && (
          <div className="text-text-muted text-center">
            <TerminalHistory className="mx-auto mb-4 h-12 w-12" />
            <p className="font-mono text-xs">Run the workflow to see results</p>
          </div>
        )}

        {displayStatus === "processing" && (
          <div className="w-full text-center">
            <div className="bg-surface-primary border-border-default relative mb-4 h-4 w-full overflow-visible rounded-none border">
              <div
                className={`${getProgressColor(
                  displayState.progress ?? 0,
                )} h-full transition-all duration-300`}
                style={{ width: `${displayState.progress ?? 0}%` }}
              />
            </div>
            <p className="text-text-secondary font-mono text-xs">
              Processing...
            </p>
          </div>
        )}

        {displayStatus === "complete" && currentImage && (
          <>
            {typeof currentImage === "string" && (
              <WorkflowOutput
                result={safeResult}
                workflow={workflow?.data!}
                outputAssetSrc={currentImage}
              />
            )}

            {/* Multi-image navigation */}
            {isMultipleImages &&
              outputAssetSrc &&
              outputAssetSrc.length > 1 && (
                <div className="mt-4 flex w-full items-center justify-between">
                  <button
                    onClick={goToPreviousImage}
                    className="border-border-default bg-surface-primary hover:bg-surface-accent border p-2"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="text-text-secondary font-mono text-xs">
                    {currentImageIndex + 1} / {outputAssetSrc.length}
                  </div>

                  <button
                    onClick={goToNextImage}
                    className="border-border-default bg-surface-primary hover:bg-surface-accent border p-2"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
          </>
        )}

        {displayStatus === "error" && (
          <div className="text-center text-red-400">
            <p className="font-mono text-xs">
              An error occurred during processing
            </p>
          </div>
        )}

        {displayStatus === "complete" && !currentImage && (
          <>
            <div className="mt-4">
              {typeof currentImage === "string" && (
                <WorkflowOutput
                  result={safeResult}
                  workflow={workflow?.data!}
                  outputAssetSrc={currentImage}
                />
              )}
            </div>

            {/* Multi-image navigation for history error case */}
            {isMultipleImages &&
              outputAssetSrc &&
              outputAssetSrc.length > 1 && (
                <div className="mt-4 flex w-full items-center justify-between">
                  <button
                    onClick={goToPreviousImage}
                    className="border-border-default bg-surface-primary hover:bg-surface-accent border p-2"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="text-text-secondary font-mono text-xs">
                    {currentImageIndex + 1} / {outputAssetSrc.length}
                  </div>

                  <button
                    onClick={goToNextImage}
                    className="border-border-default bg-surface-primary hover:bg-surface-accent border p-2"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
