"use client";

import { useStatusBarStore } from "~/store/use-status-bar-store";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export function StatusBar() {
  const leftText = useStatusBarStore((s) => s.leftText);
  const leftUrl = useStatusBarStore((s) => s.leftUrl);
  const rightText = useStatusBarStore((s) => s.rightText);
  const statusText = useStatusBarStore((s) => s.statusText);
  const statusType = useStatusBarStore((s) => s.statusType);
  const setCurrentPage = useStatusBarStore((s) => s.setCurrentPage);
  const setRightText = useStatusBarStore((s) => s.setRightText);
  const setStatusText = useStatusBarStore((s) => s.setStatusText);
  const setStatusType = useStatusBarStore((s) => s.setStatusType);

  const pathname = usePathname();

  // Reset status when navigating between pages
  useEffect(() => {
    // If we're on the main page, clear workflow-specific info
    if (pathname === "/") {
      setCurrentPage("home");
      setRightText(null);
      setStatusText(null);
      setStatusType(null);
    }
  }, [pathname, setCurrentPage, setRightText, setStatusText, setStatusType]);

  return (
    <div className="bg-surface-primary border-border-default fixed right-0 bottom-0 left-0 z-60 ml-0 hidden justify-between border-t px-4 py-2 font-mono text-xs text-gray-500 sm:ml-10 sm:flex md:ml-14">
      <div className="flex items-center space-x-2">
        <span>{leftText}</span>
        {leftUrl && (
          <>
            <span className="font-mono text-xs">::</span>
            <Link
              href={leftUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs underline"
            >
              {leftUrl
                .replace("https://replicate.com/", "")
                .replace("https://fal.ai/", "")
                .toUpperCase()}
            </Link>
          </>
        )}
      </div>
      <div className="flex space-x-4">
        {rightText && <span>{rightText}</span>}
        {statusText && (
          <span
            className={` ${
              statusType === "idle"
                ? "text-green-400"
                : statusType === "processing"
                  ? "text-blue-400"
                  : statusType === "complete"
                    ? "text-green-400"
                    : statusType === "error"
                      ? "text-red-400"
                      : ""
            } flex items-center`}
          >
            {statusText}
          </span>
        )}
        {pathname === "/" ? (
          <span>
            <span className="text-green-500">SYS::READY</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
