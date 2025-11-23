import { useCallback } from "react";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";
import { useDraftFlowStore } from "~/store/use-draft-flow-store";
import { useExecutionStore } from "~/store/use-execution-store";
import { collectInputs, normalizeInputValues, topoSort } from "../utils/utils";
import { runReplicateWorkflow } from "~/lib/replicate";
import { runFalWorkflow } from "~/lib/fal";
import { addRun, updateRun, checkCachedRun } from "~/lib/workflow";
import { Node } from "@xyflow/react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useIncrementFlowRuns } from "~/hooks/flows";
import { WorkflowInfo } from "~/server/db/schema";

interface UseExecuteComposerWorkflowProps {
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  uploadThumb: any;
  updateExampleOutput: any;
  onStarted: () => void;
  onSuccess: () => void;
  onFailedWithError: (error: string) => void;
  onRateLimit: () => void;
  onError: () => void;
  onFailed: (err: any) => void;
}

export const useExecuteComposerWorkflow = ({
  setNodes,
  uploadThumb,
  updateExampleOutput,
  onStarted,
  onSuccess,
  onFailedWithError,
  onRateLimit,
  onError,
  onFailed,
}: UseExecuteComposerWorkflowProps) => {
  const incrementRuns = useIncrementFlowRuns();
  const trpc = useTRPC();

  const { refetch: refetchUserFlows } = useQuery(
    trpc.flow.listFlows.queryOptions({ withData: true }),
  );

  const executeComposerWorkflow = useCallback(
    async (flowId: string) => {
      if (useExecutionStore.getState().isFlowRunning(flowId)) return;

      incrementRuns.mutate({ flowId });

      useExecutionStore.getState().startExecution(flowId);
      console.group("[Composer] EXECUTION START");

      // Helper that only mutates the global store when this flow is active
      const safeSetNodes = (updater: (prev: Node[]) => Node[]) => {
        if (useComposeWorkflowStore.getState().currentFlowId === flowId) {
          setNodes(updater);
        }
      };

      try {
        onStarted();

        // latest state snapshot
        const curNodes = useComposeWorkflowStore.getState().nodes;
        const curEdges = useComposeWorkflowStore.getState().edges;

        // ------------------------------------------------------------
        // Local working copy & helpers so that we don't clobber the
        // canvas of another workflow if the user navigates away while
        // this one is still running.
        // ------------------------------------------------------------

        // We maintain our own copy of nodes which will always be in sync
        // with the running workflow irrespective of which flow is
        // currently open in the UI.
        let workingNodes: Node[] = JSON.parse(JSON.stringify(curNodes));

        // Helper: conditionally update the *global* compose store only if
        // the user is still viewing THIS flow. Otherwise mutate our local
        // copy so the execution logic and snapshots stay correct.
        const conditionalSetNodes = (updater: (prev: Node[]) => Node[]) => {
          // mutate local clone first so subsequent logic sees latest state
          workingNodes = updater(workingNodes);

          // Only push to shared store if this flow is still the one shown
          // in the Composer UI. This prevents us from stomping on the
          // state of another flow that the user has switched to.
          if (useComposeWorkflowStore.getState().currentFlowId === flowId) {
            setNodes(updater);
          }
        };

        // Helper: persist current working snapshot to the draft store so
        // that if the user revisits the flow mid-execution they will see
        // the latest state.
        const persistProgressSnapshot = () => {
          try {
            useDraftFlowStore.getState().saveDraft(flowId, {
              nodes: workingNodes,
              edges: curEdges,
              viewport: useComposeWorkflowStore.getState().viewport,
              meta: useComposeWorkflowStore.getState().meta,
            });
          } catch (err) {
            console.warn("Failed to persist running-flow snapshot", err);
          }
        };

        const ordered = topoSort(curNodes, curEdges);
        const outputs = new Map<string, any>();

        const failedNodes = new Set<string>();
        let hadError = false;

        for (const nds of ordered) {
          // Process all nodes in this topological level concurrently
          await Promise.all(
            nds.map(async (nd) => {
              // Skip execution if any upstream dependency has failed
              const hasFailedDependency = curEdges.some(
                (edge) => edge.target === nd.id && failedNodes.has(edge.source),
              );
              if (hasFailedDependency) {
                // Mark this node as errored due to upstream failure
                conditionalSetNodes((prev) =>
                  prev.map((n) =>
                    n.id === nd.id
                      ? {
                          ...n,
                          data: { ...n.data, error: true, running: false },
                        }
                      : n,
                  ),
                );
                failedNodes.add(nd.id);
                hadError = true;
                console.warn(
                  `[Composer] Skipping node ${nd.id} because of upstream failure`,
                );
                return;
              }

              console.group(`[Composer] Node ${nd.id} (${nd.type})`);
              switch (nd.type) {
                case "primitiveNode": {
                  // highlight current node
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: true } }
                        : n,
                    ),
                  );
                  let val: any = (nd.data as any)?.value;
                  if (val === undefined) {
                    const ft = (nd.data as any)?.fieldType;
                    val = ft?.defaultValue ?? null;
                  }
                  console.log("Primitive value:", val);
                  outputs.set(nd.id, val);
                  // done
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: false } }
                        : n,
                    ),
                  );
                  break;
                }
                case "combineImagesNode": {
                  // highlight current node
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: true } }
                        : n,
                    ),
                  );
                  const edgeIns = collectInputs(nd, curEdges, outputs);
                  const manualIns = (nd.data as any)?.inputs ?? {};
                  const ins = { ...manualIns, ...edgeIns };
                  const arr: string[] = [];
                  Object.values(ins).forEach((v) => {
                    if (Array.isArray(v)) arr.push(...v);
                    else if (v != null) arr.push(v as string);
                  });
                  console.log("CombineImages output array:", arr);
                  outputs.set(nd.id, arr);
                  // snapshot
                  persistProgressSnapshot();
                  // done
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: false } }
                        : n,
                    ),
                  );
                  break;
                }
                case "workflowNode": {
                  const wf = nd.data.workflow as WorkflowInfo;

                  const runnerSelected =
                    wf.provider === "replicate"
                      ? runReplicateWorkflow
                      : runFalWorkflow;
                  const edgeIns = collectInputs(nd, curEdges, outputs);
                  const manualIns = nd.data.inputs ?? {};
                  const ins = { ...manualIns, ...edgeIns };

                  // Fill missing inputs with workflow schema defaults
                  const defaultFilled: Record<string, any> = { ...ins };
                  if (wf?.schema?.Input?.properties) {
                    Object.entries(wf.schema.Input.properties).forEach(
                      ([key, prop]: [string, any]) => {
                        if (defaultFilled[key] === undefined && prop) {
                          if (
                            Object.prototype.hasOwnProperty.call(prop, "saved")
                          ) {
                            defaultFilled[key] = (prop as any).saved;
                          } else if (
                            Object.prototype.hasOwnProperty.call(
                              prop,
                              "default",
                            )
                          ) {
                            defaultFilled[key] = prop.default;
                          }
                        }

                        // Handle type mismatches
                        const currentValue = defaultFilled[key];

                        // If schema expects a string but we have an array, take the first element
                        if (
                          prop.type === "string" &&
                          Array.isArray(currentValue) &&
                          currentValue.length > 0
                        ) {
                          console.log(
                            `[Composer] Converting array to single value for ${key}:`,
                            currentValue[0],
                          );
                          defaultFilled[key] = currentValue[0];
                        }

                        // Auto-wrap single values into array if schema expects an array
                        else if (
                          prop.type === "array" &&
                          Array.isArray(prop.items) === false &&
                          currentValue !== undefined &&
                          !Array.isArray(currentValue)
                        ) {
                          console.log(
                            `[Composer] Wrapping single value into array for ${key}:`,
                            currentValue,
                          );
                          defaultFilled[key] = [currentValue];
                        }
                      },
                    );
                  }

                  // Normalize inputs: convert any local file paths to data URIs when using remote runners
                  const preparedIns: Record<string, any> =
                    await normalizeInputValues(defaultFilled);

                  // Replicate-specific hosted-file handling now occurs inside runReplicateWorkflow

                  // highlight current node
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? {
                            ...n,
                            data: { ...n.data, running: true, error: false },
                          }
                        : n,
                    ),
                  );

                  console.log(
                    "Calling runner",
                    runnerSelected.name,
                    "with inputs",
                    preparedIns,
                  );

                  // Only check run limits for workflows with valid numeric IDs (from database)
                  // this is because we're only now storing the workflow id in the workflow object
                  let result: any;
                  let runId: number | null = null;

                  if (typeof wf.id === "number") {
                    // Check for cached results first
                    console.log("[Composer] Checking for cached results...");
                    const cached = await checkCachedRun(wf.id, preparedIns);

                    if (cached.found && cached.output) {
                      console.log(
                        "[Composer] Found cached result from",
                        cached.completedAt,
                      );
                      result = cached.output;

                      // Mark node as done immediately
                      conditionalSetNodes((prev) =>
                        prev.map((n) =>
                          n.id === nd.id
                            ? {
                                ...n,
                                data: {
                                  ...n.data,
                                  running: false,
                                  error: false,
                                },
                              }
                            : n,
                        ),
                      );
                    } else {
                      // No cache found, run the workflow
                      runId = await addRun(
                        wf.id,
                        wf.provider as "replicate" | "fal",
                        preparedIns,
                      );

                      if (runId) {
                        await updateRun(runId, "running");
                      }

                      // Run the workflow
                      if (runnerSelected === runReplicateWorkflow) {
                        result = await runReplicateWorkflow({
                          workflowName: wf.imageName ?? "",
                          workflowTitle: wf.title,
                          inputData: preparedIns,
                        });
                      } else {
                        result = await runFalWorkflow({
                          workflow: wf,
                          inputData: preparedIns,
                        });
                      }
                    }
                  } else {
                    // No workflow ID, just run normally
                    if (runnerSelected === runReplicateWorkflow) {
                      result = await runReplicateWorkflow({
                        workflowName: wf.imageName ?? "",
                        workflowTitle: wf.title,
                        inputData: preparedIns,
                      });
                    } else {
                      result = await runFalWorkflow({
                        workflow: wf,
                        inputData: preparedIns,
                      });
                    }
                  }

                  // Handle explicit failure responses
                  if (
                    typeof result === "object" &&
                    result &&
                    result.success === false
                  ) {
                    if (runId) {
                      await updateRun(
                        runId,
                        "failed",
                        undefined,
                        result.error || "Runner returned error",
                      );
                    }

                    // mark node not running
                    conditionalSetNodes((prev) =>
                      prev.map((n) =>
                        n.id === nd.id
                          ? {
                              ...n,
                              data: { ...n.data, running: false, error: true },
                            }
                          : n,
                      ),
                    );
                    failedNodes.add(nd.id);
                    hadError = true;
                    console.log("result", result);
                    onFailedWithError(result.error || "Runner returned error");
                  }

                  // Extract a displayable output asset from the result.
                  const outVal: any = result.outputPath ?? result.output;

                  // If output is an array (e.g., multiple images), keep the full array so downstream nodes that accept arrays can use it.
                  if (Array.isArray(outVal) && outVal.length === 0) {
                    console.warn("Empty array output from runner-result");
                    return;
                  }

                  if (
                    !outVal ||
                    (typeof outVal !== "string" && !Array.isArray(outVal))
                  ) {
                    console.warn("Unsupported runner-result format", result);
                    return;
                  }

                  console.log("Raw runner result:", result);
                  console.log("Derived output value:", outVal);

                  // Store final value for downstream nodes
                  outputs.set(nd.id, outVal);

                  console.log("Workflow output:", outVal);
                  console.log("Outputs:", outputs);

                  if (runId && result) {
                    await updateRun(runId, "completed", result);
                  }

                  // mark done
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? {
                            ...n,
                            data: { ...n.data, running: false, error: false },
                          }
                        : n,
                    ),
                  );

                  // After processing this node, save snapshot
                  persistProgressSnapshot();

                  break;
                }
                case "resultNode": {
                  // highlight current node
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: true } }
                        : n,
                    ),
                  );
                  const ins = collectInputs(nd, curEdges, outputs);
                  const firstVal: any = Object.values(ins)[0];

                  let displayVal: any;

                  if (Array.isArray(firstVal)) {
                    // Keep array for downstream chaining and gallery view
                    displayVal = firstVal.map((item: any) => {
                      return item;
                    });
                  } else {
                    if (typeof firstVal === "string") {
                      displayVal = firstVal;
                    } else {
                      displayVal = firstVal;
                    }
                  }

                  if (firstVal !== undefined) {
                    conditionalSetNodes((prev) =>
                      prev.map((n) =>
                        n.id === nd.id
                          ? { ...n, data: { ...n.data, src: displayVal } }
                          : n,
                      ),
                    );
                  }
                  // Keep raw value in outputs for any further connections from this resultNode
                  outputs.set(nd.id, firstVal);

                  // After processing this node, save snapshot
                  persistProgressSnapshot();

                  break;
                }

                case "combineTextNode": {
                  // highlight current node
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: true } }
                        : n,
                    ),
                  );

                  const edgeIns = collectInputs(nd, curEdges, outputs);
                  const manualIns = (nd.data as any)?.inputs ?? {};
                  const ins = { ...manualIns, ...edgeIns };

                  const parts: string[] = [];
                  Object.values(ins).forEach((v) => {
                    if (Array.isArray(v)) {
                      parts.push(...v.map((s) => String(s)));
                    } else if (v != null) {
                      // Handle objects by converting to JSON, otherwise use String()
                      if (typeof v === "object") {
                        parts.push(JSON.stringify(v));
                      } else {
                        parts.push(String(v));
                      }
                    }
                  });

                  const combined = parts.join("\n");
                  console.log("CombineText output:", combined);
                  outputs.set(nd.id, combined);

                  // snapshot and mark done
                  persistProgressSnapshot();
                  conditionalSetNodes((prev) =>
                    prev.map((n) =>
                      n.id === nd.id
                        ? { ...n, data: { ...n.data, running: false } }
                        : n,
                    ),
                  );
                  break;
                }
                default:
                  break;
              }
              console.groupEnd();
            }),
          );
        }

        console.groupEnd();
        if (hadError) {
          onError();
        } else {
          console.log("outputs", outputs);

          // Capture and upload the final output for preview
          try {
            // Find all result nodes that have outputs
            const resultNodesWithOutput = ordered
              .flatMap((nds) => [...nds])
              .filter((n) => n.type === "resultNode" && outputs.has(n.id))
              .map((n) => ({ node: n, output: outputs.get(n.id) }));

            console.log(
              "[Composer] Result nodes with output:",
              resultNodesWithOutput,
            );

            if (resultNodesWithOutput.length > 0 && flowId) {
              // Get the last result node's output
              const lastResult =
                resultNodesWithOutput[resultNodesWithOutput.length - 1];
              const outputValue = lastResult.output;

              console.log("[Composer] Last result node output:", outputValue);

              // Determine output type by checking the source node
              const sourceEdge = curEdges.find(
                (e) => e.target === lastResult.node.id,
              );
              let outputType: string | undefined;

              if (sourceEdge) {
                const sourceNode = ordered
                  .flatMap((nds) => [...nds])
                  .find((n) => n.id === sourceEdge.source);
                if (sourceNode) {
                  console.log(
                    "[Composer] Source node for output type:",
                    sourceNode,
                  );
                  if (sourceNode.type === "workflowNode") {
                    outputType = (sourceNode.data as any)?.workflow?.outputType;
                  } else if (sourceNode.type === "primitiveNode") {
                    outputType = (sourceNode.data as any)?.outputType;
                  } else if (sourceNode.type === "combineImagesNode") {
                    outputType = "image";
                  } else if (sourceNode.type === "replaceAudioNode") {
                    outputType = "video";
                  }
                  console.log("[Composer] Determined outputType:", outputType);
                } else {
                  console.warn(
                    "[Composer] No source node found for edge:",
                    sourceEdge,
                  );
                }
              } else {
                console.warn(
                  "[Composer] No source edge found for last result node:",
                  lastResult.node,
                );
              }

              // Upload if it's a media type
              if (
                outputType &&
                ["image", "video", "audio"].includes(outputType) &&
                outputValue
              ) {
                let dataToUpload = outputValue;

                // Handle arrays (take first item)
                if (Array.isArray(dataToUpload)) {
                  console.log(
                    "[Composer] Output is array, taking first item:",
                    dataToUpload[0],
                  );
                  dataToUpload = dataToUpload[0];
                }

                // Upload if it's a data URI
                if (
                  typeof dataToUpload === "string" &&
                  dataToUpload.startsWith("data:")
                ) {
                  console.log(
                    "[Composer] Uploading data URI as example output:",
                    dataToUpload,
                  );
                  const { url } = await uploadThumb.mutateAsync({
                    base64: dataToUpload,
                    flowId: flowId,
                    folder: "examples",
                  });

                  console.log("[Composer] Uploaded thumbnail, got URL:", url);

                  await updateExampleOutput.mutateAsync({
                    flowId: flowId,
                    exampleOutputType: outputType,
                    exampleOutput: url,
                  });

                  // Fetch flows to update the store with new example output
                  refetchUserFlows();

                  console.log("[Composer] Updated flow with example output", {
                    outputType,
                    url,
                  });
                } else if (
                  typeof dataToUpload === "string" &&
                  (dataToUpload.startsWith("http://") ||
                    dataToUpload.startsWith("https://"))
                ) {
                  // Download the image and re-upload to our storage
                  console.log(
                    "[Composer] Downloading URL to re-upload as example output:",
                    dataToUpload,
                  );

                  try {
                    // Download the image
                    const response = await fetch(dataToUpload);
                    if (!response.ok) {
                      throw new Error(
                        `Failed to fetch image: ${response.statusText}`,
                      );
                    }

                    const blob = await response.blob();

                    // Convert to base64
                    const reader = new FileReader();
                    const base64 = await new Promise<string>(
                      (resolve, reject) => {
                        reader.onloadend = () =>
                          resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                      },
                    );

                    console.log(
                      "[Composer] Downloaded and converted to base64",
                    );

                    // Upload to our storage
                    const { url } = await uploadThumb.mutateAsync({
                      base64: base64,
                      flowId: flowId,
                      folder: "examples",
                    });

                    console.log("[Composer] Re-uploaded to our storage:", url);

                    await updateExampleOutput.mutateAsync({
                      flowId: flowId,
                      exampleOutputType: outputType,
                      exampleOutput: url,
                    });

                    // Fetch flows to update the store with new example output
                    refetchUserFlows();

                    console.log(
                      "[Composer] Updated flow with our hosted example output",
                      {
                        outputType,
                        originalUrl: dataToUpload,
                        hostedUrl: url,
                      },
                    );
                  } catch (err) {
                    console.error(
                      "[Composer] Failed to download/re-upload URL:",
                      err,
                    );
                    // Fallback: use the original URL if download fails
                    console.log("[Composer] Falling back to original URL");

                    await updateExampleOutput.mutateAsync({
                      flowId: flowId,
                      exampleOutputType: outputType,
                      exampleOutput: dataToUpload,
                    });

                    refetchUserFlows();
                  }
                } else {
                  console.log(
                    "[Composer] Data to upload is not a data URI or URL, skipping upload:",
                    dataToUpload,
                  );
                }
              } else {
                console.log(
                  "[Composer] Output type not media or outputValue missing, skipping upload.",
                  {
                    outputType,
                    outputValue,
                  },
                );
              }
            } else {
              console.log(
                "[Composer] No result nodes with output or flowId missing, skipping upload.",
              );
            }
          } catch (err) {
            console.error(
              "[Composer] Failed to capture/upload example output",
              err,
            );
          }

          onSuccess();
        }
        useExecutionStore.getState().completeExecution(flowId);
      } catch (err) {
        console.error(err);
        // Reset running flags on all nodes – only update UI if this flow
        // is still being viewed.
        safeSetNodes((prev: Node[]) =>
          prev.map((n) => ({ ...n, data: { ...n.data, running: false } })),
        );
        onFailed(err);
        useExecutionStore.getState().completeExecution(flowId);
        console.groupEnd();
      }
    },
    [
      incrementRuns,
      refetchUserFlows,
      onError,
      onFailed,
      onFailedWithError,
      onRateLimit,
      onStarted,
      onSuccess,
      setNodes,
      updateExampleOutput,
      uploadThumb,
    ],
  );

  return executeComposerWorkflow;
};
