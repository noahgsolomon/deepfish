"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

interface AgeVerificationModalProps {
  isOpen: boolean;
  onVerify: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export function AgeVerificationModal({
  isOpen,
  onVerify,
  onCancel,
}: AgeVerificationModalProps) {
  const [isHoveringYes, setIsHoveringYes] = useState(false);
  const [isHoveringNo, setIsHoveringNo] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!isOpen) return null;

  const handleVerify = () => {
    onVerify(dontAskAgain);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-surface-secondary relative w-full max-w-md rounded-none border border-red-500/30 p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-red-500" />
          <h2 className="font-mono text-xl text-white">
            AGE VERIFICATION REQUIRED
          </h2>
        </div>

        {/* Content */}
        <div className="mb-4 space-y-4">
          <p className="text-text-emphasis font-mono text-sm">
            This flow contains NSFW (Not Safe For Work) content that may include
            adult material.
          </p>
          <p className="text-text-emphasis font-mono text-sm">
            By continuing, you confirm that you are 18 years of age or older and
            willing to view such content.
          </p>
          <div className="border-border-emphasis border bg-white/10 p-3">
            <p className="text-text-emphasis font-mono text-xs">
              WARNING: This content may not be suitable for all audiences.
            </p>
          </div>
        </div>

        {/* Don't ask again checkbox */}
        <div className="mb-6 flex items-center gap-2 pl-1">
          <Checkbox
            id="dont-ask-again"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
          />
          <label
            htmlFor="dont-ask-again"
            className="text-text-secondary cursor-pointer font-mono text-xs select-none"
          >
            Don't ask me again
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={onCancel}
            onMouseEnter={() => setIsHoveringNo(true)}
            onMouseLeave={() => setIsHoveringNo(false)}
            className="flex-1 border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-400 transition-all hover:bg-red-500/20"
          >
            {isHoveringNo ? "EXIT" : "NO"}
          </Button>
          <Button
            onClick={handleVerify}
            onMouseEnter={() => setIsHoveringYes(true)}
            onMouseLeave={() => setIsHoveringYes(false)}
            className="flex-1 border border-green-500/30 bg-green-500/10 px-4 py-3 font-mono text-sm text-green-400 transition-all hover:bg-green-500/20"
          >
            {isHoveringYes ? "I AM 18+ AND WISH TO CONTINUE" : "YES, I AM 18+"}
          </Button>
        </div>
      </div>
    </div>
  );
}
