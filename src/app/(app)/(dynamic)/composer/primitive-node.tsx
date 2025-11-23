"use client";
import { Handle, NodeProps, Position, useReactFlow } from "@xyflow/react";
import InputField, {
  InputFieldType,
} from "../../workflow/_components/input-field";
import { useState, useEffect, useCallback, useRef } from "react";
import { handleColors, hexToRgba } from "./utils/colors";
import { Hash, Image, Pencil, Text, Video } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";
import { useNode } from "./hooks/use-node";
import { useNodeRename } from "./hooks/use-node-rename";

interface PrimitiveNodeData {
  label: string;
  fieldType: InputFieldType;
  color?: string;
  isPinned?: boolean;
  outputType: string;
}

export default function PrimitiveNode(props: NodeProps) {
  const data = props.data as any as PrimitiveNodeData;
  const [inputs, setInputs] = useState<Record<string, any>>({
    [data.fieldType.name]:
      (data as any).value ?? data.fieldType.defaultValue ?? null,
  });
  const reactFlowInstance = useReactFlow();

  const setInputsAction = useCallback((updateFn: any) => {
    setInputs(updateFn);
  }, []);

  // Get current value from inputs
  const value = inputs[data.fieldType.name];

  // Persist the current value into node.data so the workflow executor can
  // access it later without needing component state.
  useEffect(() => {
    reactFlowInstance.setNodes((nds) =>
      nds.map((n) =>
        n.id === props.id ? { ...n, data: { ...n.data, value } } : n,
      ),
    );
  }, [value, reactFlowInstance, props.id]);

  // Style for output handle based on input type - use only the type-based color, not the node color
  const handleStyle = {
    width: 12,
    height: 12,
    background:
      handleColors[data.fieldType.type as keyof typeof handleColors] ||
      handleColors.text,
    border: "none",
    borderRadius: "0%",
    zIndex: 10,
  };

  const nodeBgColor = data.color || "#111111";
  const isRunningNode = (props.data as any)?.running;
  const hasError = (props.data as any)?.error;
  const borderClass = isRunningNode
    ? "border-blue-500"
    : hasError
      ? "border-red-500"
      : props.selected
        ? "border-rainbow-1"
        : "border-border-default";

  const inputRef = useRef<HTMLInputElement>(null);
  const { name, setName, isRenaming, setIsRenaming, onNodeRename } =
    useNodeRename({ id: props.id, initialName: data.label });

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-none border ${borderClass} w-[350px]`}
        style={{ backgroundColor: nodeBgColor }}
      >
        <div
          className="border-border-default flex items-center justify-between border-b px-4 py-3"
          style={{
            backgroundColor: nodeBgColor
              ? hexToRgba(nodeBgColor, 1.2)
              : "#0a0a0a",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center"
              style={{
                background:
                  handleColors[
                    data.fieldType.type as keyof typeof handleColors
                  ] + "30",
                color:
                  handleColors[
                    data.fieldType.type as keyof typeof handleColors
                  ],
              }}
            >
              {data.fieldType.type === "text" && <Text size={16} />}
              {data.fieldType.type === "image" && <Image size={16} />}
              {data.fieldType.type === "video" && <Video size={16} />}
              {data.fieldType.type === "number" && <Hash size={16} />}
              {data.fieldType.type === "audio" && <Hash size={16} />}
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
                    onNodeRename(props.id, data.label, name);
                    setIsRenaming(false);
                  }
                  if (e.code === "Escape") {
                    setName(data.label);
                    setIsRenaming(false);
                  }
                }}
              />
            )}
          </div>
        </div>
        <div className="p-4">
          <InputField
            field={data.fieldType}
            inputs={inputs}
            setInputsAction={setInputsAction}
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ ...handleStyle, top: 36 }}
      />
    </>
  );
}
