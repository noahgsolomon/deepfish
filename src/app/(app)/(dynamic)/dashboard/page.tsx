import { cookies } from "next/headers";
// import { unstable_cache } from "next/cache";
import HomeClient from "../../home-client";
import { staticServerApi } from "~/lib/trpc/server-client";

import { unstable_cache } from "next/cache";
import {
  getServerQueryClient,
  HydrateClient,
  trpcQueryOptions,
  trpcServerCaller,
} from "~/trpc/server";
import { PopularFlow } from "~/types";

export const dynamic = "force-dynamic";

// Cache the popular flows query persistently across requests
// This will only re-run when the cache is invalidated (every 60 seconds due to revalidate)
const getCachedPopularFlows = unstable_cache(
  async (): Promise<PopularFlow[]> => {
    // Reduce the limit to avoid hitting the 2MB cache limit
    const result = await staticServerApi.flow.getPopularFlows.query({
      limit: 24,
    });

    return result;

    // return result.map((r) => {
    //   return optimizeFlowData(r);
    // });
  },
  ["popular-flows"], // Cache key
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ["popular-flows"], // Cache tags for manual invalidation if needed
  },
);

export default async function Page() {
  const queryClient = getServerQueryClient();

  // Read cookies (dynamic) - this part runs on every request
  const c = await cookies();
  const initCounts = {
    user: Number(c.get("cachedAmountOfUserFlows")?.value ?? 0),
    popular: Number(c.get("cachedAmountOfPopularFlows")?.value ?? 6),
  };

  // Get cached data - these are cached and don't run on every request
  const popularFlows = await getCachedPopularFlows();

  await queryClient.prefetchQuery(
    trpcQueryOptions.flow.listFlows.queryOptions({ withData: true }),
  );

  queryClient.setQueryData(
    trpcQueryOptions.flow.getPopularFlows.queryKey({ limit: 24 }),
    popularFlows,
  );

  return (
    <HydrateClient>
      <HomeClient initCounts={initCounts} />
    </HydrateClient>
  );
}
