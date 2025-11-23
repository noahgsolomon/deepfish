import {
  useQuery,
  useMutation,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { Trpc } from "~/types/query";
import type { Flow, User } from "~/types";
import { persistCount } from "~/utils/persist-count";
import { useRouter } from "next/navigation";

// Extend Flow type to include isPublic
export type FlowWithVisibility = Flow & { isPublic?: boolean };
export type FlowWithUser = Flow & { user: User };

/* ---------- Queries ---------- */

// Get all user flows
export function useUserFlows(options?: { withData?: boolean }) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.flow.listFlows.queryOptions({
      withData: options?.withData ?? true,
    }),
    select: (data) => {
      // Persist count for offline indicator
      try {
        persistCount("cachedAmountOfUserFlows", data.length);
      } catch {}
      return data as FlowWithVisibility[];
    },
  });
}

// Get popular flows
export function usePopularFlows(limit: number = 24) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.flow.getPopularFlows.queryOptions({ limit }),
    select: (data) => {
      try {
        persistCount("cachedAmountOfPopularFlows", data.length);
      } catch {}
      return data as FlowWithVisibility[];
    },
  });
}

// Get single flow
export function useFlow(flowId: string, enabled: boolean = true) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.flow.getFlow.queryOptions({ flowId }),
    enabled: !!flowId && enabled,
  });
}

// Get public flow
export function usePublicFlow(
  flowId: string,
  options?: Omit<
    Parameters<Trpc["flow"]["getPublicFlow"]["queryOptions"]>[1],
    "flowId"
  >,
) {
  const trpc = useTRPC();
  return useQuery(trpc.flow.getPublicFlow.queryOptions({ flowId }, options));
}

// Get public flows
export function usePublicFlows(flowIds: string[]) {
  const trpc = useTRPC();
  return useQueries({
    queries: flowIds.map((id) =>
      trpc.flow.getPublicFlow.queryOptions({ flowId: id }),
    ),
  });
}

/* ---------- Mutations ---------- */

// Save flow mutation
export function useSaveFlow(
  options?: Parameters<Trpc["flow"]["saveFlow"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.flow.saveFlow.mutationOptions({
      onMutate: (data) => {
        options?.onMutate?.(data);
        const previousData = queryClient.getQueryData(
          trpc.flow.listFlows.queryKey({ withData: true }),
        );

        // Create a complete FlowWithVisibility object for optimistic update
        const newFlow: FlowWithVisibility = {
          id: data.id,
          name: data.name,
          data: data.data,
          thumbnail: data.thumbnail ?? null,
          emoji: data.emoji ?? "🐠",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          nsfw: false,
          userId: 0,
          runs: 0,
          isPublic: false,
          exampleOutputType: null,
          exampleOutput: null,
        };

        queryClient.setQueryData(
          trpc.flow.listFlows.queryKey({ withData: true }),
          (old: FlowWithVisibility[] | undefined) => {
            if (!old) return [newFlow];
            const existingIndex = old.findIndex((f) => f.id === data.id);
            if (existingIndex >= 0) {
              const updated = [...old];
              updated[existingIndex] = { ...old[existingIndex], ...newFlow };
              return updated;
            }
            return [...old, newFlow];
          },
        );
        return { previousData };
      },
      onError: (_, __, context) => {
        queryClient.setQueryData(
          trpc.flow.listFlows.queryKey({ withData: true }),
          context?.previousData,
        );
      },
    }),
    meta: {
      ...options?.meta,
      invalidate: [trpc.flow.listFlows.pathKey()],
    },
  });
}

// Delete flow mutation
export function useDeleteFlow(
  options?: Parameters<Trpc["flow"]["deleteFlow"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.flow.deleteFlow.mutationOptions({
      ...options,
      onMutate: (data) => {
        options?.onMutate?.(data);
        const previousData = queryClient.getQueryData(
          trpc.flow.listFlows.queryKey({ withData: true }),
        );
        queryClient.setQueryData(
          trpc.flow.listFlows.queryKey({ withData: true }),
          (old: FlowWithVisibility[] | undefined) =>
            old?.filter((f) => f.id !== data.flowId) ?? [],
        );
        return { previousData };
      },
      onError: (_, __, context) => {
        queryClient.setQueryData(
          trpc.flow.listFlows.queryKey({ withData: true }),
          context?.previousData,
        );
      },
    }),
    meta: {
      ...options?.meta,
      invalidate: [trpc.flow.listFlows.pathKey()],
    },
  });
}

// Rename flow mutation
export function useRenameFlow(
  options?: Parameters<Trpc["flow"]["renameFlow"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.flow.renameFlow.mutationOptions(options),
    meta: {
      ...options?.meta,
      invalidate: [trpc.flow.listFlows.pathKey()],
    },
  });
}

// Toggle flow visibility mutation
export function useToggleFlowVisibility(
  options?: Parameters<
    Trpc["flow"]["toggleFlowVisibility"]["mutationOptions"]
  >[0],
) {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.flow.toggleFlowVisibility.mutationOptions(options),
    meta: {
      ...options?.meta,
      invalidate: [trpc.flow.listFlows.pathKey()],
    },
  });
}

// Fork flow mutation
export function useForkFlow(
  options?: Parameters<Trpc["flow"]["forkFlow"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation({
    ...trpc.flow.forkFlow.mutationOptions({
      onSuccess: (newFlow: { flowId: string }) => {
        router.push(`/composer/${newFlow.flowId}`);
      },
      ...options,
    }),
    meta: {
      invalidate: [trpc.flow.listFlows.pathKey()],
      successToast: {
        title: "Flow forked successfully",
        description: "You can now edit your own copy of this flow.",
      },
      errorToast: (error: any) => ({
        title: "Failed to fork flow",
        description: error.message || "Please try again later",
      }),
      ...options?.meta,
    },
  });
}

// Increment flow runs mutation
export function useIncrementFlowRuns(
  options?: Parameters<Trpc["flow"]["incrementRuns"]["mutationOptions"]>[0],
) {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.flow.incrementRuns.mutationOptions(options),
  });
}

// Update flow example output mutation
export function useUpdateFlowExampleOutput(
  options?: Parameters<
    Trpc["flow"]["updateFlowExampleOutput"]["mutationOptions"]
  >[0],
) {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.flow.updateFlowExampleOutput.mutationOptions(options),
    meta: {
      ...options?.meta,
      invalidate: [trpc.flow.listFlows.pathKey()],
    },
  });
}
