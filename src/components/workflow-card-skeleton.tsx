import { cn } from "~/lib/utils";
import React from "react";

interface WorkflowCardSkeletonProps {
  className?: string;
  index?: number;
}

export function WorkflowCardSkeleton({ className }: WorkflowCardSkeletonProps) {
  return (
    <div
      className={cn(
        `border-border-default bg-surface-secondary relative flex h-[100px] animate-pulse flex-row rounded-none border p-1 transition-all duration-300`,
        className,
      )}
    >
      {/* Avatar Image Skeleton */}
      <div className="border-border-default bg-surface-primary mr-2 h-full w-24 border" />

      {/* Title & description */}
      <div className="flex-1 py-1">
        <div className="mb-2 h-3 w-1/2 bg-white/10" />
        <div className="mb-1 h-2 w-3/4 bg-white/10" />
        <div className="h-2 w-2/5 bg-white/10" />
      </div>
    </div>
  );
}
