"use client";

import { WorkflowInfo } from "~/server/db/schema";
import type { InputFieldType, SchemaProperty } from "./input-field";
import InputField from "./input-field";
import { useEffect } from "react";

// Extend SchemaProperty interface for proper type checking
interface ExtendedSchemaProperty extends SchemaProperty {
  type: string;
  format?: string;
  items?: {
    type: string;
    format?: string;
  };
}

export default function WorkflowInputs({
  workflow,
  inputs,
  setInputsAction,
}: {
  workflow: WorkflowInfo;
  inputs: Record<string, any>;
  setInputsAction: (inputs: Record<string, any>) => void;
}) {
  // Initialize array inputs with empty arrays
  useEffect(() => {
    if (workflow?.schema) {
      const updatedInputs = { ...inputs };
      let hasChanges = false;

      Object.entries(workflow.schema.Input.properties).forEach(
        ([key, prop]) => {
          const extendedProp = prop as ExtendedSchemaProperty;

          // Check if this is an array type property that needs initialization
          const looksLikeImageArray =
            extendedProp.type === "array" &&
            (extendedProp.items?.format === "uri" ||
              key.toLowerCase().includes("image"));

          if (looksLikeImageArray && inputs[key] === undefined) {
            updatedInputs[key] = [];
            hasChanges = true;
          }
        },
      );

      // Only update if we found any array inputs that need initialization
      if (hasChanges) {
        setInputsAction(updatedInputs);
      }
    }
  }, [workflow, inputs, setInputsAction]);

  return (
    <div className="space-y-6 overflow-y-auto pt-4">
      {workflow?.schema &&
        Object.entries(
          workflow.schema.Input.properties as Record<
            string,
            ExtendedSchemaProperty
          >,
        )
          .sort((a, b) => (a[1]["x-order"] || 0) - (b[1]["x-order"] || 0))
          .map(([key, prop]) => {
            // Type assertion to treat prop as ExtendedSchemaProperty
            const extendedProp = prop as ExtendedSchemaProperty;
            let type: InputFieldType["type"];
            let options: string[] | undefined;

            // Handle array types (e.g., for input_images)
            if (extendedProp.type === "array" && extendedProp.items) {
              const looksLikeImage =
                key.toLowerCase().includes("image") ||
                extendedProp.title?.toLowerCase().includes("image") ||
                extendedProp.items.format === "uri";

              if (looksLikeImage) {
                type = "image_array";
              } else {
                type = "text";
              }
            } else if (extendedProp.format === "uri") {
              // First, check if the field name explicitly indicates the type
              if (
                key.toLowerCase() === "input_image" ||
                key.toLowerCase().includes("image")
              ) {
                type = "image";
              } else if (
                key.toLowerCase() === "input_video" ||
                key.toLowerCase().includes("video")
              ) {
                type = "video";
              } else if (
                key.toLowerCase() === "input_audio" ||
                key.toLowerCase().includes("audio") ||
                key.toLowerCase().includes("song") ||
                key.toLowerCase().includes("voice") ||
                key.toLowerCase().includes("instrumental") ||
                key.toLowerCase().includes("music") ||
                key.toLowerCase().includes("sound") ||
                key.toLowerCase().includes("track") ||
                key.toLowerCase().includes("beat") ||
                key.toLowerCase().includes("vocal")
              ) {
                type = "audio";
              } else {
                // Fallback to checking title and description
                const isVideo =
                  extendedProp.title?.toLowerCase().includes("video") ||
                  extendedProp.description?.toLowerCase().includes("video");

                const isAudio =
                  extendedProp.title?.toLowerCase().includes("audio") ||
                  extendedProp.description?.toLowerCase().includes("audio") ||
                  extendedProp.title?.toLowerCase().includes("song") ||
                  extendedProp.title?.toLowerCase().includes("voice") ||
                  extendedProp.title?.toLowerCase().includes("instrumental") ||
                  extendedProp.title?.toLowerCase().includes("music") ||
                  extendedProp.title?.toLowerCase().includes("sound") ||
                  extendedProp.title?.toLowerCase().includes("track") ||
                  extendedProp.title?.toLowerCase().includes("beat") ||
                  extendedProp.title?.toLowerCase().includes("vocal") ||
                  extendedProp.description?.toLowerCase().includes("song") ||
                  extendedProp.description?.toLowerCase().includes("voice") ||
                  extendedProp.description
                    ?.toLowerCase()
                    .includes("instrumental") ||
                  extendedProp.description?.toLowerCase().includes("music") ||
                  extendedProp.description?.toLowerCase().includes("sound") ||
                  extendedProp.description?.toLowerCase().includes("track") ||
                  extendedProp.description?.toLowerCase().includes("beat") ||
                  extendedProp.description?.toLowerCase().includes("vocal");

                if (isAudio) {
                  type = "audio";
                } else if (isVideo) {
                  type = "video";
                } else {
                  type = "image";
                }
              }
            } else if (extendedProp.enum) {
              type = "select";
              options = extendedProp.enum;
            } else if (extendedProp.type === "integer") {
              if (
                extendedProp.minimum !== undefined &&
                extendedProp.maximum !== undefined
              ) {
                type = "slider";
              } else {
                type = "number";
              }
            } else if (extendedProp.type === "number") {
              if (
                extendedProp.minimum !== undefined &&
                extendedProp.maximum !== undefined
              ) {
                type = "slider";
              } else {
                type = "number";
              }
            } else if (extendedProp.type === "boolean") {
              type = "checkbox";
            } else {
              type = "text";
            }

            let step = 1;
            if (extendedProp.type === "number") {
              step = 0.1;
            }

            const field: InputFieldType = {
              name: key,
              type,
              label: extendedProp.title,
              helperText: extendedProp.description,
              required: workflow?.schema?.Input.required?.includes(key),
              min: extendedProp.minimum,
              max: extendedProp.maximum,
              defaultValue: extendedProp.default,
              options: options,
              step: step,
              format: extendedProp.format,
              // Extract the saved value from the schema property if it exists
              savedValue: extendedProp.saved,
            };

            return (
              <InputField
                setInputsAction={setInputsAction}
                inputs={inputs}
                key={key}
                field={field}
                workflowTitle={workflow.title}
              />
            );
          })}
    </div>
  );
}
