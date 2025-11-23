"use client";

import { useModalStore } from "~/store/use-modal-store";
import { usePanelStore } from "~/store/use-panel-store";
import Link from "next/link";
import { TerminalComposer } from "./icons/terminal-composer";
import { TerminalHistory } from "./icons/terminal-history";
import { TerminalQueue } from "./icons/terminal-queue";
import { TerminalSettings } from "./icons/terminal-settings";
import { useActiveRunCount } from "~/hooks/workflow-runs/use-active-runs";
import Image from "next/image";
import Modals from "./modals/modals";
import { useUser } from "~/hooks/auth";

export function Sidebar() {
  const toggleQueueOpen = usePanelStore((state) => state.toggleQueueOpen);
  const { data: user, isLoading: isUserLoading } = useUser();
  const toggleHistoryPanelOpen = usePanelStore(
    (state) => state.toggleHistoryPanelOpen,
  );
  const setSettingsOpen = useModalStore((s) => s.setSettingsOpen);
  const { total: queueCount } = useActiveRunCount();

  return (
    <>
      <aside className="border-border-default bg-surface-primary fixed z-[100] hidden h-screen w-10 flex-col border-r text-white sm:flex md:w-14">
        <nav className="flex flex-1 flex-col items-center">
          <div className="relative cursor-pointer py-2">
            <Link
              href="/dashboard"
              prefetch={false}
              className="group relative z-[500] flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white"
            >
              <Image src="/app-icon.png" alt="Logo" width={28} height={28} />
            </Link>
          </div>
          <div className="pb-2 md:pb-4" />
          <div className="relative cursor-pointer py-2">
            <button
              onClick={toggleHistoryPanelOpen}
              className="group relative flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white"
            >
              <TerminalHistory />
              <span className="bg-surface-accent pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-none px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                History
              </span>
            </button>
          </div>

          <div className="relative cursor-pointer py-2">
            <button
              onClick={toggleQueueOpen}
              className="group relative flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white"
            >
              <TerminalQueue />
              {queueCount > 0 && (
                <div className="bg-rainbow absolute -top-1 -right-1 flex h-4 w-4 cursor-pointer items-center justify-center text-[9px] text-white">
                  {queueCount}
                </div>
              )}
              <span className="bg-surface-accent pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-none px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Queue
              </span>
            </button>
          </div>

          <div className="relative cursor-pointer py-2">
            <button
              onClick={() => usePanelStore.getState().toggleFlowPanelOpen()}
              className="group relative flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white"
            >
              <TerminalComposer />
              <span className="bg-surface-accent pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-none px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Flows
              </span>
            </button>
          </div>
        </nav>
        <div className="flex justify-center px-2 py-2">
          <Link
            href={process.env.NEXT_PUBLIC_X_PROFILE_URL || ""}
            target="_blank"
            rel="noreferrer"
            className="group relative flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white"
            onClick={() => console.log("x")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 1200 1227"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
            </svg>
            <span className="bg-surface-accent pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-none px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              X
            </span>
          </Link>
        </div>
        <div className="flex justify-center px-2 py-2">
          <Link
            href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || ""}
            target="_blank"
            rel="noreferrer"
            className="group relative flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
            </svg>
            <span className="bg-surface-accent pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-none px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Discord
            </span>
          </Link>
        </div>
        <div className="flex justify-center px-2 py-2 md:py-4">
          <button
            onClick={() => {
              setSettingsOpen(true);
            }}
            className={`group relative flex cursor-pointer items-center justify-center rounded-none font-mono text-sm text-gray-300 transition-colors hover:text-white ${
              !user && !isUserLoading ? "hidden" : ""
            }`}
          >
            <TerminalSettings />
            <span className="bg-surface-accent pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-none px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Settings
            </span>
          </button>
        </div>
      </aside>

      <Modals />
    </>
  );
}
