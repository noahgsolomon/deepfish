import { useEffect, useState } from "react";
import { toast } from "~/hooks/use-toast";
import { User } from "~/types";
import { useRouter } from "next/navigation";

interface UseKeyboardShortcutsProps {
  isOtherUsersFlow: boolean;
  setIsAddNodeDialogOpen: (open: boolean) => void;
  isRunning: boolean;
  executeComposerWorkflow: (flowId: string) => void;
  flowIdParam: string;
  handleSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (position: { x: number; y: number }) => void;
  handleDeleteSelected: () => void;
  user: User | undefined;
}

export const useKeyboardShortcuts = ({
  isOtherUsersFlow,
  setIsAddNodeDialogOpen,
  isRunning,
  executeComposerWorkflow,
  flowIdParam,
  handleSave,
  canUndo,
  canRedo,
  undo,
  redo,
  copySelection,
  cutSelection,
  pasteClipboard,
  handleDeleteSelected,
  user,
}: UseKeyboardShortcutsProps) => {
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const router = useRouter();

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore global shortcuts when the user is typing inside a text-editable element
      // (e.g. <input>, <textarea> or any element with the `contentEditable` attribute).
      const target = e.target as HTMLElement | null;
      const active = document.activeElement as HTMLElement | null;
      const isEditable = (el: HTMLElement | null): boolean =>
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      if (isEditable(target) || isEditable(active)) {
        // Let the browser handle standard text operations like copy/paste/cut/undo/redo.
        return;
      }

      // Add Node (⌘/Ctrl + A) - Only for own flows
      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot add nodes to someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        setIsAddNodeDialogOpen(true);
      }

      // Run workflow (⌘/Ctrl + Enter) - Allow for all flows
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!user) {
          router.push("/");
          return;
        }

        if (isRunning) {
          toast({
            title: "Workflow is already running",
            description: "Please wait for the workflow to finish",
            variant: "destructive",
          });
        } else {
          executeComposerWorkflow(flowIdParam!);
        }
      }

      // Save (⌘/Ctrl + S) - Only for own flows
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot save changes to someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        handleSave();
      }

      // Undo (⌘/Ctrl + Z) - Only for own flows
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot undo changes in someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        if (canUndo) undo();
      }

      // Redo (⌘/Ctrl + Shift + Z) - Only for own flows
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot redo changes in someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        if (canRedo) redo();
      }

      // Copy (⌘/Ctrl + C) - Allow for all flows (copying is read-only)
      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        copySelection();
      }

      // Cut (⌘/Ctrl + X) - Only for own flows
      if (e.key === "x" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot cut nodes from someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        cutSelection();
      }

      // Paste (⌘/Ctrl + V) - Only for own flows
      if (e.key === "v" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot paste nodes into someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        pasteClipboard(mousePosition);
      }

      // Delete key - Only for own flows
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (isOtherUsersFlow) {
          toast({
            title: "Read-only flow",
            description: "You cannot delete nodes from someone else's flow.",
            variant: "destructive",
          });
          return;
        }
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    handleSave,
    executeComposerWorkflow,
    canUndo,
    canRedo,
    undo,
    redo,
    isOtherUsersFlow,
    isRunning,
    flowIdParam,
    copySelection,
    cutSelection,
    pasteClipboard,
    handleDeleteSelected,
    setIsAddNodeDialogOpen,
    mousePosition,
    user,
  ]);
};
