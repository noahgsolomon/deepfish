"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Node } from "@xyflow/react";
import {
  Palette,
  Pin,
  Copy,
  Trash2,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  MessageSquareMore,
} from "lucide-react";
import {
  StandaloneMenuContent,
  StandaloneMenuItem,
  StandaloneMenuSeparator,
} from "~/components/ui/context-menu";

interface NodeContextMenuProps {
  node: Node;
  left: number;
  top: number;
  onAddNode: () => void;
  onAddComment: () => void;
  onClose: () => void;
  onChangeColor: (nodeId: string, color: string) => void;
  onTogglePin: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onCopy: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  isOtherUsersFlow?: boolean;
}

// Color options with names - darker palette that works with black inputs
export const colorOptions = [
  { color: "#111111", name: "Default" },
  { color: "#1A1A2E", name: "Midnight" },
  { color: "#16213E", name: "Navy" },
  { color: "#0F3460", name: "Deep Blue" },
  { color: "#1A1A1D", name: "Obsidian" },
  { color: "#231E23", name: "Charcoal" },
  { color: "#151515", name: "Onyx" },
  { color: "#121212", name: "Pitch" },
  { color: "#1E1E30", name: "Nightshade" },
  { color: "#2D2D2D", name: "Graphite" },
  { color: "#222831", name: "Space" },
  { color: "#252525", name: "Carbon" },
];

// Comment color options with names - darker palette that works with black inputs
export const commentColorOptions = [
  { color: "#ff6900", name: "Orange" },
  { color: "#efb100", name: "Yellow" },
  { color: "#22c55e", name: "Green" },
  { color: "#2b7fff", name: "Blue" },
  { color: "#f6339a", name: "Pink" },
  { color: "#ad46ff", name: "Purple" },
];

export default function NodeContextMenu({
  node,
  left,
  top,
  onAddNode,
  onAddComment,
  onClose,
  onChangeColor,
  onTogglePin,
  onToggleCollapse,
  onCopy,
  onDelete,
  isOtherUsersFlow = false,
}: NodeContextMenuProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const isPinned = node.data?.isPinned || false;
  const isCollapsed = node.data?.collapsed || false;
  const currentColor = node.data?.color || "#111111";

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setShowColorPicker(false);
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

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Element) &&
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Element)
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
  }, [handleClose]);

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  // Calculate co
  const colorPickerLeft = left + 155; // Position to the right of main menu
  const colorPickerTop = top;

  return (
    <>
      <StandaloneMenuContent
        ref={menuRef}
        className={`absolute ${isClosing ? "animate-out fade-out-0 zoom-out-95" : ""}`}
        style={{ left, top }}
      >
        {!isOtherUsersFlow && (
          <StandaloneMenuItem
            className="relative"
            onMouseEnter={() => setShowColorPicker(true)}
            onMouseLeave={() => setShowColorPicker(false)}
            disabled={isOtherUsersFlow}
          >
            <Palette />
            Change Color
            <ChevronRight className="ml-auto h-4 w-4" />
          </StandaloneMenuItem>
        )}

        {!isOtherUsersFlow && !!node.data?.workflow && (
          <StandaloneMenuItem
            onClick={() => handleAction(() => onToggleCollapse(node.id))}
            disabled={isOtherUsersFlow}
          >
            {isCollapsed ? <Maximize2 /> : <Minimize2 />}
            {isCollapsed ? "Expand" : "Collapse"}
          </StandaloneMenuItem>
        )}

        {!isOtherUsersFlow && node.type === "comment" && (
          <>
            <StandaloneMenuSeparator />
            <StandaloneMenuItem onClick={() => handleAction(onAddNode)}>
              <Plus />
              Add Node
            </StandaloneMenuItem>
            <StandaloneMenuItem onClick={() => handleAction(onAddComment)}>
              <MessageSquareMore />
              Add Comment
            </StandaloneMenuItem>
            <StandaloneMenuSeparator />
          </>
        )}

        {!isOtherUsersFlow && <StandaloneMenuSeparator />}

        {/* Pin/Unpin */}
        {!isOtherUsersFlow && (
          <StandaloneMenuItem
            onClick={() => handleAction(() => onTogglePin(node.id))}
            disabled={isOtherUsersFlow}
          >
            <Pin className={isPinned ? "text-blue-400" : ""} />
            {isPinned ? "Unpin" : "Pin"} Node
          </StandaloneMenuItem>
        )}

        {/* Copy - always available */}
        <StandaloneMenuItem onClick={() => handleAction(() => onCopy(node.id))}>
          <Copy />
          Copy
        </StandaloneMenuItem>

        {!isOtherUsersFlow && <StandaloneMenuSeparator />}

        {/* Delete */}
        {!isOtherUsersFlow && (
          <StandaloneMenuItem
            variant="destructive"
            onClick={() => handleAction(() => onDelete(node.id))}
            disabled={isOtherUsersFlow}
          >
            <Trash2 />
            Delete
          </StandaloneMenuItem>
        )}
      </StandaloneMenuContent>

      {/* Color picker submenu */}
      {showColorPicker && !isOtherUsersFlow && (
        <StandaloneMenuContent
          ref={colorPickerRef}
          className={`absolute ${isClosing ? "animate-out fade-out-0 zoom-out-95" : ""}`}
          style={{ left: colorPickerLeft, top: colorPickerTop }}
          onMouseEnter={() => setShowColorPicker(true)}
          onMouseLeave={() => setShowColorPicker(false)}
        >
          {(node.type !== "comment" ? colorOptions : commentColorOptions).map(
            (option) => (
              <StandaloneMenuItem
                key={option.color}
                onClick={() => {
                  onChangeColor(node.id, option.color);
                  handleClose();
                }}
                className="flex items-center gap-2"
              >
                <div
                  className="border-border-default h-4 w-4 border"
                  style={{ backgroundColor: option.color }}
                />
                <span>{option.name}</span>
                {currentColor === option.color && (
                  <span className="text-text-secondary ml-auto text-xs">
                    Current
                  </span>
                )}
              </StandaloneMenuItem>
            ),
          )}
        </StandaloneMenuContent>
      )}
    </>
  );
}
