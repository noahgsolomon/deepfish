import { db } from "~/server/db";
import { workflowRuns } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import {
  startReplicateWorkflow,
  getReplicateWorkflowStatus,
  uploadReplicateFile,
} from "~/server/api/replicate";
import { uploadOutputsToStorage } from "~/server/api/storage";

export async function runReplicateWorkflow({
  workflowTitle,
  modelIdentifier,
  inputData,
  version,
  runId,
}: {
  workflowTitle: string;
  modelIdentifier: string; // The model identifier (e.g., "owner/model-name")
  inputData: Record<string, any>;
  version?: string;
  runId: number;
}): Promise<{
  success: boolean;
  outputPath?: string | string[];
  type?: "image" | "video" | "text" | "3d";
  processingTime?: number;
  error?: string;
  predictionId?: string;
}> {
  const startTime = Date.now();
  let predictionId: string | undefined;
  const apiToken = process.env.REPLICATE_API_TOKEN!;

  try {
    // Update run with request started
    await db
      .update(workflowRuns)
      .set({
        status: "processing",
        startedAt: new Date(),
      })
      .where(eq(workflowRuns.id, runId));

    // Prepare inputs - handle file uploads if needed
    const processedInputs: Record<string, any> = {};

    for (const [key, value] of Object.entries(inputData)) {
      if (typeof value === "string" && value.startsWith("data:")) {
        // Handle base64 data URLs - upload to Replicate
        const base64Data = value.split(",")[1];
        const uploadedUrl = await uploadReplicateFile(base64Data, apiToken);
        processedInputs[key] = uploadedUrl;
      } else {
        processedInputs[key] = value;
      }
    }

    // Start the Replicate workflow
    // If we have a version, use it directly. Otherwise, Replicate will use the latest version
    const modelVersion = version || "";
    const startResult = await startReplicateWorkflow(
      modelVersion,
      processedInputs,
      apiToken,
    );
    predictionId = startResult.predictionId;

    // Update run with prediction ID
    await db
      .update(workflowRuns)
      .set({
        output: {
          predictionId,
          provider: "replicate",
          status: startResult.status,
        },
      })
      .where(eq(workflowRuns.id, runId));

    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes with 1s intervals
    let finalStatus: any;

    while (!completed && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResult = await getReplicateWorkflowStatus(
        predictionId,
        apiToken,
      );
      finalStatus = statusResult;

      if (
        statusResult.status === "succeeded" ||
        statusResult.status === "failed" ||
        statusResult.status === "canceled"
      ) {
        completed = true;
        break;
      }

      attempts++;

      // Update progress periodically
      if (attempts % 5 === 0) {
        const progress = Math.min(50 + (attempts / maxAttempts) * 40, 90);
        await db
          .update(workflowRuns)
          .set({
            output: {
              predictionId,
              provider: "replicate",
              status: statusResult.status,
              progress,
              logs: statusResult.logs,
            },
          })
          .where(eq(workflowRuns.id, runId));
      }
    }

    if (!completed) {
      throw new Error("Workflow timed out");
    }

    const processingTime = Date.now() - startTime;

    // Check final status
    if (finalStatus.status === "succeeded") {
      // Upload output to our CDN
      const outputType = finalStatus.type || "image";
      let cdnUrl = finalStatus.outputUrl;

      try {
        console.log(`[Replicate] Uploading output to CDN for ${workflowTitle}`);
        cdnUrl = await uploadOutputsToStorage(
          finalStatus.outputUrl,
          workflowTitle,
          outputType,
        );
        console.log(`[Replicate] Successfully uploaded to CDN: ${cdnUrl}`);
      } catch (error) {
        console.error(
          `[Replicate] Failed to upload to CDN, using original URL:`,
          error,
        );
        // Continue with original URL if upload fails
      }

      console.log("RECPLICATE CDN URL", cdnUrl);

      return {
        success: true,
        outputPath: cdnUrl,
        type: outputType,
        processingTime,
        predictionId,
      };
    } else if (finalStatus.status === "canceled") {
      return {
        success: false,
        error: "Workflow was canceled",
        predictionId,
      };
    } else {
      return {
        success: false,
        error: finalStatus.error || "Workflow failed",
        predictionId,
      };
    }
  } catch (error: any) {
    console.error(`[Replicate Workflow Error] ${workflowTitle}:`, error);

    return {
      success: false,
      error: error.message || "Unknown error occurred",
      predictionId,
    };
  }
}
