import { db } from "~/server/db";
import { workflowRuns } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import {
  startFalWorkflow,
  getFalWorkflowStatus,
  getFalWorkflowResult,
} from "~/server/api/fal";
import { fal } from "@fal-ai/client";
import { uploadOutputsToStorage } from "~/server/api/storage";

// Helper function to preprocess inputs (upload data URIs)
async function preprocessInputs(
  input: Record<string, any>,
  apiKey: string,
): Promise<Record<string, any>> {
  if (!apiKey) return input;

  fal.config({ credentials: apiKey });
  const out: Record<string, any> = {};

  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.startsWith("data:")) {
      try {
        const [mimePart, dataPart] = v.split(",", 2);
        const mimeType = mimePart.replace(/^data:/, "").replace(/;base64$/, "");
        const buf = Buffer.from(dataPart, "base64");
        const file = new File(
          [buf],
          `file-${Date.now()}.${mimeType.split("/")[1] || "bin"}`,
          { type: mimeType },
        );
        const url = await fal.storage.upload(file);
        out[k] = url;
      } catch {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function runFalWorkflow({
  workflowTitle,
  modelName,
  inputs,
  runId,
}: {
  workflowTitle: string;
  modelName: string; // The actual FAL model path (e.g., "fal-ai/flux/schnell")
  inputs: Record<string, any>;
  runId: number;
}): Promise<{
  success: boolean;
  outputPath?: string | string[];
  output?: any;
  type?: "image" | "video" | "text" | "3d" | "audio";
  processingTime?: number;
  error?: string;
  requestId?: string;
}> {
  const startTime = Date.now();
  let requestId: string | undefined;
  const apiToken = process.env.FAL_API_KEY!;

  try {
    // Update run with request started
    await db
      .update(workflowRuns)
      .set({
        status: "processing",
        startedAt: new Date(),
      })
      .where(eq(workflowRuns.id, runId));

    // Preprocess inputs (upload data URIs)
    const processedInputs = await preprocessInputs(inputs, apiToken);

    // Start the FAL workflow with the correct model path
    const startResult = await startFalWorkflow(
      modelName,
      processedInputs,
      apiToken,
    );
    requestId = startResult.requestId;

    // Store request ID in output temporarily for tracking
    await db
      .update(workflowRuns)
      .set({
        output: { requestId, provider: "fal", status: startResult.status },
      })
      .where(eq(workflowRuns.id, runId));

    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes with 1s intervals

    while (!completed && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResult = await getFalWorkflowStatus(
        modelName,
        requestId,
        apiToken,
      );

      if (statusResult.completed) {
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
              requestId,
              provider: "fal",
              status: statusResult.status,
              progress,
            },
          })
          .where(eq(workflowRuns.id, runId));
      }
    }

    if (!completed) {
      throw new Error("Workflow timed out");
    }

    // Get the final result
    const processingTime = Date.now() - startTime;
    const result = await getFalWorkflowResult(
      modelName,
      requestId,
      apiToken,
      processingTime,
    );

    if (result.success) {
      // Handle array of images
      let outputPath: string | string[] | undefined;
      if (result.outputUrl) {
        outputPath = result.outputUrl;
      } else if (result.result?.images && Array.isArray(result.result.images)) {
        outputPath = result.result.images.map((img: any) => img.url || img);
      } else if (result.result) {
        outputPath = result.result;
      }

      // Upload output to our CDN
      const outputType = result.type || "image";
      let cdnUrl = outputPath;

      if (outputPath) {
        try {
          console.log(`[FAL] Uploading output to CDN for ${workflowTitle}`);
          cdnUrl = await uploadOutputsToStorage(
            outputPath,
            workflowTitle,
            outputType,
          );
          console.log(`[FAL] Successfully uploaded to CDN:`, cdnUrl);
        } catch (error) {
          console.error(
            `[FAL] Failed to upload to CDN, using original URL:`,
            error,
          );
          // Continue with original URL if upload fails
        }
      }

      return {
        success: true,
        outputPath: cdnUrl,
        type: outputType,
        processingTime: result.processingTime,
        requestId,
      };
    } else {
      throw new Error(result.error || "Failed to get workflow result");
    }
  } catch (error: any) {
    console.error(`[FAL Workflow Error] ${workflowTitle}:`, error);

    return {
      success: false,
      error: error.message || "Unknown error occurred",
      requestId,
    };
  }
}
