"use client";

import { Coins, Sparkles } from "lucide-react";
import { useUser } from "~/hooks/auth";
import { useModalStore } from "~/store/use-modal-store";

export default function CreditPurchaseFlowCard() {
  const setSettingsOpen = useModalStore((s) => s.setSettingsOpen);
  const { data: user } = useUser();
  const credits = user?.creditBalance ?? 0;

  if (credits > 10) return null;

  return (
    <div
      className="w-64 flex-none snap-start transition-opacity duration-200"
      data-card-id="credit-purchase"
    >
      <div
        className="group border-border-default bg-surface-secondary hover:bg-surface-hover hover:border-border-strong flex h-full cursor-pointer flex-col rounded-none border p-2 transition-all"
        onClick={() => setSettingsOpen(true)}
      >
        <div className="border-border-default bg-surface-primary relative mb-2 flex aspect-[16/9] w-full items-center justify-center overflow-hidden border">
          <div className="absolute inset-0">
            <Sparkles className="text-text-muted absolute top-4 left-4 h-4 w-4 animate-pulse" />
            <Sparkles
              className="text-text-muted absolute right-4 bottom-4 h-3 w-3 animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
            <Sparkles
              className="text-text-muted absolute top-8 right-8 h-5 w-5 animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <Sparkles
              className="text-text-muted absolute bottom-8 left-8 h-3 w-3 animate-pulse"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <div className="bg-surface-primary border-border-default group-hover:bg-surface-hover group-hover:border-border-emphasis flex h-16 w-16 items-center justify-center border transition-all">
              <Coins className="text-text-muted group-hover:text-text-secondary h-8 w-8 transition-colors" />
            </div>
            <div className="border border-yellow-500/50 bg-yellow-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-yellow-100">
              {credits === 0
                ? "0 CREDITS"
                : `${credits} CREDIT${credits === 1 ? "" : "S"}`}
            </div>
          </div>
        </div>

        <h3 className="text-text-secondary group-hover:text-text-emphasis mb-1 font-mono text-xs font-bold uppercase">
          {credits === 0 ? "OUT OF CREDITS" : "LOW ON CREDITS"}
        </h3>

        <div className="mt-auto">
          <button className="flex h-6 w-full items-center justify-center gap-1 border border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-400 transition-colors hover:bg-yellow-500/20">
            <Sparkles className="h-3 w-3" />
            BUY CREDITS
          </button>
        </div>
      </div>
    </div>
  );
}
