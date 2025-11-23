import type { useTRPC } from "~/trpc/client";
import { UseMutationOptions } from "@tanstack/react-query";

export type Trpc = ReturnType<typeof useTRPC>;

/* ---------- option tuples ---------- */
export type QueryOptionsTuple<P> = P extends {
  queryOptions: (...args: infer A) => any;
}
  ? A
  : never;

/* ---------- friendly aliases ---------- */
export type QueryInput<P> = QueryOptionsTuple<P>[0];

export type MutationLifecycleOptions = Pick<
  UseMutationOptions,
  "meta" | "onSuccess" | "onError" | "onSettled" | "onMutate"
>;
