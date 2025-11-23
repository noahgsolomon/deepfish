import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Save, X } from "lucide-react";

interface SaveFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowName: string;
  onSave: () => void;
  onDontSave: () => void;
}

export default function SaveFlowModal({
  open,
  onOpenChange,
  flowName,
  onSave,
  onDontSave,
}: SaveFlowModalProps) {
  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  const handleDontSave = () => {
    onDontSave();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-secondary border-border-default text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg">Save Changes?</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Do you want to save the changes you made to &quot;{flowName}&quot;?
            Your changes will be lost if you don&apos;t save them.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="blue"
            onClick={handleSave}
            className="flex-1 border-blue-500/30 bg-blue-500/20 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/30"
          >
            <Save size={12} />
            Save
          </Button>
          <Button
            type="button"
            variant="blue"
            onClick={handleDontSave}
            className="flex-1 border-red-500/30 bg-red-500/20 text-red-400 hover:border-red-500/50 hover:bg-red-500/30"
          >
            <X size={12} />
            Don&apos;t Save
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleCancel}
            className="mt-4 flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
