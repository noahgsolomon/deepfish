"use client";

import { FilePlus, Redo2, Save, Undo2 } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";

interface EditActionsProps {
  canUndo: boolean;
  canRedo: boolean;
  onAddNode: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const EditActions = ({
  canUndo,
  canRedo,
  onAddNode,
  onSave,
  onUndo,
  onRedo,
}: EditActionsProps) => {
  return (
    <>
      <Button
        onClick={onUndo}
        className="hidden h-8 rounded-none border border-gray-500/30 bg-gray-500/20 px-2 py-1 font-mono text-xs text-gray-300 hover:bg-gray-500/30 sm:block"
        title="Undo ⌘+Z"
        disabled={!canUndo}
      >
        <Undo2 size={14} />
      </Button>
      <Button
        onClick={onRedo}
        className="hidden h-8 rounded-none border border-gray-500/30 bg-gray-500/20 px-2 py-1 font-mono text-xs text-gray-300 hover:bg-gray-500/30 sm:block"
        title="Redo ⌘+Shift+Z"
        disabled={!canRedo}
      >
        <Redo2 size={14} />
      </Button>
      <Button
        onClick={onSave}
        className="h-8 rounded-none border border-green-500/30 bg-green-500/20 px-3 py-1 font-mono text-xs text-green-400 hover:bg-green-500/30"
        title="Save draft ⌘+S"
      >
        <Save size={14} className="mr-1.5" />
        SAVE
      </Button>
      <Button
        onClick={onAddNode}
        className="h-8 rounded-none border border-purple-500/30 bg-purple-500/20 px-3 py-1 font-mono text-xs text-purple-400 hover:bg-purple-500/30"
        title="Add Node ⌘+A"
      >
        <FilePlus size={14} className="mr-1.5" />
        ADD NODE
      </Button>
    </>
  );
};

export default EditActions;
