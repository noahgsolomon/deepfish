import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "~/server/api/routers/_app";
import { getApiBaseUrl } from "../utils";

function createServerClient() {
  return createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: () => process.env.DEBUG === "true",
      }),
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}

export const serverApi = createServerClient();

export const staticServerApi = createServerClient();
