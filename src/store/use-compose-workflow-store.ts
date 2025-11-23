import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";

interface ComposeState {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  meta: {
    title?: string;
    description?: string;
    previewImage?: string;
  };
  draggingType?: string;
  isDragging?: boolean;
  /**
   * The flow currently being viewed in any Composer instance.
   * When executing a workflow we can compare against this to decide
   * whether UI mutations (node highlight, progress, etc.) should be
   * applied to the shared store or kept local to the runner.
   */
  currentFlowId?: string;
  setCurrentFlowId: (flowId?: string) => void;
  setDraggingType: (t?: string) => void;
  setIsDragging: (dragging: boolean) => void;
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  setNodesWithHistory: (fn: (prev: Node[]) => Node[]) => void;
  setEdgesWithHistory: (fn: (prev: Edge[]) => Edge[]) => void;
  setViewport: (vp: { x: number; y: number; zoom: number }) => void;
  setMeta: (meta: ComposeState["meta"]) => void;
  replaceAll: (nodes: Node[], edges: Edge[]) => void;
  loadFromJson: (data: Partial<ComposeState>) => void;
  toJson: () => Partial<ComposeState>;
  clear: () => void;
  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: () => void;
  // Atomic operation to update both nodes and edges in a single history entry
  setNodesAndEdgesWithHistory: (
    nodeUpdater: (prev: Node[]) => Node[],
    edgeUpdater: (prev: Edge[]) => Edge[],
  ) => void;
  // Silent setNodes - updates nodes without history (for programmatic changes)
  setNodesSilent: (updater: (prev: Node[]) => Node[]) => void;
}

// Helper for deep snapshot
function makeSnapshot(state: ComposeState) {
  return {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
    viewport: { ...state.viewport },
    meta: { ...state.meta },
  };
}

// Helper to determine if nodes changed meaningfully (not just position/selection)
function nodesMeaningfullyChanged(oldNodes: Node[], newNodes: Node[]): boolean {
  // Different lengths = add/remove
  if (oldNodes.length !== newNodes.length) return true;

  // Create maps for O(1) lookup
  const oldMap = new Map(oldNodes.map((n) => [n.id, n]));
  const newMap = new Map(newNodes.map((n) => [n.id, n]));

  // Check if any node was added or removed
  for (const oldNode of oldNodes) {
    if (!newMap.has(oldNode.id)) return true;
  }
  for (const newNode of newNodes) {
    if (!oldMap.has(newNode.id)) return true;
  }

  // Check if any node changed meaningfully (not just position/selection)
  for (const newNode of newNodes) {
    const oldNode = oldMap.get(newNode.id);
    if (!oldNode) continue;

    // Check type change
    if (oldNode.type !== newNode.type) return true;

    // Check data changes (excluding transient data like running state)
    const oldData = { ...oldNode.data };
    const newData = { ...newNode.data };

    // Remove transient fields that shouldn't trigger history
    delete oldData.running;
    delete oldData.error;
    delete newData.running;
    delete newData.error;

    if (JSON.stringify(oldData) !== JSON.stringify(newData)) return true;

    // Check draggable change (pinning/unpinning)
    if (oldNode.draggable !== newNode.draggable) return true;
  }

  return false;
}

// Helper to determine if edges changed meaningfully
function edgesMeaningfullyChanged(oldEdges: Edge[], newEdges: Edge[]): boolean {
  // Different lengths = add/remove
  if (oldEdges.length !== newEdges.length) return true;

  // Create maps for O(1) lookup
  const oldMap = new Map(oldEdges.map((e) => [e.id, e]));
  const newMap = new Map(newEdges.map((e) => [e.id, e]));

  // Check if any edge was added or removed
  for (const oldEdge of oldEdges) {
    if (!newMap.has(oldEdge.id)) return true;
  }
  for (const newEdge of newEdges) {
    if (!oldMap.has(newEdge.id)) return true;
  }

  // Check if any edge changed meaningfully
  for (const newEdge of newEdges) {
    const oldEdge = oldMap.get(newEdge.id);
    if (!oldEdge) continue;

    // Check connection changes
    if (
      oldEdge.source !== newEdge.source ||
      oldEdge.target !== newEdge.target ||
      oldEdge.sourceHandle !== newEdge.sourceHandle ||
      oldEdge.targetHandle !== newEdge.targetHandle
    ) {
      return true;
    }
  }

  return false;
}

export const useComposeWorkflowStore = create<ComposeState>((set, get) => {
  // In-memory history stack
  let history: any[] = [];
  let historyIndex = -1;
  const maxHistory = 10;

  // Helper to push a new snapshot to history
  function pushHistory() {
    const snap = makeSnapshot(get());
    // If not at end, truncate redo stack
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(snap);
    if (history.length > maxHistory) {
      history.shift();
    }
    historyIndex = history.length - 1;
  }

  // Helper to update canUndo/canRedo
  function updateUndoRedoFlags() {
    set({
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
    });
  }

  // Initial state
  const initialState = {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    meta: {},
    draggingType: undefined,
    isDragging: false,
    currentFlowId: undefined,
    canUndo: false,
    canRedo: false,
    // Smart setNodes - only pushes history for meaningful changes
    setNodes: (updater: (prev: Node[]) => Node[]) => {
      set((state) => {
        const oldNodes = state.nodes;
        const newNodes = updater(state.nodes);

        // Suppress all history during dragging - position changes will be handled by drag stop
        if (state.isDragging) {
          return { nodes: newNodes };
        }

        // Only push history if nodes changed meaningfully
        if (nodesMeaningfullyChanged(oldNodes, newNodes)) {
          setTimeout(() => {
            pushHistory();
            updateUndoRedoFlags();
          }, 0);
        }

        return { nodes: newNodes };
      });
    },
    // Smart setEdges - only pushes history for meaningful changes
    setEdges: (updater: (prev: Edge[]) => Edge[]) => {
      set((state) => {
        const oldEdges = state.edges;
        const newEdges = updater(state.edges);

        // Only push history if edges changed meaningfully
        if (edgesMeaningfullyChanged(oldEdges, newEdges)) {
          setTimeout(() => {
            pushHistory();
            updateUndoRedoFlags();
          }, 0);
        }

        return { edges: newEdges };
      });
    },
    // Explicit methods for when we know we want to push history
    setNodesWithHistory: (updater: (prev: Node[]) => Node[]) => {
      set((state) => {
        const nodes = updater(state.nodes);
        return { nodes };
      });
      // Use setTimeout for consistency with setEdgesWithHistory
      setTimeout(() => {
        pushHistory();
        updateUndoRedoFlags();
      }, 0);
    },
    setEdgesWithHistory: (updater: (prev: Edge[]) => Edge[]) => {
      set((state) => {
        const newEdges = updater(state.edges);

        // Always push history for explicit history calls
        setTimeout(() => {
          pushHistory();
          updateUndoRedoFlags();
        }, 0);

        return { edges: newEdges };
      });
    },
    setViewport: (viewport: { x: number; y: number; zoom: number }) => {
      set({ viewport });
      // Don't push history for viewport changes - these are too frequent
    },
    setMeta: (meta: ComposeState["meta"]) => {
      set({ meta });
      // Create history for metadata changes (title, description) since these are user edits
      pushHistory();
      updateUndoRedoFlags();
    },
    setDraggingType: (t?: string) => set({ draggingType: t }),
    setIsDragging: (dragging: boolean) => set({ isDragging: dragging }),
    setCurrentFlowId: (flowId?: string) => set({ currentFlowId: flowId }),
    replaceAll: (nodes: Node[], edges: Edge[]) => {
      set({ nodes, edges });
      pushHistory();
      updateUndoRedoFlags();
    },
    loadFromJson: (data: Partial<ComposeState>) => {
      set((state) => ({
        nodes: data.nodes ?? state.nodes,
        edges: data.edges ?? state.edges,
        viewport: data.viewport ?? state.viewport,
        meta: data.meta ?? state.meta,
      }));
      // Reset history and set this loaded state as the baseline
      history = [makeSnapshot(get())];
      historyIndex = 0;
      set({ canUndo: false, canRedo: false });
    },
    toJson: () => {
      const { nodes, edges, viewport, meta } = get();
      return { nodes, edges, viewport, meta };
    },
    clear: () => {
      set({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        meta: {},
      });
      pushHistory();
      updateUndoRedoFlags();
    },
    undo: () => {
      if (historyIndex > 0 && history.length > 1) {
        historyIndex--;
        const snap = history[historyIndex];
        set({
          nodes: JSON.parse(JSON.stringify(snap.nodes)),
          edges: JSON.parse(JSON.stringify(snap.edges)),
          viewport: { ...snap.viewport },
          meta: { ...snap.meta },
        });
        updateUndoRedoFlags();
      }
    },
    redo: () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const snap = history[historyIndex];
        set({
          nodes: JSON.parse(JSON.stringify(snap.nodes)),
          edges: JSON.parse(JSON.stringify(snap.edges)),
          viewport: { ...snap.viewport },
          meta: { ...snap.meta },
        });
        updateUndoRedoFlags();
      }
    },
    resetHistory: () => {
      history = [];
      historyIndex = -1;
      set({ canUndo: false, canRedo: false });
    },
    // Atomic operation to update both nodes and edges in a single history entry
    setNodesAndEdgesWithHistory: (
      nodeUpdater: (prev: Node[]) => Node[],
      edgeUpdater: (prev: Edge[]) => Edge[],
    ) => {
      set((state) => {
        const newNodes = nodeUpdater(state.nodes);
        const newEdges = edgeUpdater(state.edges);

        // Single history entry for both updates
        setTimeout(() => {
          pushHistory();
          updateUndoRedoFlags();
        }, 0);

        return { nodes: newNodes, edges: newEdges };
      });
    },
    // Silent setNodes - updates nodes without history (for programmatic changes)
    setNodesSilent: (updater: (prev: Node[]) => Node[]) => {
      set((state) => {
        const newNodes = updater(state.nodes);
        return { nodes: newNodes };
      });
    },
  };

  // On first create, push initial state to history
  setTimeout(() => {
    history = [makeSnapshot(initialState as any)];
    historyIndex = 0;
    set({ canUndo: false, canRedo: false });
  }, 0);

  return initialState;
});
