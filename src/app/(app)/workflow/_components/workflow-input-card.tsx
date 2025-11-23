"use client";

import { Button } from "~/components/ui/button";
import { CpuIcon, Lightbulb, RefreshCw, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkflowInputs from "./workflow-inputs";
import { useRouter } from "next/navigation";
import { useUser } from "~/hooks/auth";
import { useServerWorkflow } from "~/hooks/workflows/use-server-workflow";
import { useWorkflowDisplayState } from "~/hooks/use-workflow-display-state";
import { WorkflowInfo } from "~/server/db/schema";
import { useQueryState } from "nuqs";
import { useWorkflowRun } from "~/hooks/workflows/use-workflow-run";

export const showExampleInputs = async (
  workflow: WorkflowInfo,
  setInputs: (inputs: Record<string, any>) => void,
) => {
  if (!workflow?.schema?.Example) return;

  const exampleData = { ...workflow.schema.Example };

  for (const [key, value] of Object.entries(exampleData)) {
    const inputProperty = workflow.schema.Input.properties[key];

    // Handle single image
    if (
      inputProperty &&
      inputProperty.format === "uri" &&
      typeof value === "string"
    ) {
      // If it's already a URL that starts with http, use it directly
      if (value.startsWith("http")) {
        // Keep the URL as is, no processing needed
        continue;
      }

      const blobBase = process.env.NEXT_PUBLIC_ASSET_URL || "";
      exampleData[key] = `${blobBase}/${value}`;
    }
    // Handle array of images (for input_images)
    else if (
      inputProperty &&
      inputProperty.type === "array" &&
      inputProperty.items?.format === "uri" &&
      Array.isArray(value)
    ) {
      const blobBase = process.env.NEXT_PUBLIC_ASSET_URL || "";
      exampleData[key] = value.map((imagePath: string) => {
        if (typeof imagePath === "string" && !imagePath.startsWith("http")) {
          return `${blobBase}/${imagePath}`;
        }
        return imagePath;
      });
      continue;
    }
  }

  setInputs(exampleData);
};

export default function WorkflowInputCard({ slug }: { slug: string }) {
  const { workflow, displayState } = useWorkflowDisplayState(slug);
  const { data: user, isLoading: userLoading } = useUser();
  const router = useRouter();

  // Get runId from URL
  const [runId, _] = useQueryState("runId");

  // Fetch run data if runId exists
  const { data: runData } = useWorkflowRun(runId);

  const { execute: executeWorkflow, cancel: cancelServerWorkflow } =
    useServerWorkflow({
      workflowId: workflow?.id!,
    });

  const status = displayState.status;

  const getDefaultInputs = useCallback((schema: any): Record<string, any> => {
    if (!schema || !schema.Input || !schema.Input.properties) return {};

    const defaultInputs: Record<string, any> = {};
    const schemaProperties = schema.Input.properties;

    Object.keys(schemaProperties).forEach((key) => {
      const prop = schemaProperties[key];
      const savedValue = (prop as any).saved;
      if (
        savedValue !== undefined &&
        savedValue !== null &&
        savedValue !== ""
      ) {
        defaultInputs[key] = savedValue;
        return;
      }

      const defaultValue = prop.default;
      defaultInputs[key] =
        defaultValue !== undefined ? defaultValue : undefined;
    });

    return defaultInputs;
  }, []);

  const [inputs, setInputs] = useState<Record<string, any>>(() => {
    // If we have run data from URL, use those inputs
    if (runData?.inputs) {
      return runData.inputs;
    }

    // If workflow has predefined inputs, use those
    if (workflow?.data?.inputs) {
      return workflow.data.inputs;
    }

    // If workflow has example, start with those
    if (
      workflow?.data?.schema?.Example &&
      Object.keys(workflow.data.schema.Example).length > 0
    ) {
      // Note: showExampleInputs will handle URL transformation later
      return workflow.data.schema.Example;
    }

    // Otherwise use schema defaults
    if (workflow?.data?.schema) {
      return getDefaultInputs(workflow.data.schema);
    }

    // Fallback to empty object
    return {};
  });

  const hasInitializedExampleRef = useRef(false);
  const hasLoadedRunDataRef = useRef(false);

  // Only handle example URL transformation and initial run data load
  useEffect(() => {
    // Load run data inputs only once when they become available
    if (runData?.inputs && !hasLoadedRunDataRef.current) {
      hasLoadedRunDataRef.current = true;
      setInputs(runData.inputs);
      return;
    }

    // Handle example URL transformation
    if (hasInitializedExampleRef.current || !workflow || runData?.inputs)
      return;
    hasInitializedExampleRef.current = true;

    // Only run showExampleInputs for URL transformation if we started with examples
    if (
      !workflow?.data.inputs &&
      workflow?.data.schema?.Example &&
      Object.keys(workflow.data.schema.Example).length > 0
    ) {
      // This will transform relative URLs to absolute URLs
      void showExampleInputs(workflow.data, setInputs);
    }
  }, [workflow, runData]);

  // Handle local inputs change - only sync to store
  const handleInputChange = useCallback(
    (
      newInputsOrUpdater:
        | Record<string, any>
        | ((prev: Record<string, any>) => Record<string, any>),
    ) => {
      setInputs((prev) =>
        typeof newInputsOrUpdater === "function"
          ? (
              newInputsOrUpdater as (
                p: Record<string, any>,
              ) => Record<string, any>
            )(prev)
          : newInputsOrUpdater,
      );
    },
    [], // No dependencies needed since inputs are just local state
  );

  const resetWorkflow = useCallback(() => {
    if (!workflow) return;

    if (status === "processing") {
      cancelServerWorkflow();
    }

    const defaultInputs = getDefaultInputs(workflow?.data.schema!);
    setInputs(defaultInputs);
  }, [workflow, status, cancelServerWorkflow, getDefaultInputs]);

  const cancelWorkflow = useCallback(async () => {
    if (!workflow) return;
    await cancelServerWorkflow();
  }, [workflow, cancelServerWorkflow]);

  const processWorkflow = useCallback(async () => {
    if (!workflow) return;

    if (!user) {
      router.push("/");
      return;
    }

    await executeWorkflow(inputs);
  }, [workflow, user, router, inputs, executeWorkflow]);

  const areRequiredFieldsFilled = useMemo(() => {
    if (!workflow?.data.schema) return false;

    const requiredFields = workflow?.data.schema.Input.required || [];

    return requiredFields.every((field: string) => {
      const value = inputs[field];
      return value !== undefined && value !== null && value !== "";
    });
  }, [workflow, inputs]);

  const getDefaultValue = useCallback(
    (fieldName: string) => {
      if (!workflow?.data.schema?.Input?.properties) return undefined;

      const schemaProperty = workflow.data.schema.Input.properties[fieldName];
      return schemaProperty?.default;
    },
    [workflow],
  );

  const hasInputChanges = useMemo(() => {
    if (!workflow?.data.schema?.Input?.properties) return false;

    const fieldNames = Object.keys(workflow.data.schema.Input.properties);

    return fieldNames.some((fieldName) => {
      const defaultValue = getDefaultValue(fieldName);
      const currentValue = inputs[fieldName];
      if (defaultValue !== undefined && currentValue === undefined) {
        return false;
      }
      return defaultValue !== currentValue;
    });
  }, [workflow, inputs, getDefaultValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (
          workflow &&
          displayState.status !== "processing" &&
          areRequiredFieldsFilled
        ) {
          processWorkflow();
        } else if (workflow && displayState.status === "processing") {
          cancelWorkflow();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [workflow, areRequiredFieldsFilled, processWorkflow, cancelWorkflow]);

  return (
    <div className="border-border-default bg-surface-secondary flex h-[65vh] w-full flex-col border px-2 pt-2 md:w-1/2">
      <div className="border-border-default flex items-center justify-between border-b pb-2">
        <div></div>
        <div className="flex space-x-2">
          {workflow?.data.schema?.Example && (
            <Button
              className="h-5 border border-yellow-500/30 bg-yellow-500/10 px-1.5 text-yellow-400 hover:bg-yellow-500/20"
              onClick={() => showExampleInputs(workflow?.data!, setInputs)}
              title="Load example inputs"
            >
              <Lightbulb size={12} />
            </Button>
          )}
          <Button
            disabled={!hasInputChanges}
            className={`h-5 px-1.5 ${
              !hasInputChanges
                ? "border-gray-500/30 bg-gray-500/10 text-gray-400"
                : "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            }`}
            onClick={resetWorkflow}
            title="Reset all inputs to defaults"
          >
            <RefreshCw size={12} />
          </Button>
        </div>
      </div>

      <div className="scrollbar-gutter-stable flex-1 overflow-y-auto pr-4">
        <WorkflowInputs
          setInputsAction={handleInputChange}
          inputs={inputs}
          workflow={workflow?.data!}
        />
      </div>

      <div className="border-border-default bg-surface-secondary sticky bottom-0 z-10 border-t pt-4 pb-4">
        <div className="flex flex-col space-y-2">
          <Button
            onClick={(e) => {
              e.preventDefault();
              if (!user) {
                router.push("/join");
                return;
              }
              if (displayState.status === "processing") {
                cancelWorkflow();
              } else {
                processWorkflow().catch((err: unknown) => {
                  console.error("Error processing workflow:", err);
                });
              }
            }}
            disabled={
              displayState.status === "processing"
                ? false
                : !areRequiredFieldsFilled
            }
            className={`w-full ${
              !user && !userLoading
                ? "border border-yellow-500/30 bg-yellow-500/20 font-bold text-yellow-400 shadow-md hover:bg-yellow-500/30"
                : displayState.status === "processing"
                  ? "border border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : !areRequiredFieldsFilled
                    ? "cursor-not-allowed border border-gray-500/30 bg-gray-500/20 text-gray-400"
                    : "border border-blue-500/30 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            }`}
            title={
              !user && !userLoading
                ? "Sign in to run"
                : displayState.status === "processing"
                  ? "Cancel"
                  : "Run (⌘ + enter)"
            }
          >
            {!user && !userLoading ? (
              <div className="flex items-center font-bold">
                <svg
                  className="mr-1"
                  width={16}
                  height={16}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                SIGN IN TO RUN
              </div>
            ) : displayState.status === "processing" ? (
              <div className="flex items-center">
                <XIcon size={12} className="mr-1" />
                CANCEL
              </div>
            ) : (
              <div className="flex items-center">
                <CpuIcon size={12} className="mr-1" />
                RUN
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
