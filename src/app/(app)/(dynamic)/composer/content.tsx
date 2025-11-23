"use client";

import {
  addEdge,
  applyEdgeChanges,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  OnNodeDrag,
  ReactFlow,
  ReactFlowInstance,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CpuIcon, Terminal } from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AgeVerificationModal } from "~/components/modals/age-verification-modal";
import NewFlowModal from "~/components/modals/new-flow-modal";
import { Button } from "~/components/ui/button";
import { ToastAction } from "~/components/ui/toast";
import { toast } from "~/hooks/use-toast";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";
import { useDraftFlowStore } from "~/store/use-draft-flow-store";
import { useExecutionStore } from "~/store/use-execution-store";
import { useFlowStore } from "~/store/use-flow-store";
import { useStatusBarStore } from "~/store/use-status-bar-store";
import { useTabStore } from "~/store/use-tab-store";
import AddNodeDialog, { NodeData } from "./add-node";
import CombineImagesNode from "./combine-images-node";
import CombineTextNode from "./combine-text-node";
import CommentNode from "./comment-node";
import EdgeContextMenu from "./edge-context-menu";
import EditActions from "./edit-actions";
import FlowContextMenu from "./flow-context-menu";
import FpsCounter from "./fps-counter";
import { useClipboard } from "./hooks/use-clipboard";
import { useExecuteComposerWorkflow } from "./hooks/use-execute-composer-workflow";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useNode } from "./hooks/use-node";
import NodeContextMenu, { commentColorOptions } from "./node-context-menu";
import PrimitiveNode from "./primitive-node";
import ReplaceAudioNode from "./replace-audio-node";
import ResultNode from "./result-node";
import SelectionContextMenu from "./selection-context-menu";
import { handleColors } from "./utils/colors";
import {
  FlowSnapshot,
  makeSnapshot,
  snapshotsEqual,
} from "./utils/flow-snapshot";
import { captureThumbnail } from "./utils/utils";
import ViewActions from "./view-actions";
import WorkflowNode from "./workflow-node";
import { useMutation, useQuery } from "@tanstack/react-query";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { useTRPC } from "~/trpc/client";
import { useUpdateUser, useUser } from "~/hooks/auth";
import {
  useForkFlow,
  usePublicFlow,
  useSaveFlow,
  useUpdateFlowExampleOutput,
  useUserFlows,
} from "~/hooks/flows";

// Define node types
const nodeTypes = {
  // falNode: FalNode,
  resultNode: ResultNode,
  primitiveNode: PrimitiveNode,
  workflowNode: WorkflowNode,
  combineImagesNode: CombineImagesNode,
  combineTextNode: CombineTextNode,
  replaceAudioNode: ReplaceAudioNode,
  comment: CommentNode,
};

const defaultEdgeOptions = {
  animated: true,
  selectable: true,
  style: {
    strokeWidth: 3,
    strokeDasharray: "6 6",
    stroke: "rgba(255, 255, 255, 0.5)",
  },
  interactionWidth: 20,
  className: "react-flow__edge-selectable",
};

export default function Composer({ slug }: { slug: string }) {
  const setCurrentPage = useStatusBarStore((s) => s.setCurrentPage);
  const setLeftText = useStatusBarStore((s) => s.setLeftText);
  const setLeftUrl = useStatusBarStore((s) => s.setLeftUrl);
  const setRightText = useStatusBarStore((s) => s.setRightText);
  const setStatusText = useStatusBarStore((s) => s.setStatusText);
  const setStatusType = useStatusBarStore((s) => s.setStatusType);
  const nodes = useComposeWorkflowStore((s) => s.nodes);
  const edges = useComposeWorkflowStore((s) => s.edges);
  const setNodes = useComposeWorkflowStore((s) => s.setNodes);
  const setEdges = useComposeWorkflowStore((s) => s.setEdges);
  const setNodesWithHistory = useComposeWorkflowStore(
    (s) => s.setNodesWithHistory,
  );
  const setEdgesWithHistory = useComposeWorkflowStore(
    (s) => s.setEdgesWithHistory,
  );
  const setNodesAndEdgesWithHistory = useComposeWorkflowStore(
    (s) => s.setNodesAndEdgesWithHistory,
  );
  const toJson = useComposeWorkflowStore((s) => s.toJson);
  const clearCanvas = useComposeWorkflowStore((s) => s.clear);
  const setDraggingType = useComposeWorkflowStore((s) => s.setDraggingType);
  const setIsDragging = useComposeWorkflowStore((s) => s.setIsDragging);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const setViewportState = useComposeWorkflowStore((s) => s.setViewport);
  const setStoreCurrentFlowId = useComposeWorkflowStore(
    (s) => s.setCurrentFlowId,
  );
  const setNodesSilent = useComposeWorkflowStore((s) => s.setNodesSilent);
  const trpc = useTRPC();

  // Track drag state for position history
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  const updateExampleOutput = useUpdateFlowExampleOutput();

  // Replace tRPC base64 upload with direct client upload for thumbnails
  const uploadThumbDirect = useMutation({
    mutationFn: async (thumbDataUrl: string) => {
      // Convert data URL to Blob
      const [meta, data] = thumbDataUrl.split(",", 2);
      const contentTypeMatch = meta?.match(/data:([^;]+)/);
      const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/png";
      const binary = atob(data || "");
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: contentType });

      const res = await uploadToBlob(`thumb-${Date.now()}.png`, blob, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });
      return { url: res.url } as { url: string };
    },
  });

  // Adapter to satisfy useExecuteComposerWorkflow's expected interface
  const uploadThumb = {
    mutateAsync: async ({
      base64,
      flowId,
      folder,
    }: {
      base64: string;
      flowId?: string;
      folder?: string;
    }): Promise<{ url: string }> => {
      const [meta, data] = base64.split(",", 2);
      const contentTypeMatch = meta?.match(/data:([^;]+)/);
      const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/png";
      const binary = atob(data || "");
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: contentType });
      const res = await uploadToBlob(
        `${folder ?? "examples"}-${Date.now()}.png`,
        blob,
        {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        },
      );
      return { url: res.url };
    },
  };
  const undo = useComposeWorkflowStore((s) => s.undo);
  const redo = useComposeWorkflowStore((s) => s.redo);
  const canUndo = useComposeWorkflowStore((s) => s.canUndo);
  const canRedo = useComposeWorkflowStore((s) => s.canRedo);
  const resetHistory = useComposeWorkflowStore((s) => s.resetHistory);

  const { data: user, isLoading: userLoading } = useUser();

  // Clipboard ref for copy/paste operations
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const [isAddNodeDialogOpen, setIsAddNodeDialogOpen] = useState(false);
  const [addNodeDialogPosition, setAddNodeDialogPosition] = useState<{
    x: number | null;
    y: number | null;
  }>({ x: null, y: null });
  const [edgeContextMenuData, setEdgeContextMenuData] = useState<{
    edge: Edge;
    x: number;
    y: number;
  } | null>(null);

  const [flowContextMenuPosition, setFlowContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [nodeContextMenuData, setNodeContextMenuData] = useState<{
    node: Node;
    x: number;
    y: number;
  } | null>(null);

  const [selectionContextMenuData, setSelectionContextMenuData] = useState<{
    x: number;
    y: number;
    selectedNodesCount: number;
    selectedEdgesCount: number;
  } | null>(null);

  const flowIdParam = slug;
  const isRunning = useExecutionStore((s) =>
    s.isFlowRunning(flowIdParam || ""),
  );
  // modal state for naming new flow
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const pendingDataRef = useRef<string | null>(null);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);

  const updateUser = useUpdateUser({
    meta: {
      successToast: {
        title: "Preference saved",
        description: "You won't be asked again for NSFW content.",
      },
    },
  });

  useEffect(() => {
    setCurrentPage("composer");
    setLeftText("Composer");
    setLeftUrl(null);
    setRightText(null);
    setStatusText(null);
    setStatusType(null);
  }, [
    setCurrentPage,
    setLeftText,
    setLeftUrl,
    setRightText,
    setStatusText,
    setStatusType,
  ]);

  /* ---------------- Flow saving ---------------- */
  const { data: userFlows } = useUserFlows();
  const saveFlowMutation = useSaveFlow({
    onMutate: () => {
      setNameModalOpen(false);
      pendingDataRef.current = null;
      router.replace(`/composer/${slug}`);
      toast({ title: "Flow saved", variant: "success" });
      clearDraft(slug);
    },
  });
  const router = useRouter();
  const id = slug;
  const loadFromJson = useComposeWorkflowStore((s) => s.loadFromJson);
  const saveDraft = useDraftFlowStore((s) => s.saveDraft);
  const getDraft = useDraftFlowStore((s) => s.getDraft);
  const clearDraft = useDraftFlowStore((s) => s.clearDraft);
  const drafts = useDraftFlowStore((s) => s.drafts);
  const prevKeyRef = useRef<string | null>(null);
  const prevCurrentFlowRef = useRef<typeof currentFlow>(null);
  const { data: publicFlow } = usePublicFlow(id || "");

  const handleModalSave = async (name: string) => {
    if (!pendingDataRef.current) {
      console.warn("[handleModalSave] No pending data – abort");
      return;
    }

    // Capture thumbnail for new flow
    let savedThumbnail: string | null = null;
    try {
      const thumb = await captureThumbnail();
      if (thumb) {
        const { url } = await uploadThumbDirect.mutateAsync(thumb);
        savedThumbnail = url;
      }
    } catch (err) {
      console.error("[handleModalSave] thumbnail capture/upload failed", err);
    }

    const flowObj = {
      id: slug,
      name,
      data: pendingDataRef.current,
      thumbnail: savedThumbnail,
    };
    saveFlowMutation.mutate(flowObj);
  };

  // Memoised lookup of the currently-selected flow so we don't keep
  // scanning the `flows` array on every render or inside every handler.
  const currentFlow = useMemo(() => {
    if (!id) return undefined;
    const userFlow = userFlows?.find((f) => f.id === id);
    if (userFlow) return { ...userFlow, isOtherUsersFlow: false };
    if (publicFlow && publicFlow.id === id)
      return { ...publicFlow, isOtherUsersFlow: true };
    return undefined;
  }, [userFlows, id, publicFlow]);

  const forkFlow = useForkFlow({});

  // Handle delete key press for selected nodes and edges
  const handleDeleteSelected = useCallback(() => {
    if (currentFlow?.isOtherUsersFlow) {
      toast({
        title: "Read-only flow",
        description: "You cannot delete elements from someone else's flow.",
        variant: "destructive",
      });
      return;
    }

    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return; // Nothing selected to delete
    }

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

    // Use atomic operation to update both nodes and edges in a single history entry
    setNodesAndEdgesWithHistory(
      // Remove selected nodes
      (prev) => prev.filter((n) => !selectedNodeIds.has(n.id)),
      // Remove selected edges and any edges connected to deleted nodes
      (prev) =>
        prev.filter(
          (e) =>
            !e.selected && // Remove explicitly selected edges
            !selectedNodeIds.has(e.source) && // Remove edges connected to deleted nodes
            !selectedNodeIds.has(e.target),
        ),
    );
  }, [
    nodes,
    edges,
    currentFlow?.isOtherUsersFlow,
    setNodesAndEdgesWithHistory,
  ]);

  const onViewportChange = useCallback(() => {
    setNodeContextMenuData(null);
    setEdgeContextMenuData(null);
    setFlowContextMenuPosition(null);
    setSelectionContextMenuData(null);
  }, []);

  const {
    onNodesChange,
    onNodeChangeColor: handleNodeChangeColor,
    onNodeTogglePin: handleNodeTogglePin,
    onNodeToggleCollapse: handleNodeToggleCollapse,
    onNodeCopy: handleNodeCopy,
    onNodeDelete: handleNodeDelete,
  } = useNode({ clipboardRef });

  const onEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  const onConnect = useCallback(
    (params: any) => {
      if (currentFlow?.isOtherUsersFlow) {
        toast({
          title: "Read-only flow",
          description:
            "You cannot create new connections in someone else's flow.",
          variant: "destructive",
        });
        return;
      }

      // 1) Disallow edges that start and end on the same node
      if (params.source === params.target) {
        console.warn("Self-reference connection blocked", params.source);
        toast({
          title: "Self-reference connection blocked",
          description: "You cannot connect a node to itself",
          variant: "destructive",
        });
        return; // <- abort creation
      }

      const srcNode = nodes.find((n) => n.id === params.source);
      if (!srcNode) return;
      const tgtNode = nodes.find((n) => n.id === params.target);
      if (!tgtNode) return;

      // Define isCompatible function before using it
      const isCompatible = (
        a?: string,
        b?: string,
        targetFieldName?: string,
      ) => {
        if (!a || !b) return true;
        if (a === b) return true;
        if (a === "image" && b === "image_array") return true;

        // Check if target field name suggests it's an audio input
        if (a === "audio" && targetFieldName) {
          const nm = targetFieldName.toLowerCase();
          if (
            nm.includes("audio") ||
            nm.includes("song") ||
            nm.includes("voice") ||
            nm.includes("instrumental") ||
            nm.includes("music") ||
            nm.includes("sound") ||
            nm.includes("track") ||
            nm.includes("beat") ||
            nm.includes("vocal")
          ) {
            return true;
          }
        }

        return false;
      };

      // Determine source output type
      let outType: string | undefined;
      if (srcNode.type === "primitiveNode") {
        outType = (srcNode.data as any)?.outputType;
      } else if (srcNode.type === "workflowNode") {
        outType = (srcNode.data as any)?.workflow?.outputType;
      } else {
        outType = (srcNode.data as any)?.outputType;
      }

      // Determine target input type
      let inType: string | undefined;
      let chosenHandle = params.targetHandle as string | undefined;
      const map = (tgtNode.data as any)?.inputTypeMap as
        | Record<string, string>
        | undefined;

      if (map) {
        // if user dropped on node body (no handle), pick first compatible handle
        if (!chosenHandle && map) {
          Object.entries(map).some(([name, typ]) => {
            if (isCompatible(outType, typ, name)) {
              chosenHandle = name;
              return true;
            }
            return false;
          });
        }

        if (chosenHandle) {
          inType = map[chosenHandle];
        }
      }

      if (!isCompatible(outType, inType, chosenHandle)) {
        console.warn("Type mismatch", outType, "->", inType);
        return; // reject connection
      }

      console.log("[Composer] onConnect:", {
        sourceNode: params.source,
        targetNode: params.target,
        originalHandle: params.targetHandle,
        chosenHandle,
        srcOutType: outType,
        tgtInType: inType,
      });

      setEdges((eds) => {
        const filtered = eds.filter(
          (e) =>
            !(
              e.target === params.target &&
              e.targetHandle === params.targetHandle
            ),
        );

        // choose stroke color based on output type
        let stroke = "rgba(255, 255, 255, 0.5)";
        if (outType && (handleColors as any)[outType]) {
          stroke = (handleColors as any)[outType];
        }

        const newParams: Connection = {
          ...params,
          targetHandle: chosenHandle,
          style: {
            ...defaultEdgeOptions.style,
            stroke,
          },
        } as any;
        return addEdge(newParams, filtered);
      });
    },
    [setEdges, nodes, currentFlow],
  );

  // Handle connect start/end to set dragging type
  const handleConnectStart = useCallback(
    (event: any, params: any) => {
      if (!params) return;
      const { nodeId, handleType, handleId } = params;
      if (handleType !== "source") return;
      const srcNode = nodes.find((n) => n.id === nodeId);
      let outType: string | undefined;
      if (srcNode && srcNode.type === "primitiveNode") {
        outType = (srcNode.data as any)?.outputType;
      } else if (srcNode && srcNode.type === "workflowNode") {
        outType = (srcNode.data as any)?.workflow?.outputType;
      } else {
        outType = (srcNode?.data as any)?.outputType;
      }
      setDraggingType(outType);
    },
    [nodes, setDraggingType],
  );

  const handleConnectEnd = useCallback(() => {
    setDraggingType(undefined);
  }, [setDraggingType]);

  const commentOffsetMap = useRef<{ [id: string]: { x: number; y: number } }>(
    {},
  );

  // Handle drag start - record initial positions
  const handleNodeDragStart: OnNodeDrag = useCallback(
    (_, node) => {
      if (currentFlow?.isOtherUsersFlow) return;

      setIsDragging(true);
      // Record starting positions of all selected nodes (in case of multi-select drag)
      const selectedNodes = nodes.filter((n) => n.selected || n.id === node.id);
      const positionMap = new Map();

      selectedNodes.forEach((n) => {
        positionMap.set(n.id, { x: n.position.x, y: n.position.y });
      });

      dragStartPositions.current = positionMap;

      if (node.type === "comment" && rfInstance) {
        const commentBounds = rfInstance.getNodesBounds([node]);
        nodes.forEach((n) => console.log(rfInstance.getNodesBounds([n])));
        const nodesInComment = nodes.filter((n) => {
          if (n.id === node.id) {
            return false;
          }
          const nodeBounds = rfInstance.getNodesBounds([n]);
          return !(
            nodeBounds.x < commentBounds.x ||
            nodeBounds.x + nodeBounds.width >
              commentBounds.x + commentBounds.width ||
            nodeBounds.y < commentBounds.y ||
            nodeBounds.y + nodeBounds.height >
              commentBounds.y + commentBounds.height
          );
        });

        commentOffsetMap.current = nodesInComment.reduce<{
          [id: string]: { x: number; y: number };
        }>((map, nd) => {
          map[nd.id] = {
            x: nd.position.x - commentBounds.x,
            y: nd.position.y - commentBounds.y,
          };
          return map;
        }, {});
      }
    },
    [currentFlow?.isOtherUsersFlow, setIsDragging, nodes, rfInstance],
  );

  const handleNodeDrag: OnNodeDrag = useCallback(
    (_, node) => {
      if (node.type !== "comment" || !rfInstance) {
        return;
      }
      setNodesSilent((nodes) =>
        nodes.map((n) => {
          if (commentOffsetMap.current[n.id] == null) {
            return n;
          }
          return {
            ...n,
            position: {
              x: node.position.x + commentOffsetMap.current[n.id].x,
              y: node.position.y + commentOffsetMap.current[n.id].y,
            },
          };
        }),
      );
    },
    [rfInstance, setNodesSilent],
  );

  // Handle drag stop - create history if positions meaningfully changed
  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_, node: Node) => {
      if (currentFlow?.isOtherUsersFlow) return;

      setIsDragging(false);

      // Check if any dragged nodes moved significantly (more than a few pixels)
      const threshold = 5; // pixels
      let hasMeaningfulMovement = false;

      const selectedNodes = nodes.filter((n) => n.selected || n.id === node.id);

      for (const currentNode of selectedNodes) {
        const startPos = dragStartPositions.current.get(currentNode.id);
        if (startPos) {
          const deltaX = Math.abs(currentNode.position.x - startPos.x);
          const deltaY = Math.abs(currentNode.position.y - startPos.y);

          if (deltaX > threshold || deltaY > threshold) {
            hasMeaningfulMovement = true;
            break;
          }
        }
      }

      // If there was meaningful movement, create a history entry
      if (hasMeaningfulMovement) {
        console.log("[Drag] Creating history entry for position change");
        setNodesWithHistory((prev) => [...prev]); // This will trigger history due to position changes
      }

      if (rfInstance) {
        setNodesSilent((nodes) => {
          const lastComment = nodes.findLastIndex(
            (node) => node.type === "comment",
          );
          if (lastComment === -1) {
            return nodes;
          }
          const comments = nodes.slice(0, lastComment + 1);
          const orderedComments = comments.sort((comment1, comment2) => {
            const intersectingNodes1 = rfInstance?.getIntersectingNodes(
              comment1,
              false,
            );
            const intersectingNodes2 = rfInstance?.getIntersectingNodes(
              comment2,
              false,
            );
            return intersectingNodes1.length < intersectingNodes2.length
              ? -1
              : 1;
          });
          return [...orderedComments, ...nodes.slice(lastComment + 1)];
        });
      }

      // Clear the tracked positions
      dragStartPositions.current.clear();
      commentOffsetMap.current = {};
    },
    [
      currentFlow?.isOtherUsersFlow,
      setIsDragging,
      nodes,
      rfInstance,
      setNodesWithHistory,
      setNodesSilent,
    ],
  );

  // Handle adding a new node
  const handleAddNode = (type: string, data: NodeData) => {
    // if (isRunning) return; // prevent modifications while running
    if (currentFlow?.isOtherUsersFlow) {
      toast({
        title: "Read-only flow",
        description: "You cannot add nodes to someone else's flow.",
        variant: "destructive",
      });
      return;
    }
    const id = nanoid();

    // Determine drop position - if not set, use centre of current viewport
    let pos = {
      x: addNodeDialogPosition.x,
      y: addNodeDialogPosition.y,
    };
    if (rfInstance && (pos.x == null || pos.y == null)) {
      const rfAny = rfInstance as any;
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      if (typeof rfAny.screenToFlowPosition === "function") {
        pos = rfAny.screenToFlowPosition(center);
      } else if (typeof rfAny.project === "function") {
        pos = rfAny.project(center);
      }
    }

    const newNode = {
      id,
      type,
      position: {
        x: pos.x ?? 0,
        y: pos.y ?? 0,
      },
      data: {
        ...data,
        isPinned: false,
      },
      draggable: true,
    };

    // Use silent update to avoid double history
    setNodesSilent((nds) => [...nds, newNode]);
  };

  const handleAddComment = () => {
    if (currentFlow?.isOtherUsersFlow) {
      toast({
        title: "Read-only flow",
        description: "You cannot add comments to someone else's flow.",
        variant: "destructive",
      });
      return;
    }

    if (!rfInstance) {
      return;
    }

    const id = nanoid();

    const pos = rfInstance.screenToFlowPosition(
      flowContextMenuPosition ?? nodeContextMenuData ?? { x: 0, y: 0 },
    );
    const newComment = {
      id,
      type: "comment",
      position: {
        x: pos.x ?? 0,
        y: pos.y ?? 0,
      },
      data: {
        comment: "",
        color:
          commentColorOptions[
            Math.floor(commentColorOptions.length * Math.random())
          ].color,
        width: 600,
        height: 400,
      },
      draggable: true,
    };

    // Use silent update to avoid double history
    setNodesWithHistory((nds) => [newComment, ...nds]);
  };

  // Handle deleting an edge
  const handleDeleteEdge = (edge: Edge) => {
    setEdgesWithHistory((eds) => eds.filter((e) => e.id !== edge.id));
    setEdgeContextMenuData(null);
  };

  /* --------------------------------------------------------------------
     Workflow execution over the graph
     ------------------------------------------------------------------*/

  const executeComposerWorkflow = useExecuteComposerWorkflow({
    setNodes,
    uploadThumb,
    updateExampleOutput,
    onStarted: () => {
      setStatusText("Workflow running...");
      setStatusType("processing");
    },
    onSuccess: () => {
      setStatusText("Workflow completed successfully");
      setStatusType("complete");
      toast({
        title: "Flow completed",
        description: "Your flow finished successfully.",
        variant: "success",
        action: (
          <ToastAction
            altText="view"
            onClick={() => router.push(`/composer/${flowIdParam}`)}
            className="flex items-center border border-none bg-transparent px-2 py-1 font-mono text-xs whitespace-nowrap text-green-400 underline hover:bg-transparent"
          >
            View
          </ToastAction>
        ),
      });
    },
    onRateLimit: () => {
      toast({
        title: "Workflow error",
        description:
          "You have reached the maximum number of runs for this workflow.",
        variant: "destructive",
      });
    },
    onFailedWithError: (error: string) => {
      toast({
        title: "Workflow failed",
        description: error,
        variant: "destructive",
        duration: 10000,
      });
    },
    onError: () => {
      setStatusText("Workflow completed with errors");
      setStatusType("error");
      toast({
        title: "Workflow completed with errors",
        description: "One or more nodes failed. Check logs for details.",
        variant: "destructive",
      });
    },
    onFailed: (err: any) => {
      setStatusText("Workflow failed");
      setStatusType("error");
      toast({
        title: "Workflow failed",
        description:
          (err as any)?.message ||
          (typeof err === "string" ? err : JSON.stringify(err)) ||
          "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Handle draft persistence when switching away from a flow.
  // Logic:
  // 1. Identify the flow we are leaving (prevId).
  // 2. If that flow is STILL OPEN in another tab *and* it is dirty → save a snapshot draft.
  // 3. Otherwise (tab closed, or not dirty) → clear any existing draft.
  useEffect(() => {
    const prevId = prevKeyRef.current;

    if (prevId) {
      // Check if this is someone else's flow
      const prevFlow = [...(userFlows ?? []), publicFlow].find(
        (f) => f && f.id === prevId,
      );
      if (
        prevFlow &&
        "isOtherUsersFlow" in prevFlow &&
        prevFlow.isOtherUsersFlow
      ) {
        console.log(
          "[Composer] Not saving draft for other user's flow",
          prevId,
        );
        prevKeyRef.current = slug;
        return;
      }

      const { dirty } = useFlowStore.getState();
      const { tabs } = useTabStore.getState();

      // Does another tab still reference this flow?
      const stillOpen = tabs.some((t) => {
        if (!t.href.startsWith("/composer")) return false;
        const idParam = new URL(t.href, "http://localhost").searchParams.get(
          "id",
        );
        return idParam === prevId;
      });

      if (stillOpen && dirty[prevId]) {
        // Keep a working draft snapshot
        const snapshot = toJson();
        saveDraft(prevId, snapshot);
        console.log("[Composer] Saved draft for", prevId);
      } else {
        // Either not open anymore (user closed tab) or clean → clear draft
        clearDraft(prevId);
        console.log("[Composer] Cleared draft for", prevId);
      }
    }

    prevKeyRef.current = slug;
  }, [slug, userFlows, publicFlow]);

  const lastSavedRef = useRef<FlowSnapshot | null>(null);

  // whenever nodes/edges change, recompute "dirty" flag
  const setGlobalDirty = useFlowStore((s) => s.setDirty);

  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    console.log("dirty", dirty);
  }, [dirty]);

  // Recompute dirty flag whenever the canvas mutates
  useEffect(() => {
    // Never mark other users' flows as dirty
    if (currentFlow?.isOtherUsersFlow) {
      setDirty(false);
      if (id) setGlobalDirty(id, false);
      return;
    }

    if (!lastSavedRef.current) {
      // Nothing persisted yet (new flow) → dirty as soon as there is at least one node/edge
      const hasContent = nodes.length > 0 || edges.length > 0;
      setDirty(hasContent);
      if (id) setGlobalDirty(id, hasContent);
      return;
    }

    const liveSnap = makeSnapshot(nodes, edges);
    const same = snapshotsEqual(liveSnap, lastSavedRef.current);
    setDirty(!same);
    if (id) setGlobalDirty(id, !same);
  }, [nodes, edges, currentFlow?.isOtherUsersFlow]);

  // ------------------------------------------------------------------
  // Determine initial viewport BEFORE first paint to minimise flicker
  // ------------------------------------------------------------------
  const initialViewport = useMemo(() => {
    if (!id) return undefined;
    // Prefer draft snapshot (latest work-in-progress)
    const draft = getDraft(id);
    if (draft?.viewport) return draft.viewport;

    // Fallback to the saved flow record
    const rec = userFlows?.find((f) => f.id === id);
    if (rec) {
      try {
        const obj = JSON.parse(rec.data);
        if (obj.viewport) return obj.viewport;
      } catch {
        /* ignored */
      }
    }
    return undefined;
  }, [id, drafts, userFlows]);

  // Flush undo/redo history when switching to a new flow id
  useEffect(() => {
    resetHistory();
  }, [id, resetHistory]);

  useEffect(() => {
    // Skip if currentFlow hasn't meaningfully changed (just an update to same flow)
    const prevFlow = prevCurrentFlowRef.current;
    if (prevFlow && currentFlow && prevFlow.id === currentFlow.id) {
      // Check if only non-essential fields changed (like example output)
      const essentialFieldsChanged =
        prevFlow.data !== currentFlow.data ||
        prevFlow.name !== currentFlow.name;

      if (!essentialFieldsChanged) {
        console.log(
          "[Composer] Skipping reload - only non-essential fields changed",
        );
        prevCurrentFlowRef.current = currentFlow;
        return; // Skip reload if only non-essential fields changed
      }
    }
    prevCurrentFlowRef.current = currentFlow;

    // try draft first
    const draft = getDraft(slug);
    const rec = currentFlow;

    // Check if draft has execution results
    const draftHasExecutionResults =
      draft &&
      draft.nodes?.some(
        (n: Node) => n.type === "resultNode" && n.data && (n.data as any).src,
      );

    if (draftHasExecutionResults) {
      console.log("[Composer] Draft has execution results, loading from draft");
    }

    if (draft) {
      // 1) Load the draft to show latest work-in-progress state
      loadFromJson(draft);

      // Check for missing workflows in the loaded draft
      // registerMissingWorkflows(draft.nodes || []);

      // 2) Determine baseline snapshot for dirty comparison:
      //    - if a saved flow exists, that snapshot is our reference;
      //    - otherwise (brand-new flow) there is no baseline yet.
      if (rec) {
        const savedObj = JSON.parse(rec.data);
        lastSavedRef.current = makeSnapshot(
          savedObj.nodes ?? [],
          savedObj.edges ?? [],
        );
      } else {
        lastSavedRef.current = null;
      }

      // Initial dirty flag after load
      const currentSnap = makeSnapshot(draft.nodes ?? [], draft.edges ?? []);
      const isDirtyNow =
        !!lastSavedRef.current &&
        !snapshotsEqual(currentSnap, lastSavedRef.current) &&
        !rec?.isOtherUsersFlow; // Never set dirty for other users' flows
      if (id) setGlobalDirty(id, isDirtyNow);
      setDirty(isDirtyNow);

      // Restore saved viewport position if present
      if (draft.viewport) {
        rfInstance?.setViewport(draft.viewport, { duration: 0 });
      }
    } else if (rec) {
      const dataObj = JSON.parse(rec.data);
      loadFromJson(dataObj);

      // Check for missing workflows in the loaded flow data
      // registerMissingWorkflows(dataObj.nodes || []);

      lastSavedRef.current = makeSnapshot(
        dataObj.nodes ?? [],
        dataObj.edges ?? [],
      );
      if (id) setGlobalDirty(id, false);

      if (dataObj.viewport) {
        rfInstance?.setViewport(dataObj.viewport, { duration: 0 });
      }

      if (currentFlow?.isOtherUsersFlow) {
        setTimeout(() => {
          setNodes((nodes) =>
            nodes.map((node) => ({
              ...node,
              draggable: false,
              selectable: true, // Keep nodes selectable for better UX
            })),
          );
        }, 0);
      }
    } else {
      clearCanvas();
      lastSavedRef.current = null;
      if (id) setGlobalDirty(id, false);
    }
  }, [slug, currentFlow, rfInstance]); // Restored currentFlow dependency

  const handleSave = async () => {
    if (currentFlow?.isOtherUsersFlow) {
      toast({
        title: "Cannot save",
        description:
          "You cannot save changes to someone else's flow. Fork it to create your own copy.",
        variant: "destructive",
      });
      return;
    }

    console.group("[Composer] handleSave");
    console.log("Invoked at", new Date().toISOString(), {
      flowId: id,
      isDirty: dirty,
      isRunning,
      currentFlowExists: !!currentFlow,
    });
    try {
      const isNew = !currentFlow;

      try {
        rfInstance?.fitView({ padding: 0.4, duration: 0 });
      } catch {}
      await new Promise((res) => setTimeout(res, 500));

      let savedThumbnail = null;
      if (!isNew) {
        toast({
          title: "Saving flow",
          description: "Please wait while we save your flow",
        });
        let thumbnailUrl = null;
        try {
          console.log("[handleSave] Capturing thumbnail...");
          thumbnailUrl = await captureThumbnail();
          console.log("[handleSave] captureThumbnail returned", {
            hasData: !!thumbnailUrl,
            length: thumbnailUrl?.length,
          });
        } catch (err) {
          console.error("[handleSave] thumbnail capture failed", err);
        }
        if (thumbnailUrl) {
          try {
            console.log("[handleSave] Uploading thumbnail...");
            const { url } = await uploadThumbDirect.mutateAsync(thumbnailUrl);
            savedThumbnail = url;
            console.log("[handleSave] Thumbnail upload success", url);
          } catch (err) {
            console.error("[handleSave] thumbnail upload failed", err);
          }
        }
      }
      const jsonData = JSON.stringify(toJson());

      if (isNew) {
        pendingDataRef.current = jsonData;
        setNameModalOpen(true);
      } else {
        const existing = currentFlow;
        if (!existing) {
          console.error(`Flow with id ${id} not found`);
          console.groupEnd();
          return;
        }
        const flowObj = {
          id: existing.id,
          name: existing.name,
          data: jsonData,
          emoji: existing.emoji,
          thumbnail: savedThumbnail,
        };
        console.log("[handleSave] Saving existing flow", flowObj);
        // Remove any stale draft first so the load effect will not pick it up
        clearDraft(slug);

        await saveFlowMutation.mutateAsync(flowObj);
        console.log("[handleSave] Flow saved successfully");
        // Update last saved snapshot immediately so dirty flag resets
        lastSavedRef.current = makeSnapshot(nodes, edges);
        setDirty(false);
        if (id) setGlobalDirty(id, false);

        toast({ title: "Flow updated", variant: "success" });
      }
    } catch (err) {
      console.error("Failed to save flow", err);
      toast({
        title: "Save failed",
        description: String(err),
        variant: "destructive",
      });
    }
    // (draft already cleared above for existing flows; safe to call again for new)
    clearDraft(slug);
    console.groupEnd();
  };

  /* ------------------------------------------------------------------
     Clipboard helpers – copy / cut / paste selected nodes & edges
  ------------------------------------------------------------------*/

  const { copySelection, cutSelection, pasteSelection } = useClipboard({
    clipboardRef,
  });

  const pasteClipboard = useCallback(
    (atPosition?: { x: number; y: number }) => {
      // Don't allow pasting in read-only flows
      if (currentFlow?.isOtherUsersFlow) {
        toast({
          title: "Read-only flow",
          description: "You cannot paste nodes into someone else's flow.",
          variant: "destructive",
        });
        return;
      }

      // If we have a specific position (from context menu), use it
      // Otherwise use default offset
      let pastePosition = { x: 0, y: 0 };
      if (atPosition && rfInstance) {
        // Convert screen position to flow position
        pastePosition = rfInstance.screenToFlowPosition(atPosition);
      } else {
        // Default offset from original positions
        const offset = 40;
        pastePosition = { x: offset, y: offset };
      }

      // Try in-memory first
      if (clipboardRef.current) {
        pasteSelection(clipboardRef.current, pastePosition);
        return;
      }

      // Fallback to system clipboard
      try {
        navigator.clipboard.readText().then((txt) => {
          try {
            const obj = JSON.parse(txt);
            if (obj && obj.nodes && obj.edges) {
              pasteSelection(obj, pastePosition);
            }
          } catch {
            /* ignore invalid */
          }
        });
      } catch {
        /* ignore */
      }
    },
    [currentFlow?.isOtherUsersFlow, pasteSelection, rfInstance],
  );

  // keyboard shortcuts
  useKeyboardShortcuts({
    isOtherUsersFlow: currentFlow?.isOtherUsersFlow ?? false,
    setIsAddNodeDialogOpen,
    isRunning,
    executeComposerWorkflow,
    flowIdParam: flowIdParam!,
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
  });

  // Listen for an external save request (from TopBar)
  useEffect(() => {
    const listener = async (ev: Event) => {
      const flowId = (ev as CustomEvent<string>).detail;
      if (!flowId || flowId !== id) return;
      await handleSave();
      window.dispatchEvent(new CustomEvent("flow_saved", { detail: flowId }));
    };
    window.addEventListener("request_save_flow", listener as any);
    return () =>
      window.removeEventListener("request_save_flow", listener as any);
  }, [id]);

  // Keep viewport in store so it gets saved
  const handleMoveEnd = useCallback(
    (_: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewportState(viewport);
    },
    [setViewportState],
  );

  const handlePaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      setEdgeContextMenuData(null);
      setNodeContextMenuData(null);
      setSelectionContextMenuData(null);
      setFlowContextMenuPosition({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleNodeContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent, node: Node) => {
      e.preventDefault();

      // Check if multiple items are selected and this node is part of the selection
      const selectedNodes = nodes.filter((n) => n.selected);
      const selectedEdges = edges.filter((e) => e.selected);
      const totalSelected = selectedNodes.length + selectedEdges.length;

      if (totalSelected > 1 && node.selected) {
        // Show selection context menu instead
        setEdgeContextMenuData(null);
        setFlowContextMenuPosition(null);
        setNodeContextMenuData(null);
        setSelectionContextMenuData({
          x: e.clientX,
          y: e.clientY,
          selectedNodesCount: selectedNodes.length,
          selectedEdgesCount: selectedEdges.length,
        });
      } else {
        // Close other menus before opening node menu
        setEdgeContextMenuData(null);
        setFlowContextMenuPosition(null);
        setSelectionContextMenuData(null);
        setNodeContextMenuData({ node, x: e.clientX, y: e.clientY });
        // Select only this node
        setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: n.id === node.id })),
        );
      }
    },
    [setNodes, nodes, edges],
  );

  const handleEdgeContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      // Close any existing menus before opening edge menu
      setFlowContextMenuPosition(null);
      setNodeContextMenuData(null);
      setEdgeContextMenuData({ edge, x: e.clientX, y: e.clientY });
      setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === edge.id })));
    },
    [setEdges, setNodes],
  );

  const handlePaneClick = useCallback(() => {
    setEdgeContextMenuData(null);
    setFlowContextMenuPosition(null);
    setNodeContextMenuData(null);
    setSelectionContextMenuData(null);
  }, []);

  const [showWorkflowLogs, setShowWorkflowLogs] = useState(false);

  // --- Save draft on unmount (navigating away from composer entirely) ---
  const idPersistRef = useRef<string | null>(id);
  useEffect(() => {
    idPersistRef.current = id;
  }, [id]);

  useEffect(() => {
    return () => {
      const flowId = idPersistRef.current;
      if (!flowId) return;

      // Don't save drafts for other users' flows
      const flow = [...(userFlows ?? []), publicFlow].find(
        (f) => f && f.id === flowId,
      );
      if (flow && "isOtherUsersFlow" in flow && flow.isOtherUsersFlow) {
        console.log(
          "[Composer] Not saving draft for other user's flow",
          flowId,
        );
        return;
      }

      const { dirty } = useFlowStore.getState();
      if (dirty[flowId]) {
        try {
          const snapshot = toJson();
          saveDraft(flowId, snapshot);
          console.log("[Composer] Saved draft for", flowId, "on unmount");
        } catch (err) {
          console.error("Failed to save draft on unmount", err);
        }
      } else {
        clearDraft(flowId);
        console.log(
          "[Composer] Cleared draft for",
          flowId,
          "on unmount (clean)",
        );
      }
    };
  }, [userFlows, publicFlow]);

  // Keep store in sync with the flow currently opened in this tab
  useEffect(() => {
    setStoreCurrentFlowId(flowIdParam || undefined);
  }, [flowIdParam, setStoreCurrentFlowId]);

  // Check if flow is NSFW and requires age verification
  useEffect(() => {
    if (currentFlow?.nsfw && !ageVerified && !user?.isOver18 && user) {
      setShowAgeVerification(true);
    } else {
      setShowAgeVerification(false);
    }
  }, [currentFlow, ageVerified, user?.isOver18, user]);

  // Reset age verification when switching flows
  useEffect(() => {
    setAgeVerified(false);
  }, [flowIdParam]);

  const handleAgeVerification = (dontAskAgain: boolean) => {
    setAgeVerified(true);
    setShowAgeVerification(false);

    // If user checked "don't ask again", update their profile
    if (dontAskAgain && user) {
      try {
        updateUser.mutate({ isOver18: true });
      } catch (error) {
        console.error("Failed to save age preference:", error);
      }
    }
  };

  const handleAgeVerificationCancel = () => {
    router.push("/"); // Redirect to home page
  };

  // Don't render the flow until age is verified (if NSFW)
  if (currentFlow?.nsfw && !ageVerified && !user?.isOver18 && user) {
    return (
      <>
        <div className="flex-1 bg-black" />
        <AgeVerificationModal
          isOpen={showAgeVerification}
          onVerify={handleAgeVerification}
          onCancel={handleAgeVerificationCancel}
        />
      </>
    );
  }

  if (userLoading) {
    return <div className="flex-1 bg-black" />;
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <DndProvider backend={HTML5Backend}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onViewportChange={onViewportChange}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMoveEnd={handleMoveEnd}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          className="flex-1"
          defaultEdgeOptions={defaultEdgeOptions}
          nodeTypes={nodeTypes}
          selectNodesOnDrag={!currentFlow || !currentFlow?.isOtherUsersFlow}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneClick={handlePaneClick}
          nodesDraggable={!currentFlow?.isOtherUsersFlow}
          nodesConnectable={!currentFlow || !currentFlow?.isOtherUsersFlow}
          elementsSelectable={true}
          deleteKeyCode={
            !currentFlow || currentFlow?.isOtherUsersFlow ? null : "Delete"
          }
          connectionLineStyle={{ strokeWidth: 3, stroke: "#ff4d4d" }}
          onInit={(inst) => setRfInstance(inst)}
          defaultViewport={initialViewport}
          minZoom={0.05}
          onSelectionContextMenu={(event, nodes) => {
            event.preventDefault();
            if (nodes.length > 0) {
              const selectedEdges = edges.filter((e) => e.selected);
              setEdgeContextMenuData(null);
              setNodeContextMenuData(null);
              setFlowContextMenuPosition(null);
              setSelectionContextMenuData({
                x: event.clientX,
                y: event.clientY,
                selectedNodesCount: nodes.length,
                selectedEdgesCount: selectedEdges.length,
              });
            }
          }}
          selectionMode={SelectionMode.Partial}
        >
          <Background
            id="grid-primary"
            gap={20}
            color="rgba(255, 255, 255, 0.5)"
            variant={BackgroundVariant.Dots}
            bgColor="#000000"
          />
          <Background
            id="grid-secondary"
            gap={100}
            color="rgba(255, 255, 255, 0.1)"
            variant={BackgroundVariant.Lines}
            bgColor="transparent"
          />

          {/* Action Buttons - Positioned in top-right corner */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            {currentFlow?.isOtherUsersFlow ? (
              <ViewActions
                isForking={forkFlow.isPending}
                onFork={() => {
                  forkFlow.mutate({ flowId: currentFlow.id });
                }}
              />
            ) : (
              <EditActions
                canUndo={canUndo}
                canRedo={canRedo}
                onAddNode={() => setIsAddNodeDialogOpen(true)}
                onSave={handleSave}
                onUndo={undo}
                onRedo={redo}
              />
            )}
            <Button
              onClick={() => {
                if (!user) {
                  router.push("/join");
                  return;
                }
                executeComposerWorkflow(flowIdParam!);
              }}
              className={`h-8 rounded-none border px-3 py-1 font-mono text-xs ${
                !user
                  ? "border-yellow-500/30 bg-yellow-500/20 font-bold text-yellow-400 shadow-md hover:bg-yellow-500/30"
                  : "border-blue-500/30 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              }`}
              title={!user ? "Sign in to run" : "Run Workflow ⌘+Enter"}
              disabled={user ? isRunning : false}
            >
              {!user ? (
                <div className="flex items-center font-bold">
                  <svg
                    className="mr-1"
                    width={16}
                    height={16}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  SIGN IN TO RUN
                </div>
              ) : (
                <>
                  <CpuIcon size={14} className="mr-1.5" />
                  RUN
                </>
              )}
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="absolute right-2 bottom-20 z-80 flex items-center gap-2 sm:right-4 sm:bottom-10">
              <FpsCounter />
              <Button
                onClick={() => setShowWorkflowLogs(true)}
                className="h-8 rounded-none border border-blue-500/30 bg-blue-500/20 px-2 font-mono text-xs text-blue-400 hover:bg-blue-500/30"
                title="View Workflow Logs"
              >
                <Terminal size={12} className="mr-1" />
                LOGS
              </Button>
            </div>
          )}
        </ReactFlow>
      </DndProvider>

      <AddNodeDialog
        open={isAddNodeDialogOpen}
        onOpenChange={(open) => {
          setIsAddNodeDialogOpen(open);
          if (!open) {
            setAddNodeDialogPosition({ x: null, y: null });
          }
        }}
        onAddNode={handleAddNode}
      />

      {edgeContextMenuData && (
        <EdgeContextMenu
          edge={edgeContextMenuData.edge}
          left={edgeContextMenuData.x}
          top={edgeContextMenuData.y}
          isOtherUsersFlow={currentFlow?.isOtherUsersFlow}
          onDeleteEdge={handleDeleteEdge}
          onClose={() => setEdgeContextMenuData(null)}
        />
      )}

      {flowContextMenuPosition && (
        <FlowContextMenu
          left={flowContextMenuPosition.x}
          top={flowContextMenuPosition.y}
          onClose={() => setFlowContextMenuPosition(null)}
          onAddNode={() => {
            const pos = rfInstance?.screenToFlowPosition({
              x: flowContextMenuPosition.x,
              y: flowContextMenuPosition.y,
            });
            if (pos) {
              setAddNodeDialogPosition({ x: pos.x, y: pos.y });
            }
            setIsAddNodeDialogOpen(true);
            // Don't manually close here - FlowContextMenu handles the animation
          }}
          onAddComment={handleAddComment}
          onPaste={() => pasteClipboard(flowContextMenuPosition)}
          onSave={handleSave}
          isOtherUsersFlow={currentFlow?.isOtherUsersFlow}
        />
      )}

      {nodeContextMenuData && (
        <NodeContextMenu
          node={nodeContextMenuData.node}
          left={nodeContextMenuData.x}
          top={nodeContextMenuData.y}
          onAddNode={() => {
            const pos = rfInstance?.screenToFlowPosition({
              x: nodeContextMenuData.x,
              y: nodeContextMenuData.y,
            });
            if (pos) {
              setAddNodeDialogPosition({ x: pos.x, y: pos.y });
            }
            setIsAddNodeDialogOpen(true);
            // Don't manually close here - FlowContextMenu handles the animation
          }}
          onAddComment={handleAddComment}
          onClose={() => setNodeContextMenuData(null)}
          onChangeColor={handleNodeChangeColor}
          onTogglePin={handleNodeTogglePin}
          onToggleCollapse={handleNodeToggleCollapse}
          onCopy={handleNodeCopy}
          onDelete={handleNodeDelete}
          isOtherUsersFlow={currentFlow?.isOtherUsersFlow}
        />
      )}

      {selectionContextMenuData && (
        <SelectionContextMenu
          left={selectionContextMenuData.x}
          top={selectionContextMenuData.y}
          selectedNodesCount={selectionContextMenuData.selectedNodesCount}
          selectedEdgesCount={selectionContextMenuData.selectedEdgesCount}
          onClose={() => setSelectionContextMenuData(null)}
          onCopy={copySelection}
          onDelete={handleDeleteSelected}
          isOtherUsersFlow={currentFlow?.isOtherUsersFlow}
        />
      )}

      {/* Name new flow modal */}
      <NewFlowModal
        open={nameModalOpen}
        onClose={() => {
          setNameModalOpen(false);
          pendingDataRef.current = null;
        }}
        onSave={handleModalSave}
      />
    </div>
  );
}
