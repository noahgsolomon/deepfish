"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { handleColors, hexToRgba } from "./utils/colors";
import { Type } from "lucide-react";

export default function CombineTextNode(props: NodeProps) {
  const data = props.data as any;

  const nodeBg = data.color || "#111111";
  const isRunningNode = data?.running;
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
          <div className="flex h-8 w-8 items-center justify-center bg-pink-500/30 text-pink-400">
            <Type size={16} />
          </div>
          <span className="font-mono text-sm text-white">Combine Text</span>
        </div>

        <div className="text-text-secondary p-4 font-mono text-xs">
          Concatenates any connected text inputs (or text arrays) into a single
          text output.
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
          background: handleColors.text,
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
          background: handleColors.text,
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
          background: handleColors.text,
          border: "none",
          borderRadius: "0%",
          top: 100,
        }}
      />
    </>
  );
}
