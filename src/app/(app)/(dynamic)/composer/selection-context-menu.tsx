"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Trash2 } from "lucide-react";
import {
  StandaloneMenuContent,
  StandaloneMenuItem,
  StandaloneMenuSeparator,
} from "~/components/ui/context-menu";

interface SelectionContextMenuProps {
  left: number;
  top: number;
  selectedNodesCount: number;
  selectedEdgesCount: number;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isOtherUsersFlow?: boolean;
}

export default function SelectionContextMenu({
  left,
  top,
  selectedNodesCount,
  selectedEdgesCount,
  onClose,
  onCopy,
  onDelete,
  isOtherUsersFlow = false,
}: SelectionContextMenuProps) {
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalSelected = selectedNodesCount + selectedEdgesCount;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ignore right-clicks (they should open a new menu, not close this one)
      if (event.button === 2) return;

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Element)
      ) {
        handleClose();
      }
    };

    // Add slight delay to prevent immediate close on right-click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete
    setTimeout(() => {
      onClose();
    }, 150);
  };

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  // Format selection text
  const getSelectionText = () => {
    const parts = [];
    if (selectedNodesCount > 0) {
      parts.push(
        `${selectedNodesCount} node${selectedNodesCount > 1 ? "s" : ""}`,
      );
    }
    if (selectedEdgesCount > 0) {
      parts.push(
        `${selectedEdgesCount} edge${selectedEdgesCount > 1 ? "s" : ""}`,
      );
    }
    return parts.join(" and ");
  };

  return (
    <StandaloneMenuContent
      ref={menuRef}
      className={`absolute ${isClosing ? "animate-out fade-out-0 zoom-out-95" : ""}`}
      style={{ left, top }}
    >
      {/* Selection info */}
      <div className="text-text-secondary px-2 py-1.5 font-mono text-xs">
        {getSelectionText()} selected
      </div>

      <StandaloneMenuSeparator />

      {/* Copy - always available */}
      <StandaloneMenuItem onClick={() => handleAction(onCopy)}>
        <Copy />
        Copy Selection
      </StandaloneMenuItem>

      {/* Delete - only for own flows */}
      {!isOtherUsersFlow && (
        <StandaloneMenuItem
          variant="destructive"
          onClick={() => handleAction(onDelete)}
          disabled={isOtherUsersFlow}
        >
          <Trash2 />
          Delete Selection
        </StandaloneMenuItem>
      )}
    </StandaloneMenuContent>
  );
}
