import { inngest } from "../client";
import { db } from "~/server/db";
import { workflowRuns, workflows, users } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { runFalWorkflow } from "./workflow-runners/fal";
import { runReplicateWorkflow } from "./workflow-runners/replicate";

export type WorkflowEventData = {
  workflowId: number;
  userId: string;
  inputs: Record<string, any>;
  workflowTitle: string;
  provider: "fal" | "replicate";
  imageName: string;
  modelIdentifier: string; // The actual model path/identifier
  version?: string;
  creditsCharged?: number;
};

export const processWorkflow = inngest.createFunction(
  {
    id: "process-workflow",
    name: "Process Workflow",
    retries: 2,
    onFailure: async ({ error, event, step }) => {
      // Update run status to failed
      // runId is not available here since it's created within the function
      // The run failure will be handled within the function itself
    },
  },
  { event: "workflow/process" },
  async ({ event, step }) => {
    const {
      workflowId,
      userId,
      inputs,
      workflowTitle,
      provider,
      imageName,
      modelIdentifier,
      version,
      creditsCharged,
    }: {
      workflowId: number;
      userId: string;
      inputs: Record<string, any>;
      workflowTitle: string;
      provider: "fal" | "replicate";
      imageName: string;
      modelIdentifier: string;
      version?: string;
      creditsCharged: number;
    } = event.data;

    // Step 1: Check for cached results (only for database workflows)
    // const cachedResult = await step.run("check-cache", async () => {
    //   // Skip cache check for dynamic workflows (workflowId === 0)
    //   if (!workflowId || workflowId === 0) {
    //     return { found: false };
    //   }

    //   const inputsHash = createHash("sha256")
    //     .update(JSON.stringify({ workflowId, inputs }))
    //     .digest("hex");

    //   const existingRun = await db
    //     .select()
    //     .from(workflowRuns)
    //     .where(
    //       and(
    //         eq(workflowRuns.workflowId, workflowId),
    //         eq(workflowRuns.inputHash, inputsHash),
    //         eq(workflowRuns.status, "complete"),
    //       ),
    //     )
    //     .orderBy(desc(workflowRuns.ranAt))
    //     .limit(1);

    //   if (existingRun.length > 0 && existingRun[0].output) {
    //     return {
    //       found: true,
    //       output: existingRun[0].output,
    //       runId: existingRun[0].id,
    //       completedAt: existingRun[0].completedAt,
    //     };
    //   }

    //   return { found: false };
    // });

    // mismatching type, ignoring for now
    // if (cachedResult.found && "output" in cachedResult) {
    //   // Return cached result with the existing run ID
    //   return {
    //     success: true,
    //     cached: true,
    //     output: cachedResult.output,
    //     runId: cachedResult.runId,
    //     completedAt: cachedResult.completedAt,
    //   };
    // }

    // Step 2: Create run record
    const runId = await step.run("create-run", async () => {
      // For dynamic workflows, use imageName in the hash instead of workflowId
      const hashData = { workflowId, inputs };

      const inputsHash = createHash("sha256")
        .update(JSON.stringify(hashData))
        .digest("hex");

      const [newRun] = await db
        .insert(workflowRuns)
        .values({
          workflowId: workflowId,
          userId: parseInt(userId),
          provider,
          status: "processing",
          inputs,
          inputHash: inputsHash,
          eventId: event.id, // Save the Inngest event ID
          creditsCharged, // Save the credits charged for this run
        })
        .returning({ id: workflowRuns.id });

      return newRun.id;
    });

    // Step 3: Update status to running
    await step.run("update-status-running", async () => {
      await db
        .update(workflowRuns)
        .set({ status: "processing", startedAt: new Date() })
        .where(eq(workflowRuns.id, runId));
    });

    // Step 4: Execute workflow
    const result = await step.run("execute-workflow", async () => {
      try {
        if (provider === "fal") {
          return await runFalWorkflow({
            workflowTitle,
            modelName: modelIdentifier, // Use the actual model path
            inputs,
            runId,
          });
        } else {
          return await runReplicateWorkflow({
            workflowTitle,
            modelIdentifier, // Pass the model identifier
            inputData: inputs,
            version,
            runId,
          });
        }
      } catch (error: any) {
        // Update run with error
        await db
          .update(workflowRuns)
          .set({
            status: "failed",
            error: error.message || "Unknown error",
            completedAt: new Date(),
            creditsCharged: 0,
          })
          .where(eq(workflowRuns.id, runId));

        if (creditsCharged > 0) {
          await db
            .update(users)
            .set({
              creditBalance: sql`${users.creditBalance} + ${creditsCharged}`,
            })
            .where(eq(users.id, parseInt(userId)));

          console.log(
            `Refunded ${creditsCharged} credits to user ${userId} due to workflow failure`,
          );
        }

        throw error;
      }
    });

    // Step 5: Update run with results
    await step.run("update-run-complete", async () => {
      if (result.success) {
        // Store a clean output object with CDN URLs
        const outputToStore = {
          success: true,
          outputPath: result.outputPath,
          type: result.type,
          processingTime: result.processingTime,
          provider: provider,
        };

        await db
          .update(workflowRuns)
          .set({
            status: "complete",
            output: outputToStore,
            completedAt: new Date(),
          })
          .where(eq(workflowRuns.id, runId));
      } else {
        await db
          .update(workflowRuns)
          .set({
            status: "failed",
            error: result.error || "Unknown error",
            completedAt: new Date(),
          })
          .where(eq(workflowRuns.id, runId));

        // Refund credits to the user if workflow failed
        if (creditsCharged > 0) {
          await db
            .update(users)
            .set({
              creditBalance: sql`${users.creditBalance} + ${creditsCharged}`,
            })
            .where(eq(users.id, parseInt(userId)));

          console.log(
            `Refunded ${creditsCharged} credits to user ${userId} due to workflow failure`,
          );
        }
      }
    });

    return {
      success: result.success,
      output: result.success
        ? {
            success: true,
            outputPath: result.outputPath,
            type: result.type,
            processingTime: result.processingTime,
            provider: provider,
          }
        : result,
      runId,
    };
  },
);
