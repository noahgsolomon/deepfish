import {
  QueryClient,
  MutationCache,
  defaultShouldDehydrateQuery,
  type QueryClientConfig,
  type QueryKey,
  type QueryOptions,
  FetchQueryOptions,
} from "@tanstack/react-query";
import superjson from "superjson";
import { toast } from "~/hooks/use-toast";

/* ---------- Toast meta types ---------- */

// Require a title (change to `title?: string` if you want it optional)
type ToastMetaObj = {
  title: string;
  description?: string;
};

// Allow either a string or the object form
type ToastMeta = string | ToastMetaObj;

/* ---------- Prefetch type guard ---------- */

type PrefetchLike = unknown; // what we store in meta (TRPC queryOptions objects, etc.)

function isFetchable(
  x: PrefetchLike,
): x is Pick<FetchQueryOptions, "queryKey" | "queryFn"> {
  return !!x && typeof x === "object" && "queryKey" in x && "queryFn" in x;
}

/* ---------- Augment react-query Register ---------- */
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      successToast?: ToastMeta;
      errorToast?: ToastMeta | ((err: unknown) => ToastMeta);
      invalidate?: QueryKey[];
      // keep permissive so you can pass `trpc.*.queryOptions()` directly
      prefetch?: PrefetchLike[];
    };
  }
}

/* ---------- QueryClient factory ---------- */
export function makeQueryClient(config: QueryClientConfig = {}) {
  const client = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: async (_data, _vars, _ctx, mutation) => {
        const meta = mutation.meta ?? {};

        if (meta.successToast) showToast(meta.successToast, "success");

        if (Array.isArray(meta.invalidate)) {
          for (const key of meta.invalidate) {
            await client.invalidateQueries({ queryKey: key });
          }
        }

        if (Array.isArray(meta.prefetch)) {
          for (const item of meta.prefetch) {
            if (isFetchable(item)) {
              await client.prefetchQuery({
                queryKey: item.queryKey,
                queryFn: item.queryFn,
              });
            }
          }
        }
      },
      onError: (err, _vars, _ctx, mutation) => {
        const meta = mutation.meta ?? {};

        if (meta.errorToast) {
          const payload =
            typeof meta.errorToast === "function"
              ? meta.errorToast(err)
              : meta.errorToast;
          showToast(payload, "destructive");
        }
      },
    }),
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        staleTime: 60_000,
        ...config.defaultOptions?.queries,
      },
      mutations: {
        retry: 0,
        ...config.defaultOptions?.mutations,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (q) =>
          defaultShouldDehydrateQuery(q) || q.state.status === "pending",
        ...config.defaultOptions?.dehydrate,
      },
      hydrate: {
        deserializeData: (data) => {
          const deserialized = superjson.deserialize(data);
          // Debug logging for hydration
          // if (typeof window !== "undefined") {
          //   console.log("[Hydration Debug]", {
          //     raw: data,
          //     deserialized,
          //   });
          // }
          return deserialized;
        },
        ...config.defaultOptions?.hydrate,
      },
    },
  });

  return client;
}

/* ---------- Toast dispatcher ---------- */

function showToast(
  meta: ToastMeta,
  variant: "default" | "destructive" | "success" = "default",
) {
  // NOTE: ensure your ToastProps['variant'] supports "success".
  // If not, map "success" -> "default" here.
  if (typeof meta === "string") {
    toast({ title: meta, variant });
  } else {
    toast({ ...meta, variant });
  }
}
