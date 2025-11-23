import { stripe } from "~/lib/stripe";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { users } from "~/server/db/schema";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// configuration
const CREDITS_PER_PACK = 50;

const processedEvents = new Set<string>();

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    return new Response(
      `Webhook Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 400 },
    );
  }

  if (processedEvents.has(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return new Response(null, { status: 200 });
  }

  const session = event.data.object as
    | Stripe.Checkout.Session
    | Stripe.Subscription;

  try {
    switch (event.type) {
      // subscription creation
      case "customer.subscription.created":
        const createSubscription = event.data.object as Stripe.Subscription;
        const createCustomerId = createSubscription.customer as string;

        const user = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, createCustomerId),
        });

        await db
          .update(users)
          .set({
            subscribed: true,
            creditBalance: (user?.creditBalance ?? 0) + 200,
            stripeSubscriptionId: createSubscription.id,
            stripePriceId: createSubscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              createSubscription.current_period_end * 1000,
            ),
          })
          .where(eq(users.stripeCustomerId, createCustomerId));
        break;

      // subscription updates
      case "customer.subscription.updated":
        const updateSubscription = event.data.object as Stripe.Subscription;
        const updateCustomerId = updateSubscription.customer as string;

        await db
          .update(users)
          .set({
            subscribed: updateSubscription.status === "active",
            stripeSubscriptionId: updateSubscription.id,
            stripePriceId: updateSubscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              updateSubscription.current_period_end * 1000,
            ),
            creditBalance: (user?.creditBalance ?? 0) + 200,
          })
          .where(eq(users.stripeCustomerId, updateCustomerId));
        break;

      // subscription deletions/cancellations
      case "customer.subscription.deleted":
        const deleteSubscription = event.data.object as Stripe.Subscription;
        const deleteCustomerId = deleteSubscription.customer as string;

        await db
          .update(users)
          .set({
            subscribed: false,
            stripeSubscriptionId: null,
            stripePriceId: null,
          })
          .where(eq(users.stripeCustomerId, deleteCustomerId));
        break;

      // checkout session completion for credit pack purchase
      case "checkout.session.completed":
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        // for credit pack purchase
        if (checkoutSession.mode === "payment") {
          const customerId = checkoutSession.customer as string;

          if (customerId) {
            // find user by stripe customer id
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId));

            if (user) {
              const sessionWithLineItems =
                await stripe.checkout.sessions.retrieve(checkoutSession.id, {
                  expand: ["line_items"],
                });

              const lineItem = sessionWithLineItems.line_items?.data?.[0];
              const quantity = lineItem?.quantity || 1;
              const creditsToAdd = CREDITS_PER_PACK * quantity;

              await db
                .update(users)
                .set({
                  creditBalance: user.creditBalance + creditsToAdd,
                })
                .where(eq(users.stripeCustomerId, customerId));

              console.log(
                `Added ${creditsToAdd} credits (${quantity} packs × ${CREDITS_PER_PACK} credits) to user ${user.id} for event ${event.id}`,
              );
            }
          }
        }
        break;
    }

    processedEvents.add(event.id);

    if (processedEvents.size > 1000) {
      const eventArray = Array.from(processedEvents);
      processedEvents.clear();
      eventArray.slice(-500).forEach((id) => processedEvents.add(id));
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.id}:`, error);
    return new Response(
      `Error processing webhook: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 500 },
    );
  }

  return new Response(null, { status: 200 });
}
