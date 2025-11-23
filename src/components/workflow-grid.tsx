"use client";

import { AiCard } from "./ai-card";
import { WorkflowCardSkeleton } from "./workflow-card-skeleton";
import { useModalStore } from "~/store/use-modal-store";
import { gridCols } from "~/lib/utils";
import { useAllWorkflows } from "~/hooks/workflows";

interface WorkflowGridProps {
  variant?: "home" | "profile";
}

export function WorkflowGrid({ variant = "home" }: WorkflowGridProps) {
  const setRegisterWorkflowOpen = useModalStore(
    (s) => s.setRegisterWorkflowOpen,
  );
  const { data: workflows } = useAllWorkflows();

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {workflows?.workflows.map((wf) => (
        <AiCard key={wf.title} item={wf} />
      ))}

      {workflows?.workflows.length === 0 &&
        variant === "home" &&
        Array(12)
          .fill(0)
          .map((_, index) => (
            <WorkflowCardSkeleton key={index} index={index} />
          ))}

      {/* {true && (
      <div
        className={`flex flex-row p-1 rounded-none transition-all group border border-dashed border-border-default bg-surface-secondary hover:border-border-strong hover:bg-surface-hover cursor-pointer h-[100px]`}
        onClick={() => {
          setRegisterWorkflowOpen(true);
        }}
      >
        <div className="w-24 h-full flex items-center justify-center border border-border-default bg-surface-primary">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            fill="none"
            strokeLinecap="butt"
            className="text-text-muted group-hover:text-text-secondary transition-colors"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className="flex-1 pl-2 flex flex-col justify-center">
          <h3 className="text-xs font-bold font-mono text-text-secondary group-hover:text-text-emphasis mb-1">
            REGISTER NEW WORKFLOW
          </h3>
          <p className="text-[10px] text-text-muted font-mono line-clamp-2">
            Import a model from Replicate or Fal
          </p>
        </div>
      </div>
      )} */}
    </div>
  );
}
