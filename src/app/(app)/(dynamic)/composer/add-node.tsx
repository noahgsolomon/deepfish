"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  ArrowRight,
  Check,
  Hash,
  Image as LucideImage,
  Text,
  Video,
} from "lucide-react";
import Image from "next/image";
import { InputFieldType } from "~/app/(app)/workflow/_components/input-field";
import React from "react";
import { handleColors } from "./utils/colors";
import { useAllWorkflows } from "~/hooks/workflows";
import { WorkflowData } from "~/server/db/schema";

// Node data type definitions
export type NodeData =
  | {
      // Primitive node
      label: string;
      fieldType: InputFieldType;
      outputType: string;
    }
  | {
      // Result node
      src: string;
      label: string;
    }
  | {
      // Combine node (images or text)
      inputTypeMap: Record<string, string>;
      outputType: string;
    }
  | {
      // Workflow node
      workflow: WorkflowData;
      inputTypeMap: Record<string, string>;
    };

// Primitive node definitions
const primitiveNodeTypes: InputFieldType[] = [
  {
    name: "text_input",
    type: "text",
    label: "Text Input",
    placeholder: "Enter text...",
    helperText: "A simple text input field",
  },
  {
    name: "number_input",
    type: "number",
    label: "Number Input",
    placeholder: "Enter a number",
    helperText: "A numeric input field",
  },
  {
    name: "image_input",
    type: "image",
    label: "Image Input",
    helperText: "Upload or provide an image",
  },
  {
    name: "video_input",
    type: "video",
    label: "Video Input",
    helperText: "Upload or provide a video",
  },
  {
    name: "audio_input",
    type: "audio",
    label: "Audio Input",
    helperText: "Upload or provide an audio file",
  },
  {
    name: "slider_input",
    type: "slider",
    label: "Slider Input",
    min: 0,
    max: 100,
    step: 1,
    helperText: "Select a value using a slider",
  },
  {
    name: "checkbox_input",
    type: "checkbox",
    label: "Checkbox Input",
    helperText: "Toggle between true and false",
  },
];

// Command dialog to add new nodes
export default function AddNodeDialog({
  open,
  onOpenChange,
  onAddNode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNode: (type: string, data: NodeData) => void;
}) {
  // Get workflows from global store – include both official and user-composed
  const { data: allWorkflowsData } = useAllWorkflows();
  const workflows = allWorkflowsData?.workflows ?? [];

  // Helper function to infer modality type from schema property
  function inferInputType(prop: any): string | null {
    if (prop.format === "uri") {
      const title = (prop.title || "").toLowerCase();
      if (title.includes("video")) return "video";
      if (title.includes("audio")) return "audio";
      if (
        title.includes("song") ||
        title.includes("voice") ||
        title.includes("instrumental") ||
        title.includes("music") ||
        title.includes("sound") ||
        title.includes("track") ||
        title.includes("beat") ||
        title.includes("vocal")
      )
        return "audio";
      if (title.includes("image") || title.includes("mask")) return "image";
      return "file";
    }
    // Handle array of URIs or other structured inputs
    if (prop.type === "array" && prop.items) {
      const itemSchema = prop.items;
      // If array items are strings with URI format
      if (
        (itemSchema.format === "uri" || itemSchema.type === "string") &&
        (prop.title || "").toLowerCase().includes("image")
      ) {
        return "image";
      }
      // Generic fallback for array of URIs without clear media type
      if (itemSchema.format === "uri") {
        return "file";
      }
    }
    if (prop.type === "string") return "text";
    if (
      prop.type === "integer" ||
      prop.type === "number" ||
      prop.type === "boolean"
    ) {
      return null;
    }
    return null;
  }

  // Badge color helper
  function badgeColor(t: string) {
    switch (t) {
      case "text":
        return "bg-pink-500/30 border-pink-500/50 text-pink-100";
      case "image":
        return "bg-sky-500/30 border-sky-500/50 text-sky-100";
      case "audio":
        return "bg-purple-500/30 border-purple-500/50 text-purple-100";
      case "video":
        return "bg-teal-500/30 border-teal-500/50 text-teal-100";
      default:
        return "bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-100";
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search for a node..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Primitive Nodes">
          {primitiveNodeTypes.map((nodeType) => (
            <CommandItem
              key={nodeType.name}
              onSelect={() => {
                onAddNode("primitiveNode", {
                  label: nodeType.label,
                  fieldType: nodeType,
                  outputType: nodeType.type,
                });
                onOpenChange(false);
              }}
            >
              <div
                className="mr-2 flex h-5 w-5 items-center justify-center rounded-none"
                style={{
                  background:
                    handleColors[nodeType.type as keyof typeof handleColors] +
                    "30",
                  color:
                    handleColors[nodeType.type as keyof typeof handleColors] ||
                    handleColors.text,
                }}
              >
                {nodeType.type === "text" && <Text size={12} />}
                {nodeType.type === "image" && <LucideImage size={12} />}
                {nodeType.type === "video" && <Video size={12} />}
                {nodeType.type === "number" && <Hash size={12} />}
                {nodeType.type === "audio" && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 14a2 2 0 100-4 2 2 0 000 4z"
                      fill="currentColor"
                    />
                    <path
                      d="M6 10a2 2 0 100-4 2 2 0 000 4z"
                      fill="currentColor"
                    />
                    <path
                      d="M18 10a2 2 0 100-4 2 2 0 000 4z"
                      fill="currentColor"
                    />
                    <path
                      d="M6 18a2 2 0 100-4 2 2 0 000 4z"
                      fill="currentColor"
                    />
                    <path
                      d="M18 18a2 2 0 100-4 2 2 0 000 4z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {nodeType.type === "slider" && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 6h16M4 12h16M4 18h16"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="16" cy="6" r="2" fill="currentColor" />
                    <circle cx="8" cy="12" r="2" fill="currentColor" />
                    <circle cx="12" cy="18" r="2" fill="currentColor" />
                  </svg>
                )}
                {nodeType.type === "checkbox" && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="4"
                      y="4"
                      width="16"
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 12l3 3 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span>{nodeType.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Model Nodes">
          <CommandItem
            onSelect={() => {
              onAddNode("resultNode", {
                src: "https://cwp8pb7l7rzz6iyv.public.blob.vercel-storage.com/rough-stamp.png",
                label: "Result",
              });
              onOpenChange(false);
            }}
          >
            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-none bg-green-500/30 text-green-400">
              <Check size={12} className="text-green-400" />
            </div>
            <span>Result</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onAddNode("combineImagesNode", {
                inputTypeMap: { in1: "image_array", in2: "image_array" },
                outputType: "image_array",
              });
              onOpenChange(false);
            }}
          >
            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-none bg-blue-500/30 text-blue-400">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span>Combine Images</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onAddNode("combineTextNode", {
                inputTypeMap: { in1: "text", in2: "text" },
                outputType: "text",
              });
              onOpenChange(false);
            }}
          >
            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-none bg-pink-500/30 text-pink-400">
              <Text size={12} />
            </div>
            <span>Combine Text</span>
          </CommandItem>
        </CommandGroup>

        {workflows.length > 0 && (
          <CommandGroup heading="Workflow Nodes">
            {workflows.map((w) => (
              <CommandItem
                key={w.title}
                onSelect={() => {
                  console.log("w", w);
                  // Build inputTypeMap
                  const map: Record<string, string> = {};
                  const props = w.data.schema.Input.properties;
                  Object.keys(props).forEach((name) => {
                    const prop: any = props[name];
                    let t: string = "text";
                    if (prop.enum) {
                      t = "select";
                    } else if (prop.type === "boolean") {
                      t = "checkbox";
                    } else if (
                      prop.type === "integer" ||
                      prop.type === "number"
                    ) {
                      t = "number";
                    } else if (prop.type === "array") {
                      const looksLikeImageArr =
                        prop.items?.format === "uri" ||
                        name.toLowerCase().includes("image");
                      t = looksLikeImageArr ? "image_array" : "text";
                    } else if (prop.format === "uri") {
                      const low = name.toLowerCase();
                      if (low.includes("video")) t = "video";
                      else if (low.includes("audio")) t = "audio";
                      else t = "image";
                    } else if (prop.type === "string") {
                      t = "text";
                    }
                    map[name] = t;
                  });
                  onAddNode("workflowNode", {
                    workflow: { ...w?.data, id: w?.id },
                    inputTypeMap: map,
                  });
                  onOpenChange(false);
                }}
                className="flex flex-col items-start !py-2"
              >
                <div className="flex items-center">
                  <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-none bg-purple-500/30 text-purple-400">
                    {w.data?.avatar ? (
                      <Image
                        width={32}
                        height={32}
                        src={w.data?.avatar}
                        alt={w.data?.title}
                        className="border-border-default h-full w-full border object-contain"
                      />
                    ) : (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium">
                    {w.data?.shortTitle || w.data?.title}
                  </span>
                </div>

                <div className="mt-1 flex flex-col">
                  <p className="text-text-muted mb-2 text-sm">
                    {w.data?.shortDescription ?? ""}
                  </p>

                  <div className="flex items-center gap-1">
                    {(() => {
                      const props = w.data?.schema?.Input?.properties;

                      // Get all input types like in AiCard
                      const inputTypes: string[] = [];
                      if (props) {
                        Object.values(props).forEach((prop: any) => {
                          const t = inferInputType(prop);
                          if (t && !inputTypes.includes(t)) inputTypes.push(t);
                        });
                      }

                      // Determine separator character like in AiCard
                      let separatorChar = "";
                      if (inputTypes.length > 1) {
                        const requiredPropNames: string[] =
                          w.data?.schema?.Input?.required ?? [];
                        const requiredTypes: string[] = [];
                        if (w.data?.schema?.Input?.properties) {
                          requiredPropNames.forEach((name: string) => {
                            const prop = (
                              w.data?.schema?.Input.properties as any
                            )[name];
                            if (prop) {
                              const t = inferInputType(prop);
                              if (t && !requiredTypes.includes(t))
                                requiredTypes.push(t);
                            }
                          });
                        }
                        // If all distinct input types are required, use nothing, otherwise use '|'
                        separatorChar =
                          requiredTypes.length === inputTypes.length ? "" : "|";
                      }

                      // Render all input types with separator (just like AiCard)
                      return (
                        <>
                          {inputTypes.map((t, idx) => (
                            <React.Fragment key={`in-${t}`}>
                              <div
                                className={`border px-1 font-mono text-[9px] ${badgeColor(
                                  t,
                                )} inline-block`}
                              >
                                {t.toUpperCase()}
                              </div>
                              {idx < inputTypes.length - 1 && separatorChar && (
                                <div className="text-text-muted inline-block px-0.5 font-mono text-[12px]">
                                  {separatorChar}
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}
                    {(() => {
                      const hasInputTypes =
                        w.data?.schema?.Input?.properties &&
                        Object.values(w.data.schema.Input.properties).some(
                          (p) => inferInputType(p),
                        );
                      const outputType =
                        w.data?.outputType || w.data?.schema?.Output?.format;

                      return hasInputTypes && outputType ? (
                        <ArrowRight size={10} className="text-text-muted" />
                      ) : null;
                    })()}

                    {/* Output type */}
                    {(() => {
                      const outputType =
                        w.data?.outputType || w.data?.schema?.Output?.format;

                      return outputType ? (
                        <div
                          className={`border px-1 font-mono text-[9px] ${badgeColor(
                            outputType,
                          )} inline-block`}
                        >
                          {outputType.toUpperCase()}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
