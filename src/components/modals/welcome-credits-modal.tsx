"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogPortal, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Terminal, Coins, Sparkles } from "lucide-react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";

interface WelcomeCreditsModalProps {
  open: boolean;
}

export default function WelcomeCreditsModal({
  open,
}: WelcomeCreditsModalProps) {
  const trpc = useTRPC();
  const [isClaiming, setIsClaiming] = useState(false);
  const claimWelcomeCredits = useMutation(
    trpc.user.claimWelcomeCredits.mutationOptions({
      meta: {
        successToast: {
          title: "Credits claimed",
          description: "You have claimed 2 free credits!",
        },
        errorToast: {
          title: "Error",
          description: "Failed to claim credits. Please try again.",
        },
        prefetch: [trpc.user.getUser.queryOptions()],
        invalidate: [trpc.user.getUser.queryKey()],
      },
      onSettled: () => {
        setIsClaiming(false);
      },
    }),
  );

  const handleClaim = async () => {
    setIsClaiming(true);
    claimWelcomeCredits.mutate();
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogTitle className="hidden">Welcome Credits</DialogTitle>
        <div className="fixed inset-0 z-[100] bg-black/80" />
        <DialogContent
          showX={false}
          className="border-border-default bg-surface-primary z-[101] w-[400px] max-w-[90vw] gap-0 overflow-hidden rounded-none border p-0 shadow-none"
        >
          <div className="bg-surface-elevated border-border-default flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-white" />
              <span className="font-mono text-xs text-white">
                DEEPFISH_WELCOME_BONUS
              </span>
              <div className="text-xs text-red-500">[NEW]</div>
            </div>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500/60" />
              <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
              <div className="h-2 w-2 rounded-full bg-green-500/60" />
            </div>
          </div>

          <div className="space-y-4 p-4">
            <Image
              src="/welcome-credits.gif"
              alt="Welcome Credits"
              className="mx-auto"
              width={150}
              height={150}
            />

            <div className="space-y-3">
              <h2 className="text-center font-mono text-xl font-bold text-white">
                CLAIM FREE CREDITS!
              </h2>
              <p className="text-text-secondary text-center font-mono text-xs">
                As a welcome to the platform, we'd like to offer you{" "}
                <span className="font-bold text-yellow-400">
                  2 free credits
                </span>
                ! Use these credits to explore our AI workflows and see what
                Deep Fish can do.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="flex w-full items-center justify-center gap-2 rounded-none border border-yellow-500/30 bg-yellow-500/20 px-4 py-2 font-mono text-xs text-yellow-400 transition-all duration-150 hover:border-yellow-500/50 hover:bg-yellow-500/30 disabled:opacity-50"
              >
                {isClaiming ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-400/30 border-t-yellow-400" />
                    <span>CLAIMING...</span>
                  </>
                ) : (
                  <span>CLAIM FREE CREDITS</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
