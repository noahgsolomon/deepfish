"use client";

import { Coins } from "lucide-react";
import { useModalStore } from "~/store/use-modal-store";
import { useUser } from "~/hooks/auth";

export default function CreditBalance() {
  const { data: user } = useUser();
  const credits = user?.creditBalance ?? 0;
  const setSettingsOpen = useModalStore((s) => s.setSettingsOpen);

  return (
    <button
      onClick={() => setSettingsOpen(true)}
      className="z-10 flex h-6 items-center gap-1 rounded-none border border-pink-500/30 bg-pink-500/20 px-2 py-0.5 font-mono text-[10px] text-pink-400 transition-all duration-300 hover:bg-pink-500/30"
      title="View or buy credits"
    >
      <Coins size={11} className="mr-1 text-pink-400" />
      <span className="font-bold">{credits.toLocaleString()}</span>
      <span className="ml-0.5 text-[9px] text-pink-300/80">CREDITS</span>
    </button>
  );
}
