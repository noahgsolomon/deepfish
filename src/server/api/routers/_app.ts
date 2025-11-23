import { userRouter } from "~/server/api/routers/user";
import { workflowRouter } from "~/server/api/routers/workflow";
import { replicateRouter } from "~/server/api/routers/replicate";
import { falRouter } from "~/server/api/routers/fal";
import { flowRouter } from "~/server/api/routers/flow";
import { stripeRouter } from "~/server/api/routers/stripe";
import { createCallerFactory, createTRPCRouter } from "~/server/api/init";
import { giftRouter } from "./gift";

export const appRouter = createTRPCRouter({
  user: userRouter,
  workflow: workflowRouter,
  replicate: replicateRouter,
  fal: falRouter,
  flow: flowRouter,
  stripe: stripeRouter,
  gift: giftRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
