import {
  createTRPCRouter,
  maybeAuthedProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/init";
import { z } from "zod";
import { flows } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { callFlowRunDiscordWebhook } from "../discord";

// Fun emoji collection for flows (same as Rust)
const FLOW_EMOJIS = [
  "🧩",
  "🔮",
  "⚡",
  "🚀",
  "✨",
  "🌈",
  "🎮",
  "🎯",
  "🧠",
  "🔍",
  "🌟",
  "⚙️",
  "🛠️",
  "🤖",
  "🧪",
  "📊",
  "🔄",
  "🏗️",
  "🧬",
  "🔧",
  "💫",
  "🌊",
  "🔥",
  "🌿",
  "💡",
  "🎭",
  "🧵",
  "🎨",
  "📡",
  "🔔",
  "🎲",
  "🧙",
  "🦾",
  "🛸",
  "🌠",
  "💾",
  "📱",
  "🎛️",
  "⏱️",
  "🦄",
  "🐉",
  "🦋",
  "🐙",
  "🦜",
  "🐝",
  "🦊",
  "🐢",
  "🐬",
  "🦚",
  "🦁",
  "🐘",
  "🦖",
  "🦔",
  "🦇",
  "🦅",
  "🦓",
  "🐺",
  "🦈",
  "🦝",
  "🍄",
  "🌵",
  "🌋",
  "🏔️",
  "🏝️",
  "🌌",
  "⛅",
  "🌪️",
  "🌀",
  "⚗️",
  "🔭",
  "🔬",
  "🔗",
  "📐",
  "📓",
  "🧮",
  "🪄",
  "💎",
  "🎪",
  "🧶",
  "🧸",
  "🎼",
  "🎧",
  "🎬",
  "🎞️",
  "📺",
  "🎁",
  "💼",
  "🎒",
  "⏰",
  "⌚",
  "💻",
  "📱",
  "📢",
  "🔋",
  "🔌",
  "🧲",
  "🏆",
  "🌞",
  "🌜",
  "💖",
  "❤️‍🔥",
  "⚜️",
  "🟣",
  "🔱",
  "☄️",
  "🌱",
  "🍂",
  "🌾",
  "🌭",
  "🧁",
  "🍰",
  "🥇",
  "🏅",
];

// Helper to get a random emoji
function getRandomEmoji(): string {
  return FLOW_EMOJIS[Math.floor(Math.random() * FLOW_EMOJIS.length)] || "🧩";
}

export const flowRouter = createTRPCRouter({
  // List all flows for the current user
  listFlows: maybeAuthedProcedure
    .input(z.object({ withData: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        return [];
      }

      const userFlows = await ctx.db.query.flows.findMany({
        where: eq(flows.userId, ctx.user.id),
        orderBy: [desc(flows.updatedAt)],
        columns: {
          name: true,
          thumbnail: true,
          exampleOutput: true,
          exampleOutputType: true,
          runs: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          emoji: true,
          id: true,
          nsfw: true,
          userId: true,
          data: input.withData ? true : (false as true),
        },
      });

      return userFlows;
    }),

  listUserPublicFlows: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.flows.findMany({
        where: and(eq(flows.userId, input), eq(flows.isPublic, true)),
      });
    }),

  // Get popular public flows
  getPopularFlows: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const popularFlows = await ctx.db.query.flows.findMany({
        where: eq(flows.isPublic, true),
        orderBy: [desc(flows.runs)],
        limit: input.limit,
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
            },
          },
        },
      });

      return popularFlows.map((flow) => ({
        ...flow,
        authorId: flow.user?.id,
        authorName: flow.user
          ? `${flow.user.firstName || ""} ${flow.user.lastName || ""}`.trim() ||
            "Anonymous"
          : "Anonymous",
        authorAvatar: flow.user?.imageUrl,
      }));
    }),

  // Toggle flow public/private
  toggleFlowVisibility: protectedProcedure
    .input(
      z.object({
        flowId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const flow = await ctx.db.query.flows.findFirst({
        where: and(eq(flows.id, input.flowId), eq(flows.userId, ctx.user.id)),
      });

      if (!flow) {
        throw new Error("Flow not found");
      }

      await ctx.db
        .update(flows)
        .set({
          isPublic: !flow.isPublic,
          updatedAt: Date.now(),
        })
        .where(and(eq(flows.id, input.flowId), eq(flows.userId, ctx.user.id)));

      return { isPublic: !flow.isPublic };
    }),

  // Get a single public flow (for sharing)
  getPublicFlow: publicProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const flow = await ctx.db.query.flows.findFirst({
        where: and(eq(flows.id, input.flowId), eq(flows.isPublic, true)),
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              imageUrl: true,
            },
          },
        },
      });

      if (!flow) return null;

      return {
        ...flow,
        authorAvatar: flow.user?.imageUrl,
        authorName: flow.user
          ? `${flow.user.firstName || ""} ${flow.user.lastName || ""}`.trim() ||
            "Anonymous"
          : "Anonymous",
      };
    }),

  // Fork a public flow
  forkFlow: protectedProcedure
    .input(
      z.object({
        flowId: z.string(),
        newName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the original flow
      const originalFlow = await ctx.db.query.flows.findFirst({
        where: and(eq(flows.id, input.flowId), eq(flows.isPublic, true)),
      });

      if (!originalFlow) {
        throw new Error("Flow not found or not public");
      }

      const newFlowId = crypto.randomUUID();
      const emoji = getRandomEmoji();
      const now = Date.now();

      await ctx.db.insert(flows).values({
        id: newFlowId,
        name: input.newName || `${originalFlow.name} (Fork)`,
        data: originalFlow.data,
        emoji,
        createdAt: now,
        updatedAt: now,
        userId: ctx.user.id,
        thumbnail: originalFlow.thumbnail,
        isPublic: false, // Forked flows start as private
        nsfw: originalFlow.nsfw, // Copy nsfw status from original
      });

      return { flowId: newFlowId };
    }),

  // Save/update a flow
  saveFlow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        data: z.string(),
        emoji: z.string().optional(),
        thumbnail: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();

      // Check if flow exists
      const existing = await ctx.db.query.flows.findFirst({
        where: and(eq(flows.id, input.id), eq(flows.userId, ctx.user.id)),
      });

      if (existing) {
        // Update existing flow
        const emoji = input.emoji ?? existing.emoji;

        await ctx.db
          .update(flows)
          .set({
            name: input.name,
            data: input.data,
            emoji,
            updatedAt: now,
            thumbnail: input.thumbnail,
          })
          .where(and(eq(flows.id, input.id), eq(flows.userId, ctx.user.id)));
      } else {
        // Create new flow
        const emoji = input.emoji ?? getRandomEmoji();

        await ctx.db.insert(flows).values({
          id: input.id,
          name: input.name,
          data: input.data,
          emoji,
          createdAt: now,
          updatedAt: now,
          userId: ctx.user.id,
          thumbnail: input.thumbnail,
        });
      }

      return { success: true };
    }),

  // Delete a flow
  deleteFlow: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(flows)
        .where(and(eq(flows.id, input.flowId), eq(flows.userId, ctx.user.id)));

      return { success: true };
    }),

  // Get a single flow
  getFlow: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const flow = await ctx.db.query.flows.findFirst({
        where: and(eq(flows.id, input.flowId), eq(flows.userId, ctx.user.id)),
      });

      if (!flow) return null;

      return flow;
    }),

  // Rename a flow
  renameFlow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();

      await ctx.db
        .update(flows)
        .set({
          name: input.name,
          updatedAt: now,
        })
        .where(and(eq(flows.id, input.id), eq(flows.userId, ctx.user.id)));

      return { success: true };
    }),

  // Increment run counter
  incrementRuns: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(flows)
        .set({ runs: sql`${flows.runs} + 1` })
        .where(and(eq(flows.id, input.flowId), eq(flows.userId, ctx.user.id)));

      void (async () => {
        const flow = await ctx.db.query.flows.findFirst({
          where: eq(flows.id, input.flowId),
          with: { user: true },
        });
        if (flow) {
          void callFlowRunDiscordWebhook(flow);
        }
      })();

      return { success: true };
    }),

  // Update flow emoji
  updateFlowEmoji: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        emoji: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();

      await ctx.db
        .update(flows)
        .set({
          emoji: input.emoji,
          updatedAt: now,
        })
        .where(and(eq(flows.id, input.id), eq(flows.userId, ctx.user.id)));

      return { success: true };
    }),

  // Update flow example output
  updateFlowExampleOutput: protectedProcedure
    .input(
      z.object({
        flowId: z.string(),
        exampleOutputType: z.string(),
        exampleOutput: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(flows)
        .set({
          exampleOutputType: input.exampleOutputType,
          exampleOutput: input.exampleOutput,
          updatedAt: Date.now(),
        })
        .where(and(eq(flows.id, input.flowId), eq(flows.userId, ctx.user.id)));

      return { success: true };
    }),
});
