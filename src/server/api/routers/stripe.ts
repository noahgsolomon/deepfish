import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/init";
import { TRPCError } from "@trpc/server";
import { stripe } from "~/lib/stripe";
import { eq } from "drizzle-orm";
import { users } from "~/server/db/schema";

export const stripeRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        let customerId = ctx.user.stripeCustomerId;

        // if no stripe customer id exists, create one
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: ctx.user.email!,
            name:
              `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() ||
              undefined,
          });

          customerId = customer.id;

          // update user with stripe customer id
          await ctx.db
            .update(users)
            .set({ stripeCustomerId: customerId })
            .where(eq(users.id, ctx.user.id));
        }

        // create a stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_DESKTOP_APP_URL}/purchase-result?type=subscription`,
          cancel_url: `${process.env.NEXT_PUBLIC_DESKTOP_APP_URL}/purchase-result?canceled=true`,
          metadata: {
            userId: ctx.user.id.toString(),
            type: "subscription",
          },
        });

        return { url: checkoutSession.url };
      } catch (error) {
        console.error("Error creating checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error creating checkout session: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  createPaymentSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        quantity: z.number().min(1).max(10).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        let customerId = ctx.user.stripeCustomerId;

        // if no stripe customer id exists create one
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: ctx.user.email!,
            name:
              `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim() ||
              undefined,
          });

          customerId = customer.id;

          // Update user with Stripe customer ID
          await ctx.db
            .update(users)
            .set({ stripeCustomerId: customerId })
            .where(eq(users.id, ctx.user.id));
        }

        // create a stripe checkout session for one time payment
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price: input.priceId,
              quantity: input.quantity,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_DESKTOP_APP_URL}/purchase-result?type=credits&quantity=${input.quantity}&currentBalance=${ctx.user.creditBalance}`,
          cancel_url: `${process.env.NEXT_PUBLIC_DESKTOP_APP_URL}/purchase-result?canceled=true`,
          metadata: {
            userId: ctx.user.id.toString(),
            type: "credit_purchase",
          },
        });

        return { url: checkoutSession.url };
      } catch (error) {
        console.error("Error creating payment checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error creating payment checkout session: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!ctx.user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No associated Stripe customer found",
        });
      }

      // create stripe billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: ctx.user.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_DESKTOP_APP_URL}/`,
      });

      return { url: portalSession.url };
    } catch (error) {
      console.error("Error creating portal session:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error creating portal session: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }),
});
