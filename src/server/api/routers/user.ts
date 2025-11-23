import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  betaProcedure,
  maybeAuthedProcedure,
} from "~/server/api/init";
import { currentUser } from "@clerk/nextjs/server";
import { users, flows } from "~/server/db/schema";
import { eq, or, sql } from "drizzle-orm";
import crypto from "crypto";

export const userRouter = createTRPCRouter({
  hello: publicProcedure.query(async ({ ctx }) => {
    return { message: "hello" };
  }),

  getUser: maybeAuthedProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),

  getUserById: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input),
      });
      return user ?? null;
    }),

  syncUser: publicProcedure.mutation(async ({ ctx }) => {
    console.log("syncUser mutation called");

    const user = await currentUser();
    console.log("Current user fetched:", user);

    if (!user) {
      console.error("User not found");
      throw new Error("User not found");
    }

    // Safely get email address
    const userEmail = user.emailAddresses?.[0]?.emailAddress ?? "";

    const existingUser = await ctx.db.query.users.findFirst({
      where: or(
        eq(users.clerkId, user.id),
        userEmail ? eq(users.email, userEmail) : undefined,
      ),
    });
    console.log("Existing user fetched from database:", existingUser);

    if (!existingUser) {
      console.log("User not found in database, inserting new user");
      console.log("user clerkId", user.id);
      const apiKey = crypto.randomBytes(32).toString("hex");
      await ctx.db.insert(users).values({
        clerkId: user.id,
        email: userEmail,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        subscribed: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
        apiKey,
        imageUrl:
          user.imageUrl ?? `/yumemonos/${Math.ceil(Math.random() * 5)}.png`,
        beta: true,
      });
      console.log("New user inserted into database");
    } else {
      // Update the clerkId if it's different (user might have re-authenticated)
      if (existingUser.clerkId !== user.id) {
        console.log(
          "Updating user's clerkId from",
          existingUser.clerkId,
          "to",
          user.id,
        );
        await ctx.db
          .update(users)
          .set({
            clerkId: user.id,
            // Also update other fields from Clerk if they've changed
            firstName: user.firstName ?? existingUser.firstName,
            lastName: user.lastName ?? existingUser.lastName,
            imageUrl: user.imageUrl ?? existingUser.imageUrl,
          })
          .where(eq(users.id, existingUser.id));
        console.log("Updated user's clerkId");
      } else {
        console.log("User already exists with correct clerkId");
      }
    }

    console.log("syncUser mutation completed successfully");
    return { success: true };
  }),

  updateUser: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        completedWalkthrough: z.boolean().optional(),
        isOver18: z.boolean().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set(input)
        .where(eq(users.clerkId, ctx.user.clerkId));
      return { success: true };
    }),

  getAllUserIds: publicProcedure.query(async ({ ctx }) => {
    const userIds = await ctx.db.query.users.findMany({
      columns: {
        id: true,
      },
    });
    return userIds.map((user) => ({ id: user.id.toString() }));
  }),

  getUsersWithPublicFlows: publicProcedure.query(async ({ ctx }) => {
    const usersWithPublicFlows = await ctx.db
      .selectDistinct({ id: users.id })
      .from(users)
      .innerJoin(flows, eq(flows.userId, users.id))
      .where(eq(flows.isPublic, true));

    return usersWithPublicFlows.map((user) => ({ id: user.id.toString() }));
  }),

  deductCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        workflowTitle: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { creditBalance: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.creditBalance < input.amount) {
        throw new Error(
          `Insufficient credits. You have ${user.creditBalance} credits but need ${input.amount} credits to run this workflow.`,
        );
      }

      await ctx.db
        .update(users)
        .set({
          creditBalance: sql`${users.creditBalance} - ${input.amount}`,
        })
        .where(eq(users.id, ctx.user.id));

      return {
        newBalance: user.creditBalance - input.amount,
      };
    }),

  refundCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        workflowTitle: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          creditBalance: sql`${users.creditBalance} + ${input.amount}`,
        })
        .where(eq(users.id, ctx.user.id));

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { creditBalance: true },
      });

      return {
        newBalance: user?.creditBalance ?? 0,
      };
    }),

  claimWelcomeCredits: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: {
        creditBalance: true,
        claimedFreeCredits: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.claimedFreeCredits) {
      return {
        success: false,
        message: "Welcome credits already claimed",
        newBalance: user.creditBalance,
      };
    }

    await ctx.db
      .update(users)
      .set({
        creditBalance: sql`${users.creditBalance} + 2`,
        claimedFreeCredits: true,
      })
      .where(eq(users.id, ctx.user.id));

    return {
      success: true,
      message: "Welcome credits claimed successfully",
      newBalance: user.creditBalance + 2,
    };
  }),
});
