import { QueryCache, QueryClient } from "@tanstack/react-query";
import { makeQueryClient } from "~/lib/trpc/query-client";

let browserClient: QueryClient | undefined;

export function getQueryClient(opts?: { onError?: (e: Error) => void }) {
  if (typeof window === "undefined") {
    // Server: return a fresh client per request
    return makeQueryClient({
      queryCache: new QueryCache({
        onError: (e) => opts?.onError?.(e as Error),
      }),
    });
  }
  // Client: reuse a singleton
  if (!browserClient) {
    browserClient = makeQueryClient({
      queryCache: new QueryCache({
        onError: (e) => opts?.onError?.(e as Error),
      }),
    });
  }
  return browserClient;
}
