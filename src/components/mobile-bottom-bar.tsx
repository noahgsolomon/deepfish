"use client";

import { usePanelStore } from "~/store/use-panel-store";
import { useModalStore } from "~/store/use-modal-store";
import { TerminalHistory } from "./icons/terminal-history";
import { TerminalQueue } from "./icons/terminal-queue";
import { TerminalComposer } from "./icons/terminal-composer";
import { TerminalSettings } from "./icons/terminal-settings";
import Link from "next/link";
import { useActiveRunCount } from "~/hooks/workflow-runs/use-active-runs";
import Image from "next/image";

export default function MobileBottomBar() {
  const toggleQueueOpen = usePanelStore((s) => s.toggleQueueOpen);
  const toggleHistoryPanelOpen = usePanelStore((s) => s.toggleHistoryPanelOpen);
  const toggleFlowPanelOpen = usePanelStore((s) => s.toggleFlowPanelOpen);
  const setSettingsOpen = useModalStore((s) => s.setSettingsOpen);
  const { total: queueCount } = useActiveRunCount();

  return (
    <nav className="bg-surface-primary border-border-default fixed right-0 bottom-0 left-0 z-[95] flex h-20 border-t pb-4 text-white sm:hidden">
      <ul className="flex h-full w-full items-center justify-around text-center font-mono text-[10px]">
        <li className="flex flex-1 flex-col items-center justify-center">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center"
          >
            <Image src="/app-icon.png" alt="Logo" width={28} height={28} />
            <span>Home</span>
          </Link>
        </li>
        <li
          className="flex flex-1 flex-col items-center justify-center"
          onClick={toggleHistoryPanelOpen}
        >
          <TerminalHistory />
          <span>History</span>
        </li>
        <li
          className="relative flex flex-1 flex-col items-center justify-center"
          onClick={toggleQueueOpen}
        >
          <TerminalQueue />
          {queueCount > 0 && (
            <span className="bg-rainbow absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center text-[9px]">
              {queueCount}
            </span>
          )}
          <span>Queue</span>
        </li>
        <li
          className="flex flex-1 flex-col items-center justify-center"
          onClick={toggleFlowPanelOpen}
        >
          <TerminalComposer />
          <span>Flows</span>
        </li>
        <li
          className="flex flex-1 flex-col items-center justify-center"
          onClick={() => setSettingsOpen(true)}
        >
          <TerminalSettings />
          <span>Settings</span>
        </li>
      </ul>
    </nav>
  );
}
