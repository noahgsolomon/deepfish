"use client";

import { GitFork } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";

interface ViewActionsProps {
  isForking: boolean;
  onFork: () => void;
}

const ViewActions = ({ isForking, onFork }: ViewActionsProps) => {
  return (
    <>
      <div className="flex h-8 items-center rounded-none border border-yellow-500/30 bg-yellow-500/20 px-3 py-1 font-mono text-xs text-yellow-400 hover:bg-yellow-500/30">
        FORK TO EDIT
      </div>
      <Button
        onClick={onFork}
        className="h-8 rounded-none border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 font-mono text-xs text-indigo-400 hover:bg-indigo-500/30"
        disabled={isForking}
      >
        <GitFork size={14} className="mr-1.5" />
        {isForking ? "FORKING..." : "FORK"}
      </Button>
    </>
  );
};

export default ViewActions;
