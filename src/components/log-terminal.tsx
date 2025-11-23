import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import { Terminal, X } from "lucide-react";
import { useEffect, useRef, ReactNode } from "react";

interface LogTerminalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  headerContent?: ReactNode;
}

export function LogTerminal({
  title,
  isOpen,
  onClose,
  logs,
  headerContent,
}: LogTerminalProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogPortal>
        <DialogTitle />
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogContent
          showX={false}
          className="bg-surface-primary border-border-default scanlines-terminal fixed top-[50%] left-[50%] z-[60] max-h-[85vh] w-[500px] max-w-[90vw] translate-x-[-50%] translate-y-[-50%] rounded-none border p-0"
        >
          <div className="bg-surface-elevated border-border-default flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Terminal size={14} />
              <span className="font-mono text-sm font-bold">{title}</span>
            </div>
            <DialogClose asChild>
              <Button
                variant="default"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X size={12} />
              </Button>
            </DialogClose>
          </div>

          {headerContent}

          <div
            ref={logContainerRef}
            className="text-text-default h-[350px] overflow-x-hidden overflow-y-auto p-3 font-mono text-xs select-text"
          >
            {logs.length === 0 ? (
              <div className="text-text-muted italic">No logs available</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className="mb-1 w-full break-words whitespace-pre-wrap"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
