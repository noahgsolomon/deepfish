import "server-only";

import { appRouter } from "~/server/api/routers/_app";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createContext } from "~/server/api/context";
import { cache } from "react";
import { createCallerFactory } from "~/server/api/init";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { makeQueryClient } from "~/lib/trpc/query-client";

export const getServerQueryClient = cache(makeQueryClient);

// tRPC proxy that returns TanStack Query options for prefetching/hydration
export const trpcQueryOptions = createTRPCOptionsProxy({
  router: appRouter,
  queryClient: getServerQueryClient,
  ctx: createContext,
});

// Direct server side caller for immediate data fetching
export const createCaller = createCallerFactory(appRouter);

export const trpcServerCaller = cache(async () => {
  const ctx = await createContext();
  return createCaller(ctx);
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();
  const dehydratedState = dehydrate(queryClient);

  if (process.env.NODE_ENV === "development") {
    const queryKeys = dehydratedState.queries.map((q) => q.queryKey);
    console.log(
      "[Server Dehydration] Query keys being sent to client:",
      queryKeys,
    );

    // Log getUserActiveRuns specifically
    const activeRunsQuery = dehydratedState.queries.find((q) =>
      JSON.stringify(q.queryKey).includes("getUserActiveRuns"),
    );
    if (activeRunsQuery) {
      console.log(
        "[Server Dehydration] getUserActiveRuns data:",
        activeRunsQuery.state.data,
      );
    } else {
      console.log(
        "[Server Dehydration] getUserActiveRuns NOT FOUND in dehydrated state",
      );
    }
  }

  return (
    <HydrationBoundary state={dehydratedState}>
      {props.children}
    </HydrationBoundary>
  );
}
