"use client";

import { Handle, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { handleColors, hexToRgba } from "./utils/colors";
import MediaPreview from "~/components/media-preview";
import { useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { downloadFile } from "~/lib/utils";
import { useNodeRename } from "./hooks/use-node-rename";
import { Input } from "~/components/ui/input";

interface ResultNodeData {
  src?: string | string[];
  label?: string;
  color?: string;
  isPinned?: boolean;
}

export default function ResultNode(props: NodeProps) {
  // Use the data from props in a type-safe way
  const data = props.data as any as ResultNodeData;
  const reactFlowInstance = useReactFlow();

  // Use the fixed output color for the dot, not the node color
  const dot = {
    width: 12,
    height: 12,
    background: handleColors.output,
    border: "none",
    borderRadius: "0%",
  };

  // Common class for input labels
  const labelCls =
    "absolute left-0 -translate-x-full pr-4 whitespace-nowrap text-xs font-mono text-text-default pointer-events-none flex items-center h-[12px]";

  // Support string[] src as gallery
  const srcArray: string[] = Array.isArray(data.src)
    ? (data.src as string[])
    : [];
  const isArraySrc = srcArray.length > 0;
  const [idx, setIdx] = useState(0);
  const currentSrc = isArraySrc ? srcArray[idx] : (data.src as string);

  // Node background color
  const nodeBgColor = data.color || "#111111";

  // Apply border based on selection state
  const borderClass = props.selected
    ? "border-rainbow-1"
    : "border-border-default";

  const inputRef = useRef<HTMLInputElement>(null);
  const { name, setName, isRenaming, setIsRenaming, onNodeRename } =
    useNodeRename({
      id: props.id,
      initialName: data.label ?? "Result",
    });

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-none border ${borderClass} w-[350px]`}
        style={{
          backgroundColor: nodeBgColor,
        }}
      >
        {/* Header */}
        <div
          className="border-border-default flex items-center justify-between border-b px-4 py-3"
          style={{
            backgroundColor: nodeBgColor
              ? hexToRgba(nodeBgColor, 1.2)
              : "#0a0a0a",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-none bg-green-500/30 text-green-400">
              <Check size={12} className="text-green-400" />
            </div>
            {!isRenaming ? (
              <>
                <span className="font-mono text-white">{name}</span>
                <Button
                  className="hidden h-6 w-6 group-hover:inline-flex"
                  size="icon"
                  title="Rename"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRenaming(true);
                    setTimeout(() => {
                      inputRef.current?.select();
                    });
                  }}
                >
                  <Pencil />
                </Button>
              </>
            ) : (
              <Input
                ref={inputRef}
                className="nodrag h-4/5 w-full bg-gray-950/20"
                onChange={(e) => setName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                value={name}
                autoFocus
                draggable={false}
                onKeyDown={(e) => {
                  if (e.code === "Enter") {
                    onNodeRename(props.id, data.label ?? "", name);
                    setIsRenaming(false);
                  }
                  if (e.code === "Escape") {
                    setName(data.label ?? "Result");
                    setIsRenaming(false);
                  }
                }}
              />
            )}
          </div>
          {currentSrc && (
            <Button
              className="flex h-7 items-center justify-center rounded-none border border-green-500/30 bg-green-500/10 px-2 font-mono text-xs text-green-400 hover:bg-green-500/20"
              size="sm"
              title="Download"
              onClick={(e) => {
                e.stopPropagation();
                console.log("CURRENT SRC", currentSrc);
                downloadFile(currentSrc);
              }}
            >
              <Download size={16} />
            </Button>
          )}
        </div>

        <MediaPreview src={currentSrc || ""} />

        {isArraySrc && srcArray.length > 1 && (
          <div className="bg-surface-primary border-border-default flex w-full items-center justify-between border-t px-4 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIdx((prev) => (prev === 0 ? srcArray.length - 1 : prev - 1));
              }}
              className="border-border-default border p-1 hover:bg-white/10"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-text-secondary font-mono text-[10px]">
              {idx + 1} / {srcArray.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIdx((prev) => (prev === srcArray.length - 1 ? 0 : prev + 1));
              }}
              className="border-border-default border p-1 hover:bg-white/10"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* single input */}
      <Handle
        style={dot}
        type="target"
        className="nodrag"
        position={Position.Left}
        id="input"
      />
    </>
  );
}
