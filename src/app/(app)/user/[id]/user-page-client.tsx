"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import FlowSection from "~/components/flow-section";
import UserProfileClient from "./user-profile-client";
import { type User } from "~/types";
import { useTRPC } from "~/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useUser, useUserById } from "~/hooks/auth";

interface UserPageClientProps {
  initialUser?: User | null;
  initialFlows?: any[];
  initialWorkflows?: any[];
  userId: number;
}

export default function UserPageClient({
  initialUser,
  initialFlows = [],
  initialWorkflows = [],
  userId,
}: UserPageClientProps) {
  const [mounted, setMounted] = useState(false);
  const trpc = useTRPC();

  const { data: currentUser } = useUser();

  const { data: user } = useUserById(userId, {
    initialData: initialUser,
    enabled: mounted,
  });

  const isCurrentUser = currentUser?.id === userId;

  const { data: userFlows, isLoading: flowsLoading } = useQuery({
    ...(isCurrentUser
      ? trpc.flow.listFlows.queryOptions({ withData: false })
      : trpc.flow.listUserPublicFlows.queryOptions(userId)),
    initialData: initialFlows,
    enabled: mounted && isCurrentUser,
  });

  const { data: userWorkflows, isLoading: workflowsLoading } = useQuery({
    ...(isCurrentUser
      ? trpc.workflow.getUserWorkflows.queryOptions()
      : trpc.workflow.getUserPublicWorkflows.queryOptions(userId)),
    initialData: initialWorkflows,
    enabled: mounted && isCurrentUser,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!user && mounted) {
    redirect("/");
  }

  const flows = userFlows || initialFlows || [];
  const workflows = userWorkflows || initialWorkflows || [];
  const totalRuns = flows.reduce((acc, flow) => acc + (flow.runs || 0), 0);

  const showFlowsLoading = flowsLoading && mounted && !initialFlows.length;
  const showWorkflowsLoading =
    workflowsLoading && mounted && !initialWorkflows.length;

  return (
    <main className="flex-1 pt-8 pb-24">
      <div className="container px-4">
        <UserProfileClient
          user={(user ?? initialUser)!}
          totalRuns={totalRuns}
          isCurrentUser={isCurrentUser}
        />
      </div>

      {flows.length > 0 || isCurrentUser ? (
        <FlowSection
          title={isCurrentUser ? "MY FLOWS" : "PUBLIC FLOWS"}
          flows={flows}
          isLoading={showFlowsLoading}
          variant={isCurrentUser ? "user" : "profile"}
          initialCount={flows.length}
          showCreateButton={isCurrentUser}
        />
      ) : (
        <div className="container px-4">
          <h3 className="text-text-emphasis mt-4 mb-2 font-mono text-lg font-bold">
            PUBLIC FLOWS
          </h3>
          <p className="text-text-muted text-sm">No public flows yet</p>
        </div>
      )}
    </main>
  );
}
