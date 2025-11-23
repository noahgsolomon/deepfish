import { vanillaApi } from "./trpc/vanilla";

export async function addRun(
  workflowId: number,
  provider: "replicate" | "fal",
  inputs?: Record<string, any>,
): Promise<number> {
  const result = await vanillaApi.workflow.addRun.mutate({
    workflowId,
    provider,
    inputs,
  });
  return result.runId;
}

export async function updateRun(
  runId: number,
  status: "running" | "completed" | "failed" | "cancelled",
  output?: any,
  error?: string,
): Promise<void> {
  await vanillaApi.workflow.updateRun.mutate({
    runId,
    status,
    output,
    error,
  });
}

export async function checkCachedRun(
  workflowId: number,
  inputs: Record<string, any>,
): Promise<{
  found: boolean;
  output?: any;
  runId?: number;
  completedAt?: Date | null;
}> {
  return await vanillaApi.workflow.checkCachedRun.query({
    workflowId,
    inputs,
  });
}
