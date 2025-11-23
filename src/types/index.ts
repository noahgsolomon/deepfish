import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/routers/_app";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type User = RouterOutputs["user"]["getUser"];

export type FeaturedWorkflow =
  RouterOutputs["workflow"]["loadFeaturedWorkflows"][number];

export type UserWorkflowData =
  RouterOutputs["workflow"]["getUserWorkflows"][number]["data"];

export type Flow = RouterOutputs["flow"]["listFlows"][number];

export type PopularFlow = RouterOutputs["flow"]["getPopularFlows"][number];

export type FlowNoData = Omit<Flow, "data">;

export type Workflows = RouterOutputs["workflow"]["getAllWorkflows"];

export interface FlowInput {
  id: string;
  name: string;
  data: string;
  emoji?: string;
  thumbnail: string | null;
}

export type Workflow = RouterOutputs["workflow"]["getWorkflowBySlug"] & {
  status?: "idle" | "processing" | "complete" | "error";
  progress?: number;
};
