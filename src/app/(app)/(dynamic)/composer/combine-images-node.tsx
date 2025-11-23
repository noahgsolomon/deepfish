"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { handleColors, hexToRgba } from "./utils/colors";

export default function CombineImagesNode(props: NodeProps) {
  const data = props.data as any;

  const nodeBg = data.color || "#111111";
  const isRunningNode = (props.data as any)?.running;
  const borderClass = isRunningNode
    ? "border-blue-500"
    : props.selected
      ? "border-rainbow-1"
      : "border-border-default";

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
          <div className="flex h-8 w-8 items-center justify-center bg-blue-500/30 text-blue-400">
            {/* icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          <span className="font-mono text-sm text-white">Combine Images</span>
        </div>

        <div className="text-text-secondary p-4 font-mono text-xs">
          Outputs a merged images[] array from any connected image or images[]
          inputs.
        </div>
      </div>

      {/* input handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="in1"
        style={{
          width: 12,
          height: 12,
          background: handleColors.image,
          border: "none",
          borderRadius: "0%",
          top: 80,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in2"
        style={{
          width: 12,
          height: 12,
          background: handleColors.image,
          border: "none",
          borderRadius: "0%",
          top: 120,
        }}
      />

      {/* output */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 12,
          height: 12,
          background: handleColors.image,
          border: "none",
          borderRadius: "0%",
          top: 100,
        }}
      />
    </>
  );
}
