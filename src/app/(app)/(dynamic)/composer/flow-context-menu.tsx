"use client";

import {
  Ban,
  ClipboardPaste,
  MessageSquareMore,
  Plus,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StandaloneMenuContent,
  StandaloneMenuItem,
  StandaloneMenuSeparator,
} from "~/components/ui/context-menu";

interface FlowContextMenuProps {
  left: number;
  top: number;
  onClose: () => void;
  onAddNode: () => void;
  onAddComment: () => void;
  onPaste: () => void;
  onSave: () => void;
  isOtherUsersFlow?: boolean;
}

export default function FlowContextMenu({
  left,
  top,
  onClose,
  onAddNode,
  onAddComment,
  onPaste,
  onSave,
  isOtherUsersFlow = false,
}: FlowContextMenuProps) {
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ignore right-clicks (they should open a new menu, not close this one)
      if (event.button === 2) return;

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
  }, [handleClose]);

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  return (
    <StandaloneMenuContent
      ref={menuRef}
      className={`absolute ${isClosing ? "animate-out fade-out-0 zoom-out-95" : ""}`}
      style={{ left, top }}
    >
      {isOtherUsersFlow ? (
        <StandaloneMenuItem variant="destructive" disabled>
          <Ban />
          Can't Edit This Flow
        </StandaloneMenuItem>
      ) : (
        <>
          <StandaloneMenuItem onClick={() => handleAction(onAddNode)}>
            <Plus />
            Add Node
          </StandaloneMenuItem>
          <StandaloneMenuItem onClick={() => handleAction(onAddComment)}>
            <MessageSquareMore />
            Add Comment
          </StandaloneMenuItem>
          <StandaloneMenuSeparator />

          <StandaloneMenuItem onClick={() => handleAction(onPaste)}>
            <ClipboardPaste />
            Paste
          </StandaloneMenuItem>

          <StandaloneMenuSeparator />
          <StandaloneMenuItem onClick={() => handleAction(onSave)}>
            <Save />
            Save Flow
          </StandaloneMenuItem>
        </>
      )}
    </StandaloneMenuContent>
  );
}
