import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

interface NewFlowModalProps {
  open: boolean;
  onClose(): void;
  onSave(name: string): void;
}

export default function NewFlowModal({
  open,
  onClose,
  onSave,
}: NewFlowModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    setSubmitting(true);
    onSave(name.trim());
    setSubmitting(false);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface-primary border-border-default text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg">Name New Flow</DialogTitle>
          <DialogDescription className="text-text-secondary text-sm">
            Provide a readable name for this flow.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Input
            placeholder="My Flow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-surface-tertiary border-border-subtle font-mono text-sm text-white"
            autoFocus
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            onClick={onClose}
            className="border-border-default bg-surface-secondary hover:bg-surface-hover text-text-secondary h-9 border text-xs"
          >
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || submitting}
            onClick={handleSave}
            className="h-9 border border-blue-500/30 bg-blue-500/10 text-xs text-blue-400 hover:bg-blue-500/20"
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
