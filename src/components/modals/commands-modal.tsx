"use client";

import { Dialog, DialogContent, DialogPortal, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { X, Command } from "lucide-react";

interface CommandsModalProps {
  open: boolean;
  onClose: () => void;
  commands: {
    keys: string[];
    description: string;
  }[];
  title: string;
}

export default function CommandsModal({
  open,
  onClose,
  commands,
  title,
}: CommandsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogTitle className="hidden">Keyboard Shortcuts</DialogTitle>
        <div className="fixed inset-0 z-[110] bg-black/50" />
        <DialogContent
          showX={false}
          className="border-border-default bg-surface-primary z-[111] w-[350px] max-w-[90vw] gap-0 overflow-hidden rounded-none border p-0 shadow-none"
        >
          {/* Header */}
          <div className="bg-surface-elevated border-border-default flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Command size={14} className="text-white" />
              <span className="font-mono text-xs text-white uppercase">
                {title} SHORTCUTS
              </span>
            </div>
            <Button
              variant="default"
              size="icon"
              className="h-6 w-6 rounded-none border-none bg-transparent hover:bg-white/10"
              onClick={onClose}
            >
              <X size={12} />
            </Button>
          </div>

          {/* Commands List */}
          <div className="space-y-2 p-4">
            {commands.map((cmd, index) => (
              <div
                key={index}
                className="border-border-subtle flex items-center justify-between border bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-1">
                  {cmd.keys.map((key, i) => (
                    <span key={i} className="flex items-center">
                      {i > 0 && <span className="text-text-muted mx-1">+</span>}
                      <kbd className="border-border-default rounded-none border bg-black px-1.5 py-0.5 font-mono text-xs text-white">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
                <span className="text-text-default ml-4 font-mono text-xs">
                  {cmd.description}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
