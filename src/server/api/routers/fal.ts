import {
  createTRPCRouter,
  betaProcedure,
  withApiToken,
  protectedProcedure,
} from "~/server/api/init";
import { z } from "zod";
import {
  startFalWorkflow,
  getFalWorkflowStatus,
  getFalWorkflowResult,
} from "../fal";
import { fal } from "@fal-ai/client";
import { users } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

async function preprocessInputsServer(
  input: Record<string, any>,
  apiKey?: string,
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

export const falRouter = createTRPCRouter({
  startFalWorkflow: betaProcedure
    .use(withApiToken("fal"))
    .input(
      z.object({
        modelName: z.string(),
        inputData: z.record(z.any()),
        apiToken: z.string().optional(),
        workflowTitle: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { modelName, inputData, workflowTitle } = input;

      // Get workflow to check credit cost
      const workflow = await ctx.db.query.workflows.findFirst({
        where: (w, { eq, sql }) =>
          eq(sql`lower(${w.title})`, workflowTitle.toLowerCase()),
        columns: { creditCost: true },
      });

      // If not in global workflows, check user workflows
      let creditCost = 1; // default
      if (workflow) {
        creditCost = workflow.creditCost;
      } else if (ctx.user) {
        const userWorkflow = await ctx.db.query.userWorkflows.findFirst({
          where: (uw, { eq, and, sql }) =>
            and(
              eq(uw.userId, ctx.user!.id),
              eq(sql`lower(${uw.title})`, workflowTitle.toLowerCase()),
            ),
          columns: { creditCost: true },
        });
        if (userWorkflow) {
          creditCost = userWorkflow.creditCost;
        }
      }

      // Deduct credits if user is authenticated
      let creditDeducted = false;
      if (ctx.user) {
        // Only deduct credits if using platform's API key (not user's own)
        const isUsingPlatformKey =
          !ctx.user.falApiKey || ctx.user.falApiKey === "";

        if (isUsingPlatformKey) {
          // Check and deduct credits
          const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.user.id),
            columns: { creditBalance: true },
          });

          if (!user) {
            throw new Error("User not found");
          }

          if (user.creditBalance < creditCost) {
            throw new Error(
              `Insufficient credits. You have ${user.creditBalance} credits but need ${creditCost} credits to run this workflow.`,
            );
          }

          // Deduct credits
          await ctx.db
            .update(users)
            .set({
              creditBalance: sql`${users.creditBalance} - ${creditCost}`,
            })
            .where(eq(users.id, ctx.user.id));

          creditDeducted = true;
        }
      }

      try {
        const processed = await preprocessInputsServer(inputData, ctx.apiToken);
        const result = await startFalWorkflow(
          modelName,
          processed,
          ctx.apiToken ?? "",
        );

        // Return result with credit info
        return {
          ...result,
          creditDeducted,
          creditCost,
          usingOwnApiKey: ctx.user
            ? !ctx.user.falApiKey || ctx.user.falApiKey === ""
              ? false
              : true
            : false,
        };
      } catch (error) {
        // If workflow fails and credits were deducted, refund them
        if (creditDeducted && ctx.user) {
          await ctx.db
            .update(users)
            .set({
              creditBalance: sql`${users.creditBalance} + ${creditCost}`,
            })
            .where(eq(users.id, ctx.user.id));
        }
        throw error;
      }
    }),

  getFalWorkflowStatus: betaProcedure
    .use(withApiToken("fal"))
    .input(
      z.object({
        modelName: z.string(),
        requestId: z.string(),
        apiToken: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { modelName, requestId } = input;
      return getFalWorkflowStatus(modelName, requestId, ctx.apiToken ?? "");
    }),

  getFalWorkflowResult: betaProcedure
    .use(withApiToken("fal"))
    .input(
      z.object({
        modelName: z.string(),
        requestId: z.string(),
        apiToken: z.string().optional(),
        processingTime: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { modelName, requestId, processingTime } = input;
      return getFalWorkflowResult(
        modelName,
        requestId,
        ctx.apiToken ?? "",
        processingTime,
      );
    }),
});
