// import { useQueueStore } from "../store/use-queue-store";
import { vanillaApi } from "./trpc/vanilla";
import { upload as uploadToBlob } from "@vercel/blob/client";

export async function uploadOutputToStorageClient(
  outputUrl: string,
  workflowName: string,
  outputType: string,
): Promise<string> {
  try {
    console.log(`Uploading output to storage: ${outputUrl}`);

    // Download the file from the original URL
    const response = await fetch(outputUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch output: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Get content type from blob or map from outputType
    let contentType = blob.type || "application/octet-stream";

    // If blob type is empty, try to determine from outputType
    if (!blob.type || blob.type === "application/octet-stream") {
      switch (outputType) {
        case "image":
          contentType = "image/png"; // Default to PNG for images
          break;
        case "video":
          contentType = "video/mp4"; // Default to MP4 for videos
          break;
        case "audio":
          contentType = "audio/mpeg"; // Default to MP3 for audio
          break;
        case "3d":
          contentType = "model/gltf-binary"; // Default for 3D models
          break;
      }
    }

    // Upload blob directly to Vercel Blob
    const fileName = `${workflowName}-${Date.now()}`;
    const put = await uploadToBlob(fileName, blob, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
    });

    console.log("Successfully uploaded output to CDN:", put.url);
    return put.url;
  } catch (err) {
    console.error("Failed to upload output to storage:", err);
    // Fallback to original URL
    console.log("Falling back to original URL:", outputUrl);
    return outputUrl;
  }
}

// Helper to handle array outputs on the client side
export async function uploadOutputsToStorageClient(
  outputs: string | string[],
  workflowName: string,
  outputType: string,
): Promise<string | string[]> {
  if (Array.isArray(outputs)) {
    console.log(`Uploading ${outputs.length} outputs to storage...`);
    const uploadedUrls = await Promise.all(
      outputs.map((url) =>
        uploadOutputToStorageClient(url, workflowName, outputType),
      ),
    );
    return uploadedUrls;
  } else {
    return uploadOutputToStorageClient(outputs, workflowName, outputType);
  }
}

// Utility: prettify Replicate API error strings
function prettifyError(err: any): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") {
    // Try to extract JSON payload
    const firstBrace = err.indexOf("{");
    if (firstBrace !== -1) {
      const jsonPart = err.slice(firstBrace);
      try {
        const obj = JSON.parse(jsonPart);
        // Prioritise invalid_fields descriptions
        if (Array.isArray(obj.invalid_fields) && obj.invalid_fields.length) {
          return obj.invalid_fields
            .map((f: any) => `${f.field}: ${f.description}`)
            .join("; ");
        }
        if (obj.detail) return String(obj.detail).trim();
        if (obj.title) return String(obj.title).trim();
      } catch (_) {
        /* fall through */
      }
    }
    // Fallback – strip leading label like "API error (422 ...):"
    const colon = err.indexOf(":");
    if (colon !== -1) return err.slice(colon + 1).trim();
    return err.trim();
  }
  if (err.message) return err.message;
  return String(err);
}

const isHttpUrl = (s: string) =>
  s.startsWith("http://") || s.startsWith("https://");

async function normalizeInputValues(value: any): Promise<any> {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => normalizeInputValues(v)));
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await normalizeInputValues(v),
      ]),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

async function uploadDataUri({
  dataUri,
}: {
  dataUri: string;
}): Promise<string | null> {
  try {
    const [_, b64] = dataUri.split(",", 2);

    const url: string = await vanillaApi.replicate.uploadReplicateFile.mutate({
      base64Data: b64,
    });

    return url;
  } catch (err) {
    console.error("Upload failed", err);
    return null;
  }
}

async function processSingleHosted({ val }: { val: string }): Promise<string> {
  if (isHttpUrl(val)) return val;

  // ensure data URI
  let dataUri = val;
  if (!val.startsWith("data:")) {
    const rawPath = val.startsWith("@") ? val.slice(1) : val;
    dataUri = await fetch(rawPath).then((r) => r.text());
  }

  const hosted = await uploadDataUri({ dataUri });
  return hosted ?? val;
}

async function ensureHostedInputs({
  schemaProps,
  inputs,
}: {
  schemaProps: Record<string, any>;
  inputs: Record<string, any>;
}): Promise<Record<string, any>> {
  const out = { ...inputs };
  for (const [key, prop] of Object.entries(schemaProps)) {
    if (prop?.hosted_only === true) {
      const v = out[key];
      if (!v) continue;
      if (Array.isArray(v)) {
        out[key] = await Promise.all(
          v.map((item) => processSingleHosted({ val: item })),
        );
      } else if (typeof v === "string") {
        out[key] = await processSingleHosted({ val: v });
      }
    }
  }
  return out;
}

export async function cancelReplicatePrediction({
  predictionId,
  workflowTitle,
}: {
  predictionId: string;
  workflowTitle: string;
}): Promise<boolean> {
  try {
    // Call backend tRPC mutation to cancel prediction regardless of environment
    const result = await vanillaApi.replicate.cancelReplicatePrediction.mutate({
      predictionId,
    });

    if (result.success) {
      return true;
    }
    return false;
  } catch (error: any) {
    console.error("Error canceling Replicate prediction:", error);
    return false;
  }
}

// ----------------------------------------------
// Queue Management Helpers
// ----------------------------------------------
function createQueueEntry(
  workflowName: string,
  inputData: Record<string, any>,
) {
  // const { addToQueue, startProcessing } = useQueueStore.getState();

  // Build a simple text prompt from inputs (exclude data URIs)
  const promptText = Object.entries(inputData)
    .filter(
      ([_, value]) => typeof value === "string" && !value.startsWith("data:"),
    )
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  // const queueId = addToQueue({
  //   workflowName,
  //   inputPrompt: promptText,
  //   imageName: workflowName,
  // });

  // startProcessing(queueId);
  // return queueId;
}

// ----------------------------------------------
// Workflow Preparation Helpers
// ----------------------------------------------
function autoWrapArrayInputs(
  schemaProps: Record<string, any>,
  inputs: Record<string, any>,
): Record<string, any> {
  const out = { ...inputs };
  for (const [key, prop] of Object.entries(schemaProps)) {
    const shouldBeArray = prop.type === "array" || Array.isArray(prop.default);

    if (shouldBeArray) {
      const cur = out[key];
      if (cur !== undefined && !Array.isArray(cur)) {
        out[key] = [cur];
      }
    }
  }
  return out;
}

async function prepareWorkflowInputs({
  workflow,
  inputData,
}: {
  workflow: any;
  inputData: Record<string, any>;
}) {
  let preparedInputs = await normalizeInputValues(inputData);
  preparedInputs = await ensureHostedInputs({
    schemaProps: workflow.schema?.Input?.properties ?? {},
    inputs: preparedInputs,
  });
  preparedInputs = autoWrapArrayInputs(
    workflow.schema?.Input?.properties ?? {},
    preparedInputs,
  );

  return preparedInputs;
}

// ----------------------------------------------
// Polling Helper
// ----------------------------------------------
async function pollPredictionStatus({
  predictionId,
  maxPolls = 300,
}: {
  predictionId: string;
  maxPolls?: number;
}) {
  // const { updateProgress: updateQueueProgress } = useQueueStore.getState();

  let pollCount = 0;
  let statusResult: any;

  while (pollCount < maxPolls) {
    if (pollCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    try {
      statusResult =
        await vanillaApi.replicate.getReplicateWorkflowStatus.query({
          predictionId,
        });

      if (statusResult.status === "processing") {
        const estimatedProgress = Math.min(10 + pollCount * 2, 90);
        // updateQueueProgress(queueId, estimatedProgress);
      }

      if (
        statusResult.status === "succeeded" ||
        statusResult.status === "failed" ||
        statusResult.status === "canceled"
      ) {
        break;
      }
    } catch (error: any) {}

    pollCount++;
  }

  if (pollCount >= maxPolls) {
    throw new Error("Prediction timed out after 10 minutes");
  }

  return statusResult;
}

// ----------------------------------------------
// Output Processing Helpers
// ----------------------------------------------
async function processTextOutput(
  workflowTitle: string,
  output: string,
  processingTime: number,
) {
  // const { updateProgress: updateQueueProgress, removeFromQueue } =
  //   useQueueStore.getState();

  // updateQueueProgress(queueId, 100);
  // removeFromQueue(queueId);

  return {
    success: true,
    type: "text" as const,
    processingTime,
    outputPath: output,
  };
}

async function processMediaOutput(
  workflowTitle: string,
  workflowName: string,
  outputUrl: string | string[],
  outputType: "image" | "video" | "3d" | "audio",
  processingTime: number,
) {
  const hostedUrl = await uploadOutputsToStorageClient(
    outputUrl,
    workflowName,
    outputType,
  );

  return hostedUrl;
}

// Now the main function becomes much cleaner:
export async function runReplicateWorkflow({
  workflowName,
  workflowTitle,
  inputData,
}: {
  workflowName: string;
  workflowTitle: string;
  inputData: Record<string, any>;
}): Promise<{
  success: boolean;
  outputPath?: string | string[];
  type?: "image" | "video" | "text" | "3d";
  processingTime?: number;
  error?: string;
  predictionId?: string;
}> {
  try {
    // Increment runs via TRPC mutation
    await vanillaApi.workflow.incrementRuns.mutate({
      workflowName: workflowTitle,
    });
  } catch (error) {
    console.error("Failed to increment runs:", error);
  }

  // const { removeFromQueue } = useQueueStore.getState();

  // 1. Setup queue
  // const queueId = createQueueEntry(workflowName, inputData);

  try {
    // 2. Find workflow configuration via TRPC
    const workflowResponse = await vanillaApi.workflow.getWorkflowByTitle.query(
      {
        title: workflowTitle,
      },
    );

    if (!workflowResponse) {
      throw new Error(`Workflow not found: ${workflowTitle}`);
    }

    const workflow = workflowResponse.data;

    // 4. Prepare inputs
    const preparedInputs = await prepareWorkflowInputs({
      workflow,
      inputData,
    });

    const startResult =
      await vanillaApi.replicate.startReplicateWorkflow.mutate({
        modelVersion: workflow.version ?? "1",
        inputData: preparedInputs,
        workflowTitle,
      });

    const predictionId = startResult.predictionId;

    window.dispatchEvent(
      new CustomEvent("prediction_created", {
        detail: {
          prediction_id: predictionId,
          workflow_name: workflowName,
        },
      }),
    );

    // 6. Poll for completion
    const statusResult = await pollPredictionStatus({
      predictionId,
      maxPolls: 300,
    });

    // 7. Process result
    const processingTime = statusResult.metrics?.predict_time || 0;

    if (statusResult.status === "canceled") {
      // Clean up queue/state then return cancellation result
      // removeFromQueue(queueId);
      return {
        success: false,
        error: "canceled",
        predictionId,
      } as any;
    }

    if (statusResult.status !== "succeeded") {
      throw new Error(statusResult.error || "Prediction failed");
    }

    // 8. Handle output based on type
    let result;

    if (statusResult.type === "text" || statusResult.output) {
      result = await processTextOutput(
        workflowTitle,
        statusResult.output ?? "",
        processingTime,
      );
    } else if (statusResult.outputUrl) {
      const outputPath = await processMediaOutput(
        workflowTitle,
        workflowName,
        statusResult.outputUrl,
        statusResult.type || "image",
        processingTime,
      );

      // removeFromQueue(queueId);

      result = {
        success: true,
        outputPath,
        type: statusResult.type || "image",
        processingTime,
        predictionId,
      };
    } else {
      throw new Error("No output returned from prediction");
    }

    // 9. History is now handled by database workflow runs
    // No need to save to local storage anymore

    return result;
  } catch (error: any) {
    // Error handling
    const errorMessage = prettifyError(error);
    console.error("Error in runReplicateWorkflow:", error);

    // removeFromQueue(queueId);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
