import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { User } from "~/types";
import { QueryInput, Trpc } from "~/types/query";

/* ---------- Queries ---------- */
export function useUser() {
  const trpc = useTRPC();
  return useQuery(trpc.user.getUser.queryOptions());
}

export function useUserById(
  input: QueryInput<Trpc["user"]["getUserById"]>,
  { initialData, enabled }: { initialData?: User | null; enabled?: boolean },
) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.user.getUserById.queryOptions(input),
    initialData,
    enabled,
  });
}

/* ---------- Mutations ---------- */
export function useUpdateUser(
  options?: Parameters<Trpc["user"]["updateUser"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();
  return useMutation({
    ...trpc.user.updateUser.mutationOptions(options),
    meta: {
      ...options?.meta,
      prefetch: [trpc.user.getUser.queryOptions()],
      invalidate: [trpc.user.getUser.queryKey()],
    },
  });
}
