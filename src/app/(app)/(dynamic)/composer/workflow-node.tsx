"use client";

import { Handle, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import InputField, {
  InputFieldType,
} from "../../workflow/_components/input-field";
import { handleColors, hexToRgba } from "./utils/colors";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";
import { Cloud, CpuIcon, Lightbulb, RefreshCw } from "lucide-react";
import { showExampleInputs } from "~/app/(app)/workflow/_components/workflow-input-card";
import Image from "next/image";
import { WorkflowInfo } from "~/server/db/schema";
import { useWorkflowByTitle } from "~/hooks/workflows";

interface WorkflowNodeData {
  workflow: WorkflowInfo;
  label?: string;
  color?: string;
  isPinned?: boolean;
  collapsed?: boolean;
  runMode?: "local" | "api";
  inputs?: Record<string, any>;
}

// Helper: convert DeepFish JSON-schema properties → our InputFieldType[]
function schemaToInputFields(schema: any): InputFieldType[] {
  if (!schema || !schema.Input || !schema.Input.properties) return [];
  const result: InputFieldType[] = [];
  const props = schema.Input.properties;
  Object.keys(props)
    .sort((a, b) => (props[a]["x-order"] ?? 0) - (props[b]["x-order"] ?? 0))
    .forEach((name) => {
      const prop = props[name];
      const lowerName = name.toLowerCase();

      let type: InputFieldType["type"] = "text";
      if (prop.enum) {
        type = "select";
      } else if (prop.type === "boolean") {
        type = "checkbox";
      } else if (prop.type === "integer" || prop.type === "number") {
        // decide slider vs number
        if (prop.minimum !== undefined && prop.maximum !== undefined) {
          type = "slider";
        } else {
          type = "number";
        }
      } else if (prop.type === "array") {
        const looksLikeImageArr =
          prop.items?.format === "uri" ||
          name.toLowerCase().includes("image") ||
          (prop.title || "").toLowerCase().includes("image");
        type = looksLikeImageArr ? "image_array" : "text";
      } else if (prop.type === "string" && prop.format === "uri") {
        const lower = (prop.title || name).toLowerCase();
        if (lower.includes("video")) {
          type = "video";
        } else if (
          lower.includes("audio") ||
          lower.includes("song") ||
          lower.includes("voice") ||
          lower.includes("instrumental") ||
          lower.includes("music") ||
          lower.includes("sound") ||
          lower.includes("track") ||
          lower.includes("beat") ||
          lower.includes("vocal")
        ) {
          type = "audio";
        } else if (lower.includes("image")) {
          type = "image";
        } else {
          type = "image"; // default for uri
        }
      } else if (prop.type === "string") {
        // Check if field name suggests it's an audio input even without URI format
        if (
          lowerName.includes("audio") ||
          lowerName.includes("song") ||
          lowerName.includes("voice") ||
          lowerName.includes("instrumental") ||
          lowerName.includes("music") ||
          lowerName.includes("sound") ||
          lowerName.includes("track") ||
          lowerName.includes("beat") ||
          lowerName.includes("vocal")
        ) {
          type = "audio";
        } else {
          type = "text";
        }
      }

      const field: InputFieldType = {
        name,
        type,
        label: prop.title || name,
        helperText: prop.description,
        required: schema.Input.required?.includes(name),
        defaultValue: prop.default,
        min: prop.minimum,
        max: prop.maximum,
        options: prop.enum,
        format: prop.format,
        savedValue: (prop as any).saved,
      } as InputFieldType;

      // For sliders, decide step
      if (type === "slider") {
        field.step = prop.type === "integer" ? 1 : 0.1;
      }

      result.push(field);
    });
  return result;
}

export default function WorkflowNode(props: NodeProps) {
  const data = props.data as any as WorkflowNodeData;
  const { workflow } = data;
  const reactFlow = useReactFlow();
  const draggingType = useComposeWorkflowStore((s) => s.draggingType);
  const findWorkflowByTitle = useWorkflowByTitle(data.workflow.title);

  // Build input definitions once
  const inputFields = useMemo(
    () => schemaToInputFields(workflow.schema),
    [workflow],
  );

  // Build default inputs
  const defaultInputs: Record<string, any> = useMemo(() => {
    const obj: Record<string, any> = {};
    inputFields.forEach((f) => {
      obj[f.name] = f.defaultValue !== undefined ? f.defaultValue : undefined;
    });
    return obj;
  }, [inputFields]);

  // Initialize input state by combining schema defaults with any previously saved inputs
  const [inputs, setInputs] = useState<Record<string, any>>({
    ...defaultInputs,
    ...(data.inputs || {}),
  });

  const [collapsed, setCollapsed] = useState<boolean>(data.collapsed ?? false);

  // keep local collapsed in sync with external updates (e.g., load draft)
  useEffect(() => {
    setCollapsed(data.collapsed ?? false);
  }, [data.collapsed]);

  // Node color/background
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

  const setInputsAction = useCallback((updater: any) => {
    setInputs(updater);
  }, []);

  // Layout constants
  const rowHeight = 70; // px per input

  // Common class for input labels
  const labelCls =
    "absolute left-0 -translate-x-full pr-4 whitespace-nowrap text-xs font-mono text-text-default pointer-events-none flex items-center h-[12px]";

  // Whenever inputs change, persist them back into this node's `data` so the
  // composer executor can pick them up (even without connections).
  useEffect(() => {
    reactFlow.setNodes((nds) =>
      nds.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, inputs } }
          : node,
      ),
    );
  }, [inputs, reactFlow, props.id]);

  // ------------------------------------------------------------------
  // Helpers for default & example inputs
  // ------------------------------------------------------------------

  const getDefaultInputs = useCallback((): Record<string, any> => {
    const obj: Record<string, any> = {};
    if (workflow?.schema?.Input?.properties) {
      Object.entries(workflow.schema.Input.properties).forEach(
        ([key, prop]: [string, any]) => {
          obj[key] = prop.default !== undefined ? prop.default : undefined;
        },
      );
    }
    return obj;
  }, [workflow]);

  const hasInputChanges = useMemo(() => {
    if (!workflow?.schema?.Input?.properties) return false;
    const props = workflow.schema.Input.properties;
    return Object.keys(props).some((field) => {
      const defVal = props[field].default;
      const curVal = inputs[field];
      if (defVal !== undefined && curVal === defVal) return false;
      if (
        defVal === undefined &&
        (curVal === undefined || curVal === null || curVal === "")
      )
        return false;
      return true;
    });
  }, [inputs, workflow]);

  const handleResetInputs = () => {
    const defaults = getDefaultInputs();
    setInputs(defaults);
  };

  return (
    <>
      <div
        className={`relative flex flex-col rounded-none border ${borderClass} w-[420px]`}
        style={{ backgroundColor: nodeBgColor }}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-2 px-4 py-3 ${
            collapsed ? "" : "border-border-default border-b"
          }`}
          style={{ backgroundColor: hexToRgba(nodeBgColor, 1.2) }}
        >
          {/* avatar */}
          {workflow.avatar ? (
            <Image
              width={64}
              height={64}
              src={workflow.avatar}
              alt={workflow.title}
              className={`border-border-default h-16 w-16 border object-contain`}
            />
          ) : (
            <div
              className={`border-border-default bg-surface-hover h-16 w-16 border`}
            />
          )}
          <span className={`font-mono text-base text-white`}>
            {workflow.title}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              title="Run locally"
              className={`hover:bg-surface-hover text-text-secondary cursor-not-allowed rounded-none p-1 opacity-30`}
            >
              <CpuIcon size={14} />
            </button>
            <button
              title="Run via API"
              className={`hover:bg-surface-hover rounded-none p-1 text-blue-400`}
            >
              <Cloud size={14} />
            </button>
          </div>
        </div>

        {/* Action bar: Example & Reset buttons */}
        {!collapsed && (
          <div className="flex justify-end gap-2 px-4 pt-2 pb-1">
            {workflow?.schema?.Example && (
              <button
                title="Load example inputs"
                onClick={(e) => {
                  e.stopPropagation();
                  showExampleInputs(workflow, setInputs);
                }}
                className="border border-yellow-500/30 bg-yellow-500/10 p-1 text-yellow-400 hover:bg-yellow-500/20"
              >
                <Lightbulb size={12} />
              </button>
            )}
            <button
              title="Reset inputs to defaults"
              onClick={(e) => {
                e.stopPropagation();
                handleResetInputs();
              }}
              disabled={!hasInputChanges}
              className={`p-1 ${
                !hasInputChanges
                  ? "cursor-not-allowed border border-gray-500/30 bg-gray-500/10 text-gray-400"
                  : "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              }`}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        )}

        {/* Content */}
        {!collapsed && (
          <div className="flex flex-col gap-4 overflow-y-auto p-4 pt-1">
            {inputFields.map((field) => (
              <InputField
                key={field.name}
                field={field}
                inputs={inputs}
                setInputsAction={setInputsAction}
                workflowTitle={workflow.title}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input labels for handles */}
      {!collapsed &&
        inputFields.map((field, idx) => {
          const top = 100 + idx * rowHeight - 6;
          const compatible = (a?: string, b?: string, fieldName?: string) => {
            if (!a || !b) return true;
            if (a === b) return true;
            if (a === "image" && b === "image_array") return true;

            // Check if field name suggests it's an audio input
            if (a === "audio" && fieldName) {
              const nm = fieldName.toLowerCase();
              if (
                nm.includes("audio") ||
                nm.includes("song") ||
                nm.includes("voice") ||
                nm.includes("instrumental") ||
                nm.includes("music") ||
                nm.includes("sound") ||
                nm.includes("track") ||
                nm.includes("beat") ||
                nm.includes("vocal")
              ) {
                return true;
              }
            }

            return false;
          };
          const dim =
            draggingType &&
            !compatible(draggingType as string, field.type, field.name);
          return (
            <span
              key={field.name + "-label"}
              className={labelCls + (dim ? " opacity-30" : "")}
              style={{ top }}
            >
              {field.name}
            </span>
          );
        })}

      {/* Input handles dynamically */}
      {inputFields.map((field, idx) => {
        const top = collapsed ? 40 : 100 + idx * rowHeight;
        const color =
          handleColors[field.type as keyof typeof handleColors] ||
          handleColors.text;
        const compatible = (a?: string, b?: string, fieldName?: string) => {
          if (!a || !b) return true;
          if (a === b) return true;
          if (a === "image" && b === "image_array") return true;

          // Check if field name suggests it's an audio input
          if (a === "audio" && fieldName) {
            const nm = fieldName.toLowerCase();
            if (
              nm.includes("audio") ||
              nm.includes("song") ||
              nm.includes("voice") ||
              nm.includes("instrumental") ||
              nm.includes("music") ||
              nm.includes("sound") ||
              nm.includes("track") ||
              nm.includes("beat") ||
              nm.includes("vocal")
            ) {
              return true;
            }
          }

          return false;
        };
        const dim =
          draggingType &&
          !compatible(draggingType as string, field.type, field.name);
        return (
          <Handle
            key={field.name}
            type="target"
            position={Position.Left}
            id={field.name}
            style={{
              width: 12,
              height: 12,
              border: "none",
              borderRadius: "0%",
              background: color,
              opacity: dim ? 0.3 : 1,
              top,
            }}
          />
        );
      })}

      {/* Single output */}
      {(() => {
        const ot = workflow?.outputType;
        const colorKey = ot && ot in handleColors ? ot : "output";
        const outColor = (handleColors as any)[colorKey] ?? handleColors.output;
        return (
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            style={{
              width: 12,
              height: 12,
              border: "none",
              borderRadius: "0%",
              background: outColor,
              top: collapsed ? 40 : 80,
            }}
          />
        );
      })()}
    </>
  );
}
