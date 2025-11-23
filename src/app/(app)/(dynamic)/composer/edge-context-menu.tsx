"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Edge } from "@xyflow/react";
import { Ban, Trash2 } from "lucide-react";
import {
  StandaloneMenuContent,
  StandaloneMenuItem,
} from "~/components/ui/context-menu";

interface EdgeContextMenuProps {
  edge: Edge;
  left: number;
  top: number;
  isOtherUsersFlow?: boolean;
  onDeleteEdge: (edge: Edge) => void;
  onClose: () => void;
}

export default function EdgeContextMenu({
  edge,
  left,
  top,
  isOtherUsersFlow = false,
  onDeleteEdge,
  onClose,
}: EdgeContextMenuProps) {
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

  const handleDeleteEdge = () => {
    onDeleteEdge(edge);
    handleClose();
  };

  return (
    <StandaloneMenuContent
      ref={menuRef}
      className={`absolute ${isClosing ? "animate-out fade-out-0 zoom-out-95" : ""}`}
      style={{ left, top }}
    >
      {isOtherUsersFlow && (
        <StandaloneMenuItem variant="destructive" disabled>
          <Ban />
          Can't Edit This Edge
        </StandaloneMenuItem>
      )}

      {!isOtherUsersFlow && (
        <StandaloneMenuItem variant="destructive" onClick={handleDeleteEdge}>
          <Trash2 />
          Delete Edge
        </StandaloneMenuItem>
      )}
    </StandaloneMenuContent>
  );
}
