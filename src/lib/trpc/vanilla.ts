// ~/lib/trpc/proxyClient.ts
"use client";

import {
  createTRPCProxyClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "~/server/api/routers/_app";
import { getUrl } from "~/trpc/client";

export const vanillaApi = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: () => process.env.NEXT_PUBLIC_DEBUG === "true",
    }),
    httpBatchStreamLink({
      transformer: superjson,
      url: getUrl(),
    }),
  ],
});
