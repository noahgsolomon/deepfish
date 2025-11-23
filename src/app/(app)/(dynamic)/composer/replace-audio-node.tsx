"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { handleColors, hexToRgba } from "./utils/colors";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";

export default function ReplaceAudioNode(props: NodeProps) {
  const data = props.data as any;
  const draggingType = useComposeWorkflowStore((s: any) => s.draggingType);

  const nodeBg = data.color || "#111111";
  const isRunningNode = data?.running;
  const borderClass = isRunningNode
    ? "border-blue-500"
    : props.selected
      ? "border-rainbow-1"
      : "border-border-default";

  const compatible = (a?: string, b?: string) => {
    if (!a || !b) return true;
    if (a === b) return true;
    if (a === "image" && b === "image_array") return true;
    return false;
  };

  return (
    <>
      <div
        className={`relative flex flex-col rounded-none border ${borderClass} w-[300px]`}
        style={{ backgroundColor: nodeBg }}
      >
        <div
          className="border-border-default flex items-center gap-2 border-b px-4 py-3"
          style={{ backgroundColor: hexToRgba(nodeBg, 1.2) }}
        >
          <div className="flex h-8 w-8 items-center justify-center bg-teal-500/30 text-teal-400">
            {/* icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 9 L8 9 L12 5 L12 19 L8 15 L4 15 Z" />
              <path d="M16 8 C17.5 9.5 17.5 14.5 16 16" />
              <path d="M18 6 C20.5 9.5 20.5 14.5 18 18" />
            </svg>
          </div>
          <span className="font-mono text-sm text-white">Replace Audio</span>
        </div>

        <div className="text-text-secondary p-4 font-mono text-xs">
          Outputs a video with its audio track replaced by the provided audio
          input.
        </div>
      </div>

      {/* video input handle */}
      {(() => {
        const dim =
          draggingType && !compatible(draggingType as string, "video");
        return (
          <Handle
            type="target"
            position={Position.Left}
            id="video"
            style={{
              width: 12,
              height: 12,
              background: handleColors.video,
              border: "none",
              borderRadius: "0%",
              opacity: dim ? 0.3 : 1,
              top: 80,
            }}
          />
        );
      })()}

      {/* audio input handle */}
      {(() => {
        const dim =
          draggingType && !compatible(draggingType as string, "audio");
        return (
          <Handle
            type="target"
            position={Position.Left}
            id="audio"
            style={{
              width: 12,
              height: 12,
              background: handleColors.audio,
              border: "none",
              borderRadius: "0%",
              opacity: dim ? 0.3 : 1,
              top: 120,
            }}
          />
        );
      })()}

      {/* output */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 12,
          height: 12,
          background: handleColors.video,
          border: "none",
          borderRadius: "0%",
          top: 100,
        }}
      />

      {/* Labels */}
      {[
        { id: "video", top: 80, label: "video" },
        { id: "audio", top: 120, label: "audio" },
      ].map((h) => {
        const dim = draggingType && !compatible(draggingType as string, h.id);
        return (
          <span
            key={h.id + "-label"}
            className={
              "text-text-default pointer-events-none absolute left-0 -translate-x-full pr-4 font-mono text-xs whitespace-nowrap" +
              (dim ? " opacity-30" : "")
            }
            style={{ top: h.top - 6 }}
          >
            {h.label}
          </span>
        );
      })}
    </>
  );
}
