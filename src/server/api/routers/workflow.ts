import {
  createTRPCRouter,
  protectedProcedure,
  betaProcedure,
  publicProcedure,
  withApiToken,
  maybeAuthedProcedure,
} from "~/server/api/init";
import { z } from "zod";
import {
  userWorkflows,
  workflows as globalWorkflows,
  workflowRuns,
  users,
  lower,
  WorkflowInfo,
  WorkflowData,
} from "~/server/db/schema";
import { eq, and, sql, AnyColumn, desc } from "drizzle-orm";
import { fetchReplicateWorkflow } from "../replicate";
import { fetchFalWorkflow } from "../fal";
import { TRPCError } from "@trpc/server";
import { inngest } from "~/inngest/client";
import { getRuns, extractRunIdFromOutput } from "../inngest-utils";

const increment = (column: AnyColumn, value = 1) => {
  return sql`${column} + ${value}`;
};

export const workflowRouter = createTRPCRouter({
  getWorkflowBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("getWorkflowBySlug", input.slug);
      const workflow = await ctx.db.query.workflows.findFirst({
        where: (w, { eq }) => eq(lower(w.title), input.slug.toLowerCase()),
      });

      if (!workflow) {
        console.log("no workflow found");
        return null;
      }

      return {
        ...workflow,
        data: workflow.data as WorkflowInfo,
      };
    }),

  getWorkflowByTitle: publicProcedure
    .input(z.object({ title: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.db.query.workflows.findFirst({
        where: (w, { eq }) => eq(lower(w.title), input.title.toLowerCase()),
      });

      if (!workflow) {
        return null;
      }

      return {
        ...workflow,
        data: workflow.data as WorkflowInfo,
      };
    }),

  loadFeaturedWorkflows: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.workflows.findMany({
      where: (w, { eq }) => eq(w.featured, true),
      orderBy: (w, { desc }) => [desc(w.runs)],
    });
  }),

  getAllWorkflows: publicProcedure
    .input(
      z.object({
        featured: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause =
        input.featured !== undefined
          ? eq(globalWorkflows.featured, input.featured)
          : undefined;

      const workflows = await ctx.db.query.workflows.findMany({
        where: whereClause,
        orderBy: (w, { desc }) => [desc(w.featured), desc(w.runs)],
      });

      const total = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(globalWorkflows)
        .where(whereClause);

      return {
        workflows,
        total: total[0]?.count ?? 0,
      };
    }),

  getAllWorkflowSlugs: publicProcedure.query(async ({ ctx }) => {
    const workflows = await ctx.db.query.workflows.findMany({
      columns: {
        title: true,
      },
      orderBy: (w, { desc }) => [desc(w.featured), desc(w.runs)],
    });

    return workflows.map((workflow) => ({
      slug: workflow.title.toLowerCase(),
    }));
  }),

  getUserPublicWorkflows: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.userWorkflows.findMany({
        where: (uw, { eq }) => eq(uw.userId, input),
      });
    }),

  getUserWorkflows: betaProcedure.query(async ({ ctx }) => {
    return ctx.db.query.userWorkflows.findMany({
      where: (uw, { eq }) => eq(uw.userId, ctx.user.id),
    });
  }),

  addUserWorkflow: betaProcedure
    .input(
      z.object({
        workflowUrl: z.string().min(1),
        apiKey: z.string().optional().default(""),
        workflowDefinition: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { workflowUrl, apiKey, workflowDefinition } = input;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authorized",
      });

      let token = apiKey;
      if (!token) {
        if (workflowUrl.includes("replicate.com")) {
          token = process.env.REPLICATE_API_TOKEN || "";
        }
        if (workflowUrl.includes("fal.ai")) {
          token = process.env.FAL_API_KEY || "";
        }
      }

      if (!token) {
        throw new Error("No API key found");
      }

      const upsertGlobal = async (def: any) => {
        try {
          await ctx.db
            .insert(globalWorkflows)
            .values({ title: def.title, data: def })
            .onConflictDoUpdate({
              target: globalWorkflows.title,
              set: { data: def, updatedAt: new Date() },
            });
        } catch (e) {
          console.error(
            "[addUserWorkflow] Failed to upsert global workflow",
            e,
          );
        }
      };

      console.log("user email", ctx.user?.email);
      console.log(
        "does user email include support@deepfi.sh",
        ctx.user?.email?.includes("support@deepfi.sh"),
      );

      // LOCAL definition path
      if (workflowUrl.startsWith("local://") && workflowDefinition) {
        await ctx.db
          .insert(userWorkflows)
          .values({
            userId: ctx.user?.id!,
            title: workflowDefinition.title ?? "unnamed",
            data: workflowDefinition,
          })
          .onConflictDoUpdate({
            target: [userWorkflows.userId, userWorkflows.title],
            set: { data: workflowDefinition, updatedAt: new Date() },
          });

        if (ctx.user?.email?.includes("support@deepfi.sh")) {
          await upsertGlobal(workflowDefinition);
        }
        return { ok: true };
      }

      if (workflowUrl.includes("replicate.com")) {
        const def = await fetchReplicateWorkflow(workflowUrl, token);

        await ctx.db
          .insert(userWorkflows)
          .values({
            userId: ctx.user?.id!,
            title: def.title,
            data: def,
          })
          .onConflictDoUpdate({
            target: [userWorkflows.userId, userWorkflows.title],
            set: { data: def, updatedAt: new Date() },
          });

        if (ctx.user?.email?.includes("support@deepfi.sh")) {
          await upsertGlobal(def);
        }

        return { ok: true, data: def };
      }

      if (workflowUrl.includes("fal.ai")) {
        const def = await fetchFalWorkflow(workflowUrl, token);

        await ctx.db
          .insert(userWorkflows)
          .values({
            userId: ctx.user?.id!,
            title: def.title,
            data: def,
          })
          .onConflictDoUpdate({
            target: [userWorkflows.userId, userWorkflows.title],
            set: { data: def, updatedAt: new Date() },
          });

        if (ctx.user?.email?.includes("support@deepfi.sh")) {
          await upsertGlobal(def);
        }

        return { ok: true, data: def };
      }

      throw new Error(
        "Unsupported URL format. Only Replicate and FAL models are currently supported.",
      );
    }),

  /* Increment run counter for a workflow (global + user rows) */
  incrementRuns: publicProcedure
    .input(z.object({ workflowName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { workflowName } = input;

      // Increment global workflow run counter
      await ctx.db
        .update(globalWorkflows)
        .set({ runs: increment(globalWorkflows.runs, 1) })
        .where(eq(globalWorkflows.title, workflowName));

      // Increment user-scoped run counter if row exists for current user
      if (ctx.user) {
        await ctx.db
          .update(userWorkflows)
          .set({ runs: increment(userWorkflows.runs, 1) })
          .where(
            and(
              eq(userWorkflows.userId, ctx.user.id),
              eq(userWorkflows.title, workflowName),
            ),
          );
      }

      return { ok: true };
    }),

  /* -------------------------------------------
   *  Admin-only endpoint to add / update a global workflow
   * ------------------------------------------- */
  addWorkflow: betaProcedure
    .input(
      z.object({
        workflowUrl: z.string().min(1),
        apiKey: z.string().optional().default(""),
        workflowDefinition: z.any().optional(),
      }),
    )
    .use(
      withApiToken((raw) => {
        if (typeof raw === "object" && raw?.workflowUrl?.includes("fal.ai")) {
          return "fal";
        }
        return "replicate";
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.email !== "support@deepfi.sh") {
        throw new Error("Not authorised");
      }

      const { workflowUrl, apiKey, workflowDefinition } = input;

      // LOCAL definition path
      if (workflowUrl.startsWith("local://") && workflowDefinition) {
        await ctx.db
          .insert(globalWorkflows)
          .values({
            title: workflowDefinition.title ?? "unnamed",
            data: workflowDefinition,
          })
          .onConflictDoUpdate({
            target: globalWorkflows.title,
            set: { data: workflowDefinition, updatedAt: new Date() },
          });
        return { ok: true };
      }

      // Replicate
      if (workflowUrl.includes("replicate.com")) {
        const token =
          apiKey || ctx.apiToken || process.env.REPLICATE_API_TOKEN || "";
        const def = await fetchReplicateWorkflow(workflowUrl, token);

        const defForDb = {
          ...def,
          result: def.result === null ? undefined : def.result,
        };

        await ctx.db
          .insert(globalWorkflows)
          .values({ title: def.title, data: defForDb })
          .onConflictDoUpdate({
            target: globalWorkflows.title,
            set: { data: defForDb, updatedAt: new Date() },
          });

        return { ok: true, data: def };
      }

      // Fal
      if (workflowUrl.includes("fal.ai")) {
        const token = apiKey || ctx.apiToken || process.env.FAL_API_KEY || "";
        const def = await fetchFalWorkflow(workflowUrl, token);

        const defForDb = {
          ...def,
          result: def.result === null ? undefined : def.result,
        };
        await ctx.db
          .insert(globalWorkflows)
          .values({ title: def.title, data: defForDb })
          .onConflictDoUpdate({
            target: globalWorkflows.title,
            set: { data: defForDb, updatedAt: new Date() },
          });

        return { ok: true, data: def };
      }

      throw new Error(
        "Unsupported URL format. Only Replicate and FAL models are currently supported.",
      );
    }),

  addRun: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
        provider: z.enum(["replicate", "fal"]),
        inputs: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let inputHash: string | undefined;

      // Generate hash if inputs are provided
      if (input.inputs) {
        const crypto = await import("crypto");
        const serializedInputs = JSON.stringify({
          workflowId: input.workflowId,
          inputs: input.inputs,
        });

        inputHash = crypto
          .createHash("sha256")
          .update(serializedInputs)
          .digest("hex");
      }

      const [run] = await ctx.db
        .insert(workflowRuns)
        .values({
          userId: ctx.user.id,
          workflowId: input.workflowId,
          provider: input.provider,
          inputs: input.inputs,
          inputHash,
          status: "pending",
          ranWithOurApiKey:
            input.provider === "replicate"
              ? !ctx.user.replicateApiKey || ctx.user.replicateApiKey === ""
              : !ctx.user.falApiKey || ctx.user.falApiKey === "",
          ranAt: new Date(),
          startedAt: new Date(),
        })
        .returning({ id: workflowRuns.id });

      return { ok: true, runId: run.id };
    }),

  updateRun: protectedProcedure
    .input(
      z.object({
        runId: z.number(),
        status: z.enum(["running", "completed", "failed", "cancelled"]),
        output: z.any().optional(),
        error: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Partial<typeof workflowRuns.$inferSelect> = {
        status: input.status,
      };

      if (
        input.status === "completed" ||
        input.status === "failed" ||
        input.status === "cancelled"
      ) {
        updateData.completedAt = new Date();
      }

      if (input.output !== undefined) {
        updateData.output = input.output;
      }

      if (input.error !== undefined) {
        updateData.error = input.error;
      }

      await ctx.db
        .update(workflowRuns)
        .set(updateData)
        .where(
          and(
            eq(workflowRuns.id, input.runId),
            eq(workflowRuns.userId, ctx.user.id),
          ),
        );

      return { ok: true };
    }),

  checkCachedRun: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
        inputs: z.record(z.any()),
      }),
    )
    .query(async ({ ctx, input }) => {
      console.log("[CHECK CACHED RUN] received input", input);
      console.log("[CHECK CACHED RUN] input.inputs", input.inputs);

      // Generate the same hash as in addRun
      const crypto = await import("crypto");
      const serializedInputs = JSON.stringify({
        workflowId: input.workflowId,
        inputs: input.inputs,
      });

      console.log("[CHECK CACHED RUN] serializedInputs", serializedInputs);

      const inputHash = crypto
        .createHash("sha256")
        .update(serializedInputs)
        .digest("hex");

      console.log("[CHECK CACHED RUN] inputHash", inputHash);

      // Look for a completed run with this hash
      const cachedRun = await ctx.db.query.workflowRuns.findFirst({
        where: (wr, { and, eq }) =>
          and(
            eq(wr.userId, ctx.user.id),
            eq(wr.workflowId, input.workflowId),
            eq(wr.inputHash, inputHash),
            eq(wr.status, "completed"),
          ),
        orderBy: (wr, { desc }) => [desc(wr.completedAt)],
      });

      if (cachedRun && cachedRun.output) {
        return {
          found: true,
          output: cachedRun.output,
          runId: cachedRun.id,
          completedAt: cachedRun.completedAt,
        };
      }

      return { found: false };
    }),

  getWorkflowRunCountByUser: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(workflowRuns)
        .where(
          and(
            eq(workflowRuns.userId, ctx.user.id),
            eq(workflowRuns.workflowId, input.workflowId),
            eq(workflowRuns.ranWithOurApiKey, true),
          ),
        );
      return { count: result[0]?.count ?? 0 };
    }),

  executeWorkflow: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
        inputs: z.record(z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workflowId = input.workflowId;

      const workflow = await ctx.db
        .select()
        .from(globalWorkflows)
        .where(eq(globalWorkflows.id, workflowId))
        .limit(1);

      if (!workflow[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      const workflowData = workflow[0].data;
      const creditCost = workflow[0].creditCost;

      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { creditBalance: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.creditBalance < creditCost) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Insufficient credits. You have ${user.creditBalance} credits but need ${creditCost} credits to run this workflow.`,
        });
      }

      await ctx.db
        .update(users)
        .set({
          creditBalance: sql`${users.creditBalance} - ${creditCost}`,
        })
        .where(eq(users.id, ctx.user.id))
        .returning({ newBalance: users.creditBalance });

      try {
        const { ids } = await inngest.send({
          name: "workflow/process",
          data: {
            workflowId: workflowId || 0,
            userId: String(ctx.user.id),
            inputs: input.inputs,
            workflowTitle: workflowData.title,
            provider: workflowData.provider || "replicate",
            imageName: workflowData.imageName,
            modelIdentifier: workflowData.image,
            version: workflowData.version,
            creditsCharged: creditCost,
          },
        });

        console.log("Inngest Event IDs:", ids);

        if (!ids || ids.length === 0) {
          // Refund credits if workflow failed to trigger
          await ctx.db
            .update(users)
            .set({
              creditBalance: user.creditBalance, // Restore original balance
            })
            .where(eq(users.id, ctx.user.id));

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to trigger workflow",
          });
        }

        // Return the event ID immediately for client-side polling
        const eventId = ids[0];

        return {
          success: true,
          eventId,
          creditsCharged: creditCost,
        };
      } catch (error) {
        // Refund credits if any error occurred
        await ctx.db
          .update(users)
          .set({
            creditBalance: user.creditBalance, // Restore original balance
          })
          .where(eq(users.id, ctx.user.id));

        throw error;
      }
    }),

  getInngestRunStatus: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const runs = await getRuns(input.eventId);

        if (!runs || runs.length === 0) {
          return {
            status: "pending",
            output: null,
            error: null,
          };
        }

        const run = runs[0];

        // Map Inngest status to our status
        let status:
          | "pending"
          | "processing"
          | "completed"
          | "error"
          | "cancelled";
        switch (run.status) {
          case "Running":
            status = "processing";
            break;
          case "Completed":
            status = "completed";
            break;
          case "Failed":
            status = "error";
            break;
          case "Cancelled":
            status = "cancelled";
            break;
          default:
            status = "pending";
        }

        // Extract runId from output if completed
        let runId: number | null = null;
        if (status === "completed" && run.output) {
          runId = extractRunIdFromOutput(run.output);
        }

        return {
          status,
          output: run.output,
          error: run.error,
          runId,
        };
      } catch (error) {
        console.error("Error fetching Inngest run status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch run status",
        });
      }
    }),

  getUserActiveRuns: protectedProcedure.query(async ({ ctx }) => {
    // Get all pending/running/processing workflow runs for the user
    const activeRuns = await ctx.db.query.workflowRuns.findMany({
      columns: {
        id: true,
        workflowId: true,
        inputs: true,
        status: true,
        startedAt: true,
        eventId: true,
      },
      where: and(
        eq(workflowRuns.userId, ctx.user.id),
        sql`${workflowRuns.status} IN ('pending', 'running', 'processing')`,
      ),
      orderBy: desc(workflowRuns.startedAt),
      with: {
        workflow: true,
      },
    });

    console.log(
      `[getUserActiveRuns] Found ${activeRuns.length} active runs for user ${ctx.user.id}`,
    );

    // Filter and process only runs with eventIds (trackable via Inngest)
    const runsWithEventIds = activeRuns.filter((run) => run.eventId);
    console.log(
      `[getUserActiveRuns] ${runsWithEventIds.length} runs have eventIds`,
    );

    // For each active run with an eventId, fetch real-time status from Inngest
    const activeRunsWithStatus = await Promise.all(
      runsWithEventIds.map(async (run) => {
        let inngestStatus = null;
        let progress = 5;
        let estimatedTimeRemaining: number | undefined;

        try {
          const runs = await getRuns(run.eventId!);
          if (runs && runs.length > 0) {
            const inngestRun = runs[0];

            // Map Inngest status
            let status: "queued" | "running" = "running"; // Default to running since it's processing
            if (inngestRun.status === "Running") {
              status = "running";
              progress = 25; // Running workflows show 25% progress by default
            }

            inngestStatus = {
              status,
              inngestRun,
            };
          }
        } catch (error) {
          console.error(
            `Failed to fetch Inngest status for event ${run.eventId}:`,
            error,
          );
        }

        // Extract input prompt
        let inputPrompt = "";
        if (run.inputs && typeof run.inputs === "object") {
          const promptFields = ["prompt", "input", "text", "message", "query"];
          for (const field of promptFields) {
            if (run.inputs[field as keyof typeof run.inputs]) {
              inputPrompt = String(
                run.inputs[field as keyof typeof run.inputs],
              );
              break;
            }
          }
        }

        return {
          id: run.eventId!,
          dbRunId: run.id,
          workflowName: run.workflow.title,
          imageName: run.workflow.data.imageName,
          inputPrompt,
          status: inngestStatus?.status || "queued",
          progress,
          startTime: run.startedAt || new Date(),
          estimatedTimeRemaining,
          eventId: run.eventId!,
        };
      }),
    );

    return activeRunsWithStatus;
  }),

  getRunStatus: protectedProcedure
    .input(
      z.object({
        runId: z.number().optional(),
        workflowId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.runId) {
        const run = await ctx.db
          .select()
          .from(workflowRuns)
          .where(
            and(
              eq(workflowRuns.id, input.runId),
              eq(workflowRuns.userId, ctx.user.id),
            ),
          )
          .limit(1);

        return run[0] || null;
      }

      // Otherwise get the latest run for this workflow
      const run = await ctx.db
        .select()
        .from(workflowRuns)
        .where(
          and(
            eq(workflowRuns.workflowId, input.workflowId),
            eq(workflowRuns.userId, ctx.user.id),
          ),
        )
        .orderBy(sql`${workflowRuns.ranAt} DESC`)
        .limit(1);

      return run[0] || null;
    }),

  cancelWorkflow: protectedProcedure
    .input(
      z.object({
        runId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update the run status to cancelled
      const result = await ctx.db
        .update(workflowRuns)
        .set({
          status: "cancelled",
          completedAt: new Date(),
        })
        .where(
          and(
            eq(workflowRuns.id, input.runId),
            eq(workflowRuns.userId, ctx.user.id),
            sql`${workflowRuns.status} IN ('pending', 'running')`,
          ),
        )
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Run not found or already completed",
        });
      }

      // TODO: Also cancel the Inngest function if it's still running
      // This would require storing the Inngest run ID and using their cancellation API

      return { success: true };
    }),

  // History-related endpoints for workflow runs
  getUserRuns: protectedProcedure.query(async ({ ctx, input }) => {
    const whereConditions = [
      eq(workflowRuns.userId, ctx.user.id),
      // Only show completed runs in history
      sql`${workflowRuns.status} IN ('complete', 'completed')`,
    ];

    whereConditions.push(eq(workflowRuns.archived, false));

    const runs = await ctx.db
      .select({
        run: workflowRuns,
        workflow: globalWorkflows,
      })
      .from(workflowRuns)
      .leftJoin(
        globalWorkflows,
        eq(workflowRuns.workflowId, globalWorkflows.id),
      )
      .where(and(...whereConditions))
      .orderBy(sql`${workflowRuns.completedAt} DESC NULLS LAST`)
      .limit(50);

    // Transform the data to include workflow info
    return runs.map((row) => ({
      ...row.run,
      workflowData: row.workflow?.data as WorkflowData | null,
      workflowTitle: row.workflow?.title || "Unknown Workflow",
    }));
  }),

  archiveRun: protectedProcedure
    .input(
      z.object({
        runId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(workflowRuns)
        .set({
          archived: true,
        })
        .where(
          and(
            eq(workflowRuns.id, input.runId),
            eq(workflowRuns.userId, ctx.user.id),
          ),
        )
        .returning({ id: workflowRuns.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Run not found",
        });
      }

      return { success: true };
    }),

  archiveAllRuns: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(workflowRuns)
      .set({
        archived: true,
      })
      .where(
        and(
          eq(workflowRuns.userId, ctx.user.id),
          eq(workflowRuns.archived, false),
        ),
      );

    return { success: true };
  }),

  // Get run data by eventId (for URL-based state restoration)
  getRunByEventId: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.workflowRuns.findFirst({
        where: and(
          eq(workflowRuns.eventId, input.eventId),
          eq(workflowRuns.userId, ctx.user.id),
        ),
        with: {
          workflow: true,
        },
      });

      if (!run) {
        return null;
      }

      // Transform the output to match what the display expects
      let outputAssetSrc = null;
      let result = null;

      // Extract outputAssetSrc from the output field
      if (run.output) {
        // The output is always an object with outputPath
        outputAssetSrc = (run.output as any).outputPath || null;

        // Set result object
        result = {
          outputPath: outputAssetSrc,
          processingTime:
            run.completedAt && run.startedAt
              ? new Date(run.completedAt).getTime() -
                new Date(run.startedAt).getTime()
              : undefined,
        };
      }

      // Calculate progress based on status
      let progress = 0;
      if (run.status === "completed") {
        progress = 100;
      } else if (run.status === "running" || run.status === "processing") {
        progress = 50; // Default to 50% for running
      }

      return {
        id: run.id,
        eventId: run.eventId,
        workflowId: run.workflowId,
        inputs: run.inputs,
        output: run.output,
        outputAssetSrc,
        result,
        progress,
        status: run.status,
        error: run.error,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        workflowTitle: run.workflow?.title,
        workflowData: run.workflow?.data,
      };
    }),
});
