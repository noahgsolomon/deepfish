"use client";

export const TerminalHistory = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className ?? ""}
  >
    <rect x="4" y="4" width="16" height="16" fill="none" />
    <path d="M12,8 L12,12 L16,12" />
  </svg>
);
