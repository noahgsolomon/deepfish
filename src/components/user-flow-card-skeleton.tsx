import { cn } from "~/lib/utils";
import React from "react";

interface Props {
  className?: string;
}

export default function UserFlowCardSkeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "border-border-default bg-surface-secondary flex animate-pulse flex-col rounded-none border p-2",
        className,
      )}
    >
      {/* 16:9 thumbnail skeleton */}
      <div className="border-border-default bg-surface-primary relative mb-2 aspect-[16/9] w-full border" />

      {/* Title */}
      <div className="mb-4 h-5 w-1/2 bg-white/10" />

      {/* Modality badges row */}
      <div className="mb-2 flex items-center gap-1">
        <div className="h-4 w-8 bg-white/10" />
        <div className="h-4 w-10 bg-white/10" />
      </div>

      {/* Spacer to push buttons to bottom */}
      <div className="flex-grow" />

      {/* Button row */}
      <div className="mt-auto flex gap-2">
        <div className="h-6 flex-1 bg-white/10" />
        <div className="h-6 flex-1 bg-white/10" />
      </div>
    </div>
  );
}
