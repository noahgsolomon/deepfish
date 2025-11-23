// import { useQueueStore } from "~/store/use-queue-store";
import { vanillaApi } from "./trpc/vanilla";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { WorkflowInfo } from "~/server/db/schema";

const cancelledRequests = new Set<string>();

export function cancelFalRequest(requestId: string) {
  cancelledRequests.add(requestId);
}

export async function runFalWorkflow({
  workflow,
  inputData,
}: {
  workflow: WorkflowInfo;
  inputData: Record<string, any>;
}): Promise<{
  success: boolean;
  outputPath?: string;
  output?: string;
  type?: "image" | "video" | "text" | "3d" | "audio";
  processingTime?: number;
  error?: string;
  requestId?: string;
}> {
  try {
    // Increment runs via TRPC mutation
    await vanillaApi.workflow.incrementRuns.mutate({
      workflowName: workflow.title,
    });
  } catch (error) {
    console.error("Failed to increment runs:", error);
  }

  // -------------------------------------------------------
  // Queue integration – show FAL API executions in queue
  // -------------------------------------------------------
  // const {
  //   addToQueue,
  //   startProcessing,
  //   updateProgress: updateQueueProgress,
  //   removeFromQueue,
  // } = useQueueStore.getState();

  const promptText = Object.entries(inputData)
    .filter(
      ([_, value]) => typeof value === "string" && !value.startsWith("data:"),
    )
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  // const queueId = addToQueue({
  //   workflowName: workflow.imageName,
  //   inputPrompt: promptText,
  //   imageName: workflow.imageName,
  // });

  // startProcessing(queueId);

  try {
    // For FAL models, the image field contains the model name/path
    const modelName = workflow.image;

    if (!modelName) {
      throw new Error(`Model not found for workflow: ${workflow.imageName}`);
    }
    // updateQueueProgress(queueId, 0);

    const startTime = Date.now();

    // updateQueueProgress(queueId, 10);

    // Step 1: Start the FAL workflow and get request ID
    const startResult = await vanillaApi.fal.startFalWorkflow.mutate({
      modelName,
      inputData,
      workflowTitle: workflow.title,
    });

    const requestId = startResult.requestId;

    // Emit event for UI components that listen to request creation
    window.dispatchEvent(
      new CustomEvent("fal_request_created", {
        detail: {
          request_id: requestId,
          workflow_name: workflow.imageName,
        },
      }),
    );

    // Step 2: Poll for status until complete
    let pollCount = 0;
    let statusResult: any = { completed: false };
    const maxPolls = 120; // 10 minutes max (5s intervals)

    while (
      !statusResult.completed &&
      pollCount < maxPolls &&
      !cancelledRequests.has(requestId)
    ) {
      // Wait before polling (except first time)
      if (pollCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      try {
        statusResult = await vanillaApi.fal.getFalWorkflowStatus.query({
          modelName,
          requestId,
        });

        // Update progress
        const progress = 10 + Math.min(pollCount * 1.5, 80);
        // updateQueueProgress(queueId, progress);

        // Emit progress event
        window.dispatchEvent(
          new CustomEvent("fal_request_progress", {
            detail: {
              request_id: requestId,
              workflow_name: workflow.imageName,
              status: statusResult.status,
              progress: progress,
            },
          }),
        );
      } catch (error: any) {}

      pollCount++;
    }

    // Check if cancelled
    if (cancelledRequests.has(requestId)) {
      cancelledRequests.delete(requestId);
      // removeFromQueue(queueId);
      return {
        success: false,
        error: "canceled",
        requestId,
      };
    }

    if (!statusResult.completed) {
      throw new Error("Request timed out after 5 minutes");
    }

    // Step 3: Get the final result
    // updateQueueProgress(queueId, 90);

    const processingTime = (Date.now() - startTime) / 1000;
    const falResult = await vanillaApi.fal.getFalWorkflowResult.query({
      modelName,
      requestId,
      processingTime,
    });

    if (!falResult.success) {
      const errorMessage = falResult.error || "Unknown error occurred";
      // removeFromQueue(queueId);
      return {
        success: false,
        error: errorMessage,
        requestId: falResult.requestId,
      };
    }

    // Debug the output URL
    console.log("Output URL from result:", falResult.outputUrl);
    console.log("Raw result data:", falResult.result);

    // Check if we need to extract URL from audio_file structure
    if (
      !falResult.outputUrl &&
      falResult.result &&
      falResult.result.audio_file &&
      falResult.result.audio_file.url
    ) {
      falResult.outputUrl = falResult.result.audio_file.url;
      console.log("Extracted output URL from audio_file:", falResult.outputUrl);
    }

    // Check again after potential extraction
    if (!falResult.outputUrl) {
      console.log("Full response with no URL:", falResult);
      // removeFromQueue(queueId);
      return {
        success: false,
        error: "No output URL found in the response",
        requestId: falResult.requestId,
      };
    }

    // Process result
    const outputUrl = falResult.outputUrl;

    // Upload to our storage first
    const hostedUrl = await uploadOutputToStorage(
      outputUrl,
      workflow.imageName,
      falResult.type || workflow.outputType,
    );

    // updateQueueProgress(queueId, 100);

    // removeFromQueue(queueId);
    return {
      success: true,
      outputPath: hostedUrl as string,
      output: hostedUrl as string,
      type:
        falResult.type ||
        (workflow.outputType as "image" | "video" | "text" | "3d" | "audio"),
      processingTime: falResult.processingTime,
      requestId: falResult.requestId,
    };
  } catch (error: any) {
    console.error("Error in runFalWorkflow:", error);

    if (error.stack) {
      console.error(error.stack);
    }

    // removeFromQueue(queueId);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

// Helper to upload output to storage
async function uploadOutputToStorage(
  outputUrl: string | string[],
  workflowName: string,
  outputType: string,
): Promise<string | string[]> {
  if (Array.isArray(outputUrl)) {
    const uploadedUrls = await Promise.all(
      outputUrl.map((url) =>
        uploadSingleOutputToStorage(url, workflowName, outputType),
      ),
    );
    return uploadedUrls;
  } else {
    return uploadSingleOutputToStorage(outputUrl, workflowName, outputType);
  }
}

async function uploadSingleOutputToStorage(
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

function getPromptFromInputData(inputData: Record<string, any>): string {
  if (inputData.prompt) {
    return inputData.prompt;
  }

  const keys = Object.keys(inputData);

  for (const key of ["input", "description", "text", "query"]) {
    if (inputData[key] && typeof inputData[key] === "string") {
      return inputData[key];
    }
  }

  const inputSummary = keys
    .map((key) => {
      const value = inputData[key];
      // Skip undefined or null values to avoid JSON.stringify issues
      if (value === undefined || value === null) {
        return `${key}: [empty]`;
      }
      if (typeof value === "string" && value.startsWith("http")) {
        return `${key}: [file]`;
      }
      // Safely stringify the value
      let stringified: string;
      try {
        stringified = JSON.stringify(value);
      } catch {
        stringified = String(value);
      }
      return `${key}: ${stringified.substring(0, 30)}${
        stringified.length > 30 ? "..." : ""
      }`;
    })
    .join(", ");

  return inputSummary.length > 100
    ? `${inputSummary.substring(0, 97)}...`
    : inputSummary;
}
