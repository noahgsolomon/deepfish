import {
  createTRPCRouter,
  publicProcedure,
  betaProcedure,
  withApiToken,
  protectedProcedure,
} from "~/server/api/init";
import { z } from "zod";
import {
  startReplicateWorkflow,
  getReplicateWorkflowStatus,
  uploadReplicateFile,
  searchReplicateModels,
} from "../replicate";
import { users } from "~/server/db/schema";
import { eq, sql, and } from "drizzle-orm";

export const replicateRouter = createTRPCRouter({
  startReplicateWorkflow: betaProcedure
    .use(withApiToken("replicate"))
    .input(
      z.object({
        modelVersion: z.string(),
        inputData: z.record(z.any()),
        apiToken: z.string().optional(),
        workflowTitle: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { modelVersion, inputData, workflowTitle } = input;

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
          !ctx.user.replicateApiKey || ctx.user.replicateApiKey === "";

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
        const result = await startReplicateWorkflow(
          modelVersion,
          inputData,
          ctx.apiToken ?? "",
        );

        // Return result with credit info
        return {
          ...result,
          creditDeducted,
          creditCost,
          usingOwnApiKey: ctx.user
            ? !ctx.user.replicateApiKey || ctx.user.replicateApiKey === ""
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

  getReplicateWorkflowStatus: betaProcedure
    .use(withApiToken("replicate"))
    .input(
      z.object({
        predictionId: z.string(),
        apiToken: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { predictionId } = input;
      return getReplicateWorkflowStatus(predictionId, ctx.apiToken ?? "");
    }),

  uploadReplicateFile: betaProcedure
    .use(withApiToken("replicate"))
    .input(
      z.object({
        base64Data: z.string(),
        apiToken: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { base64Data } = input;
      return uploadReplicateFile(base64Data, ctx.apiToken ?? "");
    }),

  cancelReplicatePrediction: publicProcedure
    .use(withApiToken("replicate"))
    .input(
      z.object({
        predictionId: z.string(),
        apiToken: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { predictionId } = input;
      const { cancelReplicatePrediction } = await import("../replicate");
      return cancelReplicatePrediction(predictionId, ctx.apiToken ?? "");
    }),

  searchReplicateModels: publicProcedure
    .use(withApiToken("replicate"))
    .input(
      z.object({
        query: z.string().optional(),
        page: z.number().optional(),
        apiToken: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { query, page } = input;
      return searchReplicateModels(query, page, ctx.apiToken ?? "");
    }),
});
