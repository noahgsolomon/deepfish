"use client";

import React, { useState } from "react";
import { useToast } from "~/hooks/use-toast";
import { useModalStore } from "~/store/use-modal-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Download } from "lucide-react";
import { useAddUserWorkflow } from "~/hooks/workflows";

export default function RegisterWorkflowModal() {
  const registerWorkflowOpen = useModalStore((s) => s.registerWorkflowOpen);
  const setRegisterWorkflowOpen = useModalStore(
    (s) => s.setRegisterWorkflowOpen,
  );

  const { mutateAsync: addUserWorkflow } = useAddUserWorkflow();

  const { toast } = useToast();
  const [modelUrl, setModelUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!modelUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a valid model URL",
        variant: "destructive",
      });
      return;
    }

    // Determine if this is a Replicate or Fal.ai URL
    const isReplicate = modelUrl.includes("replicate.com");
    const isFal = modelUrl.includes("fal.ai");

    if (!isReplicate && !isFal) {
      toast({
        title: "Unsupported URL",
        description: "Currently only Replicate and Fal.ai models are supported",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Add the user workflow using the backend function
      if (isReplicate) {
        await addUserWorkflow({
          workflowUrl: modelUrl,
          workflowDefinition: null,
        });
      } else if (isFal) {
        await addUserWorkflow({
          workflowUrl: modelUrl,
          workflowDefinition: null,
        });
      }

      toast({
        title: "Model Workflow Added",
        description: `The model workflow has been added to your collection.`,
        variant: "success",
      });

      // Reset form
      setIsSubmitting(false);
      setModelUrl("");
      setRegisterWorkflowOpen(false);
    } catch (error) {
      console.error("Failed to add model workflow:", error);
      toast({
        title: "Failed to Add Model Workflow",
        description: `${error}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={registerWorkflowOpen} onOpenChange={setRegisterWorkflowOpen}>
      <DialogContent className="bg-surface-primary border-border-default text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">
            REGISTER NEW WORKFLOW
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-text-emphasis font-mono text-sm">
              Model URL
            </label>
            <Input
              type="text"
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
              placeholder="https://replicate.com/owner/model-name"
              className="bg-surface-tertiary border-border-subtle font-mono text-sm text-white"
              autoComplete="off"
            />
            {/*
            <Button
              type="button"
              variant="default"
              className="text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 flex items-center gap-1"
              size={"sm"}
              onClick={() => {
                setRegisterWorkflowOpen(false);
                setCommandPaletteMode("recommended");
                setCommandPaletteOpen(true);
              }}
            >
              <Sparkles size={8} />
              View Recommended
            </Button> */}
            <p className="text-text-muted text-xs">
              Currently supports Replicate and Fal.ai models{" "}
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            onClick={() => setRegisterWorkflowOpen(false)}
            className="border-border-default bg-surface-secondary hover:bg-surface-hover text-text-secondary h-9 border text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !modelUrl.trim()}
            className="flex h-9 items-center gap-1 border border-blue-500/30 bg-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/30"
          >
            <Download size={14} />
            {isSubmitting ? "Importing…" : "Import Model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
