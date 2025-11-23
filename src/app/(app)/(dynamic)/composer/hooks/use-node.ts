import { applyNodeChanges, Node, Edge, NodeChange } from "@xyflow/react";
import React, { useCallback } from "react";
import { toast } from "~/hooks/use-toast";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";

interface UseNodeProps {
  clipboardRef: React.RefObject<{ nodes: Node[]; edges: Edge[] } | null>;
}

export const useNode = ({ clipboardRef }: UseNodeProps) => {
  const nodes = useComposeWorkflowStore((s) => s.nodes);
  const setNodes = useComposeWorkflowStore((s) => s.setNodes);
  const edges = useComposeWorkflowStore((s) => s.edges);
  const setNodesAndEdgesWithHistory = useComposeWorkflowStore(
    (s) => s.setNodesAndEdgesWithHistory,
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );

  const onNodeChangeColor = useCallback(
    (nodeId: string, color: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, color } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const onNodeTogglePin = useCallback(
    (nodeId: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                draggable: !node.draggable,
                data: { ...node.data, isPinned: !node.data.isPinned },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const onNodeToggleCollapse = useCallback(
    (nodeId: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, collapsed: !node.data.collapsed },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const onNodeCopy = useCallback(
    (nodeId: string) => {
      const nodeToCopy = nodes.find((n) => n.id === nodeId);
      if (!nodeToCopy) return;

      // Find edges connected to this node
      const nodeEdges = edges.filter(
        (e) => e.source === nodeId || e.target === nodeId,
      );

      // Deep copy to detach references
      const payload = {
        nodes: [JSON.parse(JSON.stringify(nodeToCopy))],
        edges: JSON.parse(JSON.stringify(nodeEdges)),
      };

      clipboardRef.current = payload;

      // Attempt to write to system clipboard for cross-tab copy (best-effort)
      try {
        navigator.clipboard.writeText(JSON.stringify(payload)).catch(() => {});
      } catch {
        /* no-op */
      }

      toast({
        title: "Copied to clipboard",
        description: "You can paste the node into another flow.",
        variant: "success",
      });
    },
    [nodes, edges, clipboardRef],
  );

  const onNodeDelete = useCallback(
    (nodeId: string) => {
      // Use history-aware delete
      setNodesAndEdgesWithHistory(
        // Remove the node
        (prev) => prev.filter((n) => n.id !== nodeId),
        // Remove edges connected to the deleted node
        (prev) =>
          prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
    },
    [setNodesAndEdgesWithHistory],
  );

  return {
    onNodesChange,
    onNodeChangeColor,
    onNodeTogglePin,
    onNodeToggleCollapse,
    onNodeCopy,
    onNodeDelete,
  };
};
