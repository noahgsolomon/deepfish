import { Edge, Node } from "@xyflow/react";
import { useCallback } from "react";
import { toast } from "~/hooks/use-toast";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";
import { nanoid } from "nanoid";

interface UseClipboardProps {
  clipboardRef: React.RefObject<{ nodes: Node[]; edges: Edge[] } | null>;
}

export const useClipboard = ({ clipboardRef }: UseClipboardProps) => {
  const nodes = useComposeWorkflowStore((s) => s.nodes);
  const edges = useComposeWorkflowStore((s) => s.edges);
  const setNodesAndEdgesWithHistory = useComposeWorkflowStore(
    (s) => s.setNodesAndEdgesWithHistory,
  );

  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    );

    // Deep copy to detach references
    const payload = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)) as Node[],
      edges: JSON.parse(JSON.stringify(selectedEdges)) as Edge[],
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
      description: "You can paste the nodes and edges into another flow.",
      variant: "success",
    });
  }, [nodes, edges, clipboardRef]);

  const cutSelection = useCallback(() => {
    copySelection();

    const selectedIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id),
    );
    if (selectedIds.size === 0) return;

    // Use atomic operation to update both nodes and edges in a single history entry
    setNodesAndEdgesWithHistory(
      // Remove selected nodes
      (prev) => prev.filter((n) => !selectedIds.has(n.id)),
      // Remove edges connected to cut nodes
      (prev) =>
        prev.filter(
          (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target),
        ),
    );
  }, [copySelection, nodes, setNodesAndEdgesWithHistory]);

  const pasteSelection = useCallback(
    (
      payload: { nodes: Node[]; edges: Edge[] } | null,
      pastePosition: { x: number; y: number },
    ) => {
      if (!payload) return;

      const idMap: Record<string, string> = {};

      // Calculate the bounds of the copied nodes to center them at paste position
      let minX = Infinity,
        minY = Infinity;
      payload.nodes.forEach((node) => {
        minX = Math.min(minX, node.position?.x || 0);
        minY = Math.min(minY, node.position?.y || 0);
      });

      const newNodes: Node[] = payload.nodes.map((orig) => {
        const newId = nanoid();
        idMap[orig.id] = newId;

        // Position relative to paste position
        const relativeX = (orig.position?.x || 0) - minX;
        const relativeY = (orig.position?.y || 0) - minY;

        return {
          ...orig,
          id: newId,
          position: {
            x: pastePosition.x + relativeX,
            y: pastePosition.y + relativeY,
          },
          selected: true,
          draggable: true, // Explicitly set draggable
        } as Node;
      });

      const newEdges: Edge[] = payload.edges.map((orig) => {
        return {
          ...orig,
          id: nanoid(),
          source: idMap[orig.source],
          target: idMap[orig.target],
          selected: true,
        } as Edge;
      });

      // Append to canvas - use history-aware methods for user actions
      setNodesAndEdgesWithHistory(
        // Add new nodes (and deselect existing ones)
        (prev) => [
          ...prev.map((n) => ({ ...n, selected: false })),
          ...newNodes,
        ],
        // Add new edges
        (prev) => [...prev, ...newEdges],
      );
    },
    [setNodesAndEdgesWithHistory],
  );

  return { copySelection, cutSelection, pasteSelection };
};
