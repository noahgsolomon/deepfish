import type { Node, Edge } from "@xyflow/react";

export interface FlowSnapshot {
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
  }[];
  edges: Pick<
    Edge,
    "id" | "source" | "target" | "sourceHandle" | "targetHandle"
  >[];
}

// Runtime‐only keys inside node.data that should be ignored when computing the dirty flag
const TRANSIENT_NODE_KEYS = new Set(["running", "src"]);

function stripTransientData(data: any): any {
  if (!data || typeof data !== "object") return data;
  const entries = Object.entries(data).filter(([k, _]) =>
    TRANSIENT_NODE_KEYS.has(k) ? false : true,
  );
  return Object.fromEntries(entries);
}

// Build a canonical snapshot: omit node positions and transient data so moving a node or runtime changes
// (like preview images) don't mark the flow as dirty.
export function makeSnapshot(nodes: Node[], edges: Edge[]): FlowSnapshot {
  const cleanNodes = nodes.map(({ id, type, position, data }) => ({
    id,
    type: type ?? "",
    position,
    data: stripTransientData(data),
  }));

  const cleanEdges = edges.map(
    ({ id, source, target, sourceHandle, targetHandle }) => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
    }),
  );

  cleanNodes.sort((a, b) => a.id.localeCompare(b.id));
  cleanEdges.sort((a, b) => a.id.localeCompare(b.id));

  return { nodes: cleanNodes, edges: cleanEdges };
}

export function snapshotsEqual(a: FlowSnapshot, b: FlowSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}
