import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "~/server/api/routers/_app";
import { createContext } from "~/server/api/context";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError(opts) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${opts.path ?? "<no-path>"}: ${
            opts.error.message
          }`,
        );
      }
    },
  });

export { handler as GET, handler as POST };
