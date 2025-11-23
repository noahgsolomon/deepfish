"use client";

import { useStatusBarStore } from "~/store/use-status-bar-store";
import { useEffect } from "react";
import WorkflowInputCard from "../_components/workflow-input-card";
import WorkflowOutputCard from "../_components/workflow-output-card";
import { Snowflake } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useWorkflowBySlug } from "~/hooks/workflows";

export default function WorkflowClient({ slug }: { slug: string }) {
  const router = useRouter();

  const { data: workflow, isLoading: isLoadingWorkflow } =
    useWorkflowBySlug(slug);

  const setCurrentPage = useStatusBarStore((s) => s.setCurrentPage);
  const setLeftText = useStatusBarStore((s) => s.setLeftText);
  const setLeftUrl = useStatusBarStore((s) => s.setLeftUrl);
  const setRightText = useStatusBarStore((s) => s.setRightText);
  const setStatusText = useStatusBarStore((s) => s.setStatusText);
  const setStatusType = useStatusBarStore((s) => s.setStatusType);

  useEffect(() => {
    if (workflow) {
      setCurrentPage("workflow");
      setLeftText(`WORKFLOW :: ${workflow.data.title}`);
      setLeftUrl(workflow.data.link || null);
      setRightText(`IMAGE :: ${workflow.title}`);

      if (status === "idle") {
        setStatusText("READY");
        setStatusType("idle");
      } else if (status === "processing") {
        setStatusText("PROCESSING...");
        setStatusType("processing");
      } else if (status === "complete") {
        setStatusText("COMPLETE");
        setStatusType("complete");
      } else if (status === "error") {
        setStatusText("ERROR");
        setStatusType("error");
      } else {
        setStatusText(null);
        setStatusType(null);
      }
    }
  }, [
    workflow,
    setCurrentPage,
    setLeftText,
    setLeftUrl,
    setRightText,
    setStatusText,
    setStatusType,
  ]);

  if (!workflow && !isLoadingWorkflow) {
    router.push("/404");
    return null;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex-1 bg-black px-4 py-8">
        <div className="flex h-full flex-col bg-black text-white">
          <div className="relative z-10 flex-1">
            <div className="container mx-auto max-w-screen-xl">
              <div className="flex w-full flex-row items-center justify-between">
                <div className="mb-4 lg:mb-8">
                  <div className="text-text-muted mb-1 hidden items-center space-x-1 font-mono text-xs sm:flex">
                    <Link
                      href="/dashboard"
                      className="transition-colors hover:text-blue-400"
                    >
                      WORKFLOWS
                    </Link>
                    <span>/</span>
                    <span>{workflow?.data.title}</span>
                  </div>
                  <h1 className="font-mono text-2xl font-bold">
                    {workflow?.data.shortTitle || workflow?.data.title}
                  </h1>
                  <p className="text-text-secondary hidden font-mono text-sm sm:block">
                    {workflow?.data.shortDescription ||
                      workflow?.data.description}
                  </p>
                </div>
              </div>

              {workflow?.data.coldStart && (
                <div className="my-2 mt-2 hidden flex-row items-center gap-2 rounded-none border border-blue-500/30 bg-blue-500/20 px-4 py-2 font-mono text-xs text-blue-400 sm:flex">
                  <Snowflake className="h-3 w-3" /> Cold start: this workflow
                  will take 4-6 minutes to boot from a cold start due to
                  Replicate&apos;s scaling policies.
                </div>
              )}

              <div className="flex flex-col gap-6 md:flex-row">
                <WorkflowInputCard slug={slug} />
                <WorkflowOutputCard slug={slug} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
