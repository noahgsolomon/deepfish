import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/init";
import { TRPCError } from "@trpc/server";
import { gifts, users } from "~/server/db/schema";
import { eq, and, or } from "drizzle-orm";

export const giftRouter = createTRPCRouter({
  createGift: protectedProcedure
    .input(
      z.object({
        credits: z.number().min(1),
        message: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { credits, message, imageUrl } = input;

      if (ctx.user.creditBalance < credits) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient credits",
        });
      }

      // create gift
      const [gift] = await ctx.db
        .insert(gifts)
        .values({
          senderId: ctx.user.id,
          credits,
          message,
          imageUrl,
        })
        .returning();

      await ctx.db
        .update(users)
        .set({
          creditBalance: ctx.user.creditBalance - credits,
        })
        .where(eq(users.id, ctx.user.id));

      return gift;
    }),

  claimGift: protectedProcedure
    .input(
      z.object({
        uuid: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { uuid } = input;

      const gift = await ctx.db.query.gifts.findFirst({
        where: eq(gifts.uuid, uuid),
      });

      if (!gift) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gift not found",
        });
      }

      if (gift.status === "claimed" || gift.claimed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Gift already claimed",
        });
      }

      if (gift.status === "canceled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Gift has been canceled",
        });
      }

      // update gift status
      await ctx.db
        .update(gifts)
        .set({
          status: "claimed",
          claimed: true,
          claimedUserId: ctx.user.id,
          claimedAt: new Date(),
        })
        .where(eq(gifts.uuid, uuid));

      await ctx.db
        .update(users)
        .set({
          creditBalance: ctx.user.creditBalance + gift.credits,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  getGifts: protectedProcedure
    .input(
      z.object({
        type: z.enum(["sent", "claimed"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { type } = input;

      const giftsList = await ctx.db.query.gifts.findMany({
        where:
          type === "sent"
            ? eq(gifts.senderId, ctx.user.id)
            : and(
                eq(gifts.claimedUserId, ctx.user.id),
                eq(gifts.claimed, true),
              ),
        with: {
          sender: true,
          claimedUser: true,
        },
        orderBy: (gifts, { desc }) => [desc(gifts.createdAt)],
      });

      return giftsList;
    }),

  getGiftByUuid: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { uuid } = input;

      const gift = await ctx.db.query.gifts.findFirst({
        where: eq(gifts.uuid, uuid),
        with: {
          sender: true,
          claimedUser: true,
        },
      });

      if (!gift) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gift not found",
        });
      }

      return gift;
    }),

  cancelGift: protectedProcedure
    .input(
      z.object({
        giftId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { giftId } = input;

      const gift = await ctx.db.query.gifts.findFirst({
        where: eq(gifts.id, giftId),
      });

      if (!gift) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gift not found",
        });
      }

      if (gift.senderId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel gifts you sent",
        });
      }

      if (gift.status === "claimed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a gift that has already been claimed",
        });
      }

      if (gift.status === "canceled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Gift is already cancelled",
        });
      }

      // update gift status to canceled
      await ctx.db
        .update(gifts)
        .set({
          status: "canceled",
          claimedAt: new Date(),
        })
        .where(eq(gifts.id, giftId));

      // return credits to sender
      await ctx.db
        .update(users)
        .set({
          creditBalance: ctx.user.creditBalance + gift.credits,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
