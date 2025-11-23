import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { currentUser } from "@clerk/nextjs/server";

import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

const maybeAuthed = t.middleware(async ({ ctx, next }) => {
  if (ctx.user) {
    return next({ ctx: { ...ctx, user: ctx.user!, source: "api" } });
  }

  // Check if this is a desktop/API client - if so, don't try Clerk auth
  const isDesktopClient =
    ctx.headers.get("x-df-client") === "desktop" ||
    ctx.headers.get("x-trpc-source") === "desktop" ||
    !!ctx.headers.get("x-api-key");

  if (isDesktopClient) {
    // Desktop client without API key - continue as unauthenticated
    return next({ ctx: { ...ctx, user: null, source: "api" } });
  }

  // Fallback to Clerk session for browser calls
  const clerkUser = await currentUser();
  if (!clerkUser?.id) {
    return next({ ctx: { ...ctx, user: null, source: "website" } });
  }

  const userFromDB =
    (await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUser.id),
    })) ?? null;

  if (!userFromDB) {
    return next({ ctx: { ...ctx, user: null, source: "website" } });
  }

  return next({
    ctx: {
      ...ctx,
      user: userFromDB,
      source: "website",
    },
  });
});

const isAuthed = t.middleware(async ({ ctx, next }) => {
  // Prefer user extracted from API token
  if (ctx.user) {
    return next({ ctx: { ...ctx, user: ctx.user!, source: "api" } });
  }

  // Fallback to Clerk session for browser calls
  const clerkUser = await currentUser();
  if (!clerkUser?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userFromDB =
    (await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUser.id),
    })) ?? null;

  if (!userFromDB) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user: userFromDB,
      source: "website",
    },
  });
});

const isBeta = t.middleware(async ({ ctx, next }) => {
  // First ensure user is authenticated
  let user = ctx.user;

  if (!user) {
    // Try to get user from Clerk if not in context
    const clerkUser = await currentUser();
    if (!clerkUser?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    user =
      (await db.query.users.findFirst({
        where: eq(users.clerkId, clerkUser.id),
      })) ?? null;

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  // Check beta access
  if (!user.beta) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Beta access required. Please join the waitlist at deepfi.sh",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(isAuthed);

export const betaProcedure = t.procedure
  .use(timingMiddleware)
  .use(isAuthed)
  .use(isBeta);

export const maybeAuthedProcedure = t.procedure.use(maybeAuthed);

export type Provider = "replicate" | "fal";
export const withApiToken = (
  providerOrFn: Provider | ((raw: any) => Provider),
) =>
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (providerOrFn === "replicate") {
      if (!ctx.user?.replicateApiKey || ctx.user?.replicateApiKey === "") {
        return next({
          ctx: { ...ctx, apiToken: process.env.REPLICATE_API_TOKEN },
        });
      } else {
        return next({ ctx: { ...ctx, apiToken: ctx.user?.replicateApiKey } });
      }
    }
    if (providerOrFn === "fal") {
      if (!ctx.user?.falApiKey || ctx.user?.falApiKey === "") {
        return next({
          ctx: { ...ctx, apiToken: process.env.FAL_API_KEY },
        });
      } else {
        return next({ ctx: { ...ctx, apiToken: ctx.user?.falApiKey } });
      }
    } else {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invalid provider",
      });
    }
  });
