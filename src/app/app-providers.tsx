"use client";

import { AppRouter } from "~/server/api/routers/_app";
import { getUrl, TRPCProvider } from "~/trpc/client";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { usePathname } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { PropsWithChildren, useState } from "react";
import superjson from "superjson";
import { Toaster } from "~/components/ui/toaster";
import { PostHogProvider } from "~/components/posthog-provider";
import { getQueryClient } from "~/lib/trpc/get-query-client";

type Theme = "light" | "dark" | "system" | undefined;

type RouteThemeResolver = {
  theme: Theme;
  routeMatch: string | string[] | ((path: string) => boolean);
};

const routeThemeConfig: RouteThemeResolver[] = [
  {
    theme: undefined,
    routeMatch: ["/dashboard", "/models", "/workflows", "/agent", "/explore"],
  },
];

function resolveThemePerRoute(path: string): RouteThemeResolver | undefined {
  const resolver = routeThemeConfig.find((config) => {
    if (typeof config.routeMatch === "string") {
      return path.startsWith(config.routeMatch);
    } else if (Array.isArray(config.routeMatch)) {
      return config.routeMatch.find((match) => path.startsWith(match));
    }
    return config.routeMatch(path);
  });
  return resolver;
}

const AppProviders = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();

  const queryClient = getQueryClient();

  const enforcedTheme = resolveThemePerRoute(pathname as string);

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchStreamLink({
          transformer: superjson,
          url: getUrl(),
          headers() {
            return {
              "x-trpc-source": "client",
            };
          },
        }),
      ],
    }),
  );

  return (
    <NuqsAdapter>
      <PostHogProvider>
        <ClerkProvider>
          <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
              {children}
            </TRPCProvider>
            <Toaster />
          </QueryClientProvider>
        </ClerkProvider>
      </PostHogProvider>
    </NuqsAdapter>
  );
};

export default AppProviders;
