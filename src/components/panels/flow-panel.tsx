"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { usePanelStore } from "~/store/use-panel-store";
import { useFlowStore } from "~/store/use-flow-store";
import {
  useUserFlows,
  useToggleFlowVisibility,
  useRenameFlow,
  useDeleteFlow,
} from "~/hooks/flows";
import { X, Plus, Trash2, Lock, Link2, Check, Globe } from "lucide-react";
import { nanoid } from "nanoid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Flow } from "~/types";
import { toast } from "~/hooks/use-toast";

const TerminalEditIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ minWidth: size }}
  >
    {/* Pencil body */}
    <path
      d="M12 1L15 4L5 14H2V11L12 1Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="bevel"
    />
    {/* Pencil tip */}
    <path
      d="M2 14L5 11"
      stroke="currentColor"
      strokeWidth="0.6"
      strokeLinejoin="bevel"
    />
  </svg>
);

function timeAgo(dateString: string | number | Date) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(seconds) || seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function FlowPanel() {
  const flowPanelOpen = usePanelStore((s) => s.flowPanelOpen);
  const setFlowPanelOpen = usePanelStore((s) => s.setFlowPanelOpen);
  const { data: userFlows = [] } = useUserFlows({
    withData: true,
  });

  const [query, setQuery] = useState("");
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<Flow | null>(null);
  const [copiedFlowId, setCopiedFlowId] = useState<string | null>(null);

  // Toggle flow visibility mutation
  const toggleVisibilityMutation = useToggleFlowVisibility({
    onSuccess: (data) => {
      toast({
        title: data.isPublic ? "Flow is now public" : "Flow is now private",
        description: data.isPublic
          ? "Others can now view and fork your flow"
          : "Your flow is private again",
        variant: "success",
      });
    },
    meta: {
      errorToast: {
        title: "Error updating flow visibility",
        description: "Please try again later",
      },
    },
  });

  // Rename flow mutation
  const renameFlowMutation = useRenameFlow({
    onSuccess: () => {
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: "Error renaming flow",
        description: "Please try again later",
        variant: "destructive",
      });
      setEditingId(null);
    },
  });

  // Delete flow mutation
  const deleteFlowMutation = useDeleteFlow({
    onMutate: () => {
      setIsDeleteModalOpen(false);
      setFlowToDelete(null);
      toast({
        title: "Flow deleted",
        description: "Your flow has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting flow",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleToggleVisibility = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation();
    toggleVisibilityMutation.mutate({ flowId });
  };

  const handleCopyLink = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation();
    // const flowUrl = `${window.location.origin}/flow/${flowId}`;
    const flowUrl = `${window.location.origin}/composer/${flowId}`;
    navigator.clipboard.writeText(flowUrl);
    setCopiedFlowId(flowId);
    setTimeout(() => setCopiedFlowId(null), 2000);
    toast({
      title: "Link copied!",
      description:
        "Share this link with others to let them view and fork your flow",
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? userFlows.filter((f) => f.name.toLowerCase().includes(q))
      : userFlows;
  }, [query, userFlows]);

  /* ------------------------------------------------------------------
     Helper – Analyse saved flow JSON to infer input & output types
     ----------------------------------------------------------------*/
  const analyseFlow = useCallback((flowJson: string) => {
    try {
      const obj = JSON.parse(flowJson || "{}") as {
        nodes?: any[];
        edges?: any[];
      };
      const nodes = obj.nodes ?? [];
      const edges = obj.edges ?? [];

      const byId = new Map(nodes.map((n) => [n.id, n]));

      /* ---------- incoming edge count ---------- */
      const inDeg: Record<string, number> = {};
      edges.forEach((e) => {
        inDeg[e.target] = (inDeg[e.target] || 0) + 1;
      });

      /* ---------- infer helper for schema property ---------- */
      const inferType = (p: any): string | null => {
        if (!p) return null;
        if (p.format === "uri") {
          const title = (p.title || "").toLowerCase();
          if (title.includes("video")) return "video";
          if (title.includes("audio")) return "audio";
          if (title.includes("image")) return "image";
          return "file";
        }
        if (p.type === "array" && p.items) {
          const itemSchema = p.items;
          if (
            (itemSchema.format === "uri" || itemSchema.type === "string") &&
            (p.title || "").toLowerCase().includes("image")
          ) {
            return "image";
          }
          if (itemSchema.format === "uri") return "file";
        }
        if (p.type === "string") return "text";
        if (
          p.type === "integer" ||
          p.type === "number" ||
          p.type === "boolean"
        ) {
          return null;
        }
        return null;
      };

      /* ---------- determine user-level input types ---------- */
      const inputTypeSet = new Set<string>();

      // Helper to add type if valid
      const addType = (t: any) => {
        if (typeof t === "string") inputTypeSet.add(t);
      };

      // 1) Primitive nodes with no incoming edge => user must supply value
      nodes.forEach((n) => {
        if (n.type === "primitiveNode" && !inDeg[n.id]) {
          addType(n.data?.outputType || n.data?.fieldType?.outputType);
        }
      });

      // 2) Workflow node required properties not satisfied by edges or manual inputs
      // Build map: targetId -> Map<handle, true>
      const incomingByHandle: Record<string, Set<string>> = {};
      edges.forEach((e) => {
        if (!incomingByHandle[e.target]) incomingByHandle[e.target] = new Set();
        incomingByHandle[e.target].add(e.targetHandle ?? "input");
      });

      nodes.forEach((n) => {
        if (n.type !== "workflowNode") return;

        const wf = n.data?.workflow;
        const req: string[] = wf?.schema?.Input?.required ?? [];
        const props: Record<string, any> = wf?.schema?.Input?.properties ?? {};

        const providedHandles = incomingByHandle[n.id] ?? new Set();
        const manualIns: Record<string, any> = n.data?.inputs ?? {};

        req.forEach((name) => {
          const hasEdge = providedHandles.has(name);
          if (!hasEdge) {
            const t = inferType(props[name]);
            if (t) addType(t);
          }
        });
      });

      /* ---------- output types = nodes that feed directly into a resultNode ---------- */
      const resultIds = new Set(
        nodes.filter((n) => n.type === "resultNode").map((n) => n.id),
      );
      const outputTypeSet = new Set<string>();

      const inferNodeOutputType = (node: any): string | undefined => {
        if (!node) return undefined;
        switch (node.type) {
          case "primitiveNode":
            return node.data?.outputType;
          case "workflowNode":
            return (
              node.data?.workflow?.outputType ||
              node.data?.workflow?.schema?.Output?.format
            );
          case "combineImagesNode":
            return "image";
          case "replaceAudioNode":
            return "video";
          default:
            return undefined;
        }
      };

      edges.forEach((e) => {
        if (resultIds.has(e.target)) {
          const src = byId.get(e.source);
          const t = inferNodeOutputType(src);
          if (t) outputTypeSet.add(t);
        }
      });

      return {
        inputs: Array.from(inputTypeSet),
        outputs: Array.from(outputTypeSet),
      };
    } catch (err) {
      console.warn("Failed to analyse flow", err);
      return { inputs: [], outputs: [] };
    }
  }, []);

  const handleCreateFlow = () => {
    router.push(`/composer/${nanoid()}`);
    setFlowPanelOpen(false);
  };

  const handleSaveEdit = (flow: Flow) => {
    if (editName.trim() && editName !== flow.name) {
      renameFlowMutation.mutate({
        id: flow.id,
        name: editName.trim(),
      });
    } else {
      setEditingId(null);
    }
  };

  const handleDeleteFlow = () => {
    if (flowToDelete) {
      deleteFlowMutation.mutate({ flowId: flowToDelete.id });
    }
  };

  return (
    <>
      <div
        className={`bg-surface-primary border-border-default fixed top-8 bottom-0 left-0 z-40 w-full transform border-r transition-transform duration-300 sm:left-10 sm:w-80 md:left-14 ${
          flowPanelOpen ? `translate-x-0` : "-translate-x-[150%]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <div className="border-border-default flex items-center justify-between border-b p-3">
            <h2 className="font-mono text-sm font-bold">FLOWS</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setFlowPanelOpen(false)}
                variant="default"
                size="icon"
                className="h-6 w-6"
              >
                <X size={12} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="border-border-default border-b p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-surface-secondary border-border-default placeholder-text-muted h-7 flex-1 border px-2 font-mono text-xs text-white focus:outline-none"
              />
              <Button
                onClick={handleCreateFlow}
                variant="default"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
              >
                <Plus size={12} />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-text-muted flex h-full flex-col items-center justify-center gap-3 text-xs">
                <span>NO FLOWS</span>
                <Button variant="default" size="sm" onClick={handleCreateFlow}>
                  Create Flow
                </Button>
              </div>
            ) : (
              <ul className="space-y-2 p-2 pb-12">
                {filtered.map((f) => {
                  const { inputs, outputs } = analyseFlow(f.data);
                  const badgeColor = (t: string) => {
                    switch (t) {
                      case "text":
                        return "bg-pink-500/30 border-pink-500/50 text-pink-100";
                      case "image":
                        return "bg-sky-500/30 border-sky-500/50 text-sky-100";
                      case "audio":
                        return "bg-purple-500/30 border-purple-500/50 text-purple-100";
                      case "video":
                        return "bg-teal-500/30 border-teal-500/50 text-teal-100";
                      default:
                        return "bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-100";
                    }
                  };
                  // Pick emoji avatar
                  const emoji = f.emoji;
                  // Use updated_at if present, else fallback to created_at or id creation time or blank
                  const updatedAt =
                    f.updatedAt ||
                    f.createdAt ||
                    f.id?.slice(0, 8) ||
                    Date.now();

                  const isPublic = f.isPublic ?? false;

                  return (
                    <li
                      key={f.id}
                      className={`bg-surface-secondary hover:bg-surface-hover border-border-subtle text-text-emphasis group relative flex cursor-pointer items-center gap-3 border px-2 py-2 text-xs transition`}
                      onClick={() => {
                        router.push(`/composer/${f.id}`);
                        setFlowPanelOpen(false);
                      }}
                    >
                      {/* Emoji avatar */}
                      <span
                        className="text-2xl select-none"
                        aria-label="Flow avatar"
                      >
                        {emoji}
                      </span>
                      {/* Main info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {editingId === f.id ? (
                            <input
                              className="bg-terminal-track border-border-default truncate border px-1 font-mono text-white"
                              value={editName}
                              autoFocus
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => handleSaveEdit(f)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(f);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <span className="truncate font-mono">{f.name}</span>
                          )}
                          {isPublic && (
                            <span className="border border-blue-500/50 bg-blue-500/30 px-1 text-[9px] text-blue-300">
                              <Globe className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-text-muted text-xs">
                          Last updated {timeAgo(updatedAt)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {inputs.map((t, idx) => (
                            <span
                              key={"in-" + idx + t}
                              className={`text-[9px] ${badgeColor(
                                t,
                              )} border px-1 py-0.5 font-mono`}
                            >
                              {t.toUpperCase()}
                            </span>
                          ))}
                          {outputs.length > 0 && inputs.length > 0 && (
                            <span className="text-text-muted font-mono text-[9px]">
                              →
                            </span>
                          )}
                          {outputs.map((t, idx) => (
                            <span
                              key={"out-" + idx + t}
                              className={`text-[9px] ${badgeColor(
                                t,
                              )} border px-1 py-0.5 font-mono`}
                            >
                              {t.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {/* Share/visibility toggle */}
                        {!isPublic && (
                          <>
                            <button
                              className="rounded p-1 opacity-0 transition group-hover:opacity-100"
                              title="Make public"
                              onClick={(e) => handleToggleVisibility(e, f.id)}
                            >
                              <Lock size={14} className="text-text-muted" />
                            </button>
                            {isPublic && (
                              <button
                                className="rounded p-1 opacity-0 transition group-hover:opacity-100"
                                title="Copy link"
                                onClick={(e) => handleCopyLink(e, f.id)}
                              >
                                {copiedFlowId === f.id ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Link2
                                    size={14}
                                    className="text-text-muted"
                                  />
                                )}
                              </button>
                            )}
                          </>
                        )}
                        {/* Edit button */}
                        <button
                          className="text-text-muted rounded p-1 opacity-0 transition group-hover:opacity-100 hover:text-white"
                          title="Edit flow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(f.id);
                            setEditName(f.name);
                          }}
                        >
                          <TerminalEditIcon size={14} />
                        </button>
                        {/* Delete button */}
                        <button
                          className="rounded p-1 text-red-400/60 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                          title="Delete flow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlowToDelete(f);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Delete Flow Dialog - moved outside main panel */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setFlowToDelete(null);
        }}
      >
        <DialogContent className="bg-surface-secondary border-border-default text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg">Delete Flow</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Are you sure you want to delete &quot;{flowToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="default"
              onClick={() => setIsDeleteModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleDeleteFlow}
              className="border-red-500/30 bg-red-500/20 text-red-400 hover:border-red-500/50 hover:bg-red-500/30"
            >
              <Trash2 size={14} />
              Delete Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
