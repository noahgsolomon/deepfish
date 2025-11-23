import { Node, Edge } from "@xyflow/react";
import domToImage from "dom-to-image-more";

export const normalizeInputValues = async (value: any): Promise<any> => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const converted = await Promise.all(
      value.map((item) => normalizeInputValues(item)),
    );
    return converted;
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await normalizeInputValues(v),
      ]),
    );
    return Object.fromEntries(entries);
  }

  return value;
};

export async function captureThumbnail() {
  console.group("[Composer] captureThumbnail");
  const sourceEl = document.querySelector(".react-flow") as HTMLElement | null;
  if (!sourceEl) {
    console.warn("captureThumbnail: .react-flow element not found");
    console.groupEnd();
    return null;
  }
  console.log("captureThumbnail: preparing clone");

  // 1×1 transparent pixel used as placeholder for blocked URLs
  const emptyPixel =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAA6fptVAAAAE0lEQVR42mP8z/D/PwAI/AL+GQ+I4AAAAABJRU5ErkJggg==";

  // Whitelist of domains whose images we may keep (deepfi.sh + blob CDN)
  const allowedHosts = new Set<string>();
  try {
    allowedHosts.add(window.location.host);
  } catch {}
  try {
    const blobUrl = process.env.NEXT_PUBLIC_BLOB_URL;
    const assetUrl = process.env.NEXT_PUBLIC_ASSET_URL;
    if (blobUrl) allowedHosts.add(new URL(blobUrl).host);
    if (assetUrl) allowedHosts.add(new URL(assetUrl).host);
  } catch {}

  const isAllowedRemote = (url: string): boolean => {
    try {
      const host = new URL(url).host;
      return allowedHosts.has(host);
    } catch {
      return false;
    }
  };

  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.zIndex = "-9999"; // behind everything
  clone.style.pointerEvents = "none";

  /* NEW ↓ — force it _not_ to generate scroll-bars */
  clone.style.maxWidth = "100vw";
  clone.style.overflow = "hidden"; // don't let inner content overflow

  /* optional: if your graph can be taller than the viewport */
  clone.style.maxHeight = "100vh";

  // Give clone a unique ID so CSS can be scoped
  clone.id = "deepfish-thumb-clone";

  // Strip disallowed <img> sources
  clone.querySelectorAll("img").forEach((node) => {
    const img = node as HTMLImageElement;
    const src = img.getAttribute("src") || "";
    if (/^https?:\/\//i.test(src) && !isAllowedRemote(src)) {
      img.src = emptyPixel;
    }
  });

  // Strip disallowed inline background-image URLs
  clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const bg = el.style.backgroundImage;
    if (!bg || !bg.includes("url")) return;
    const match = bg.match(/url\(["']?(.*?)["']?\)/i);
    if (
      match &&
      match[1] &&
      /^https?:\/\//i.test(match[1]) &&
      !isAllowedRemote(match[1])
    ) {
      el.style.backgroundImage = "none";
    }
  });

  // Add CSS scoped to clone to hide borders/outlines inside it only
  const style = document.createElement("style");
  style.textContent = `
    #deepfish-thumb-clone * { border:none!important; outline:none!important; box-shadow:none!important; }
    #deepfish-thumb-clone .react-flow__node, #deepfish-thumb-clone .react-flow__node * { border-color:transparent!important; box-shadow:none!important; outline:none!important; }
    #deepfish-thumb-clone .react-flow__edge-path, #deepfish-thumb-clone .react-flow__edge *, #deepfish-thumb-clone .react-flow__selection, #deepfish-thumb-clone .react-flow__selection * { stroke:transparent!important; fill:transparent!important; }
  `;
  clone.appendChild(style);

  document.body.appendChild(clone);

  // Optionally down-scale large canvases

  try {
    const TIMEOUT = 15000; // 15 s hard cap
    const pngPromise = domToImage.toPng(clone, {
      bgcolor: "#000000",
      cacheBust: true,
      skipClone: true, // we already made a clone
    });
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn("captureThumbnail: timeout after", TIMEOUT, "ms");
        resolve(null);
      }, TIMEOUT),
    );
    const dataUrl = (await Promise.race([pngPromise, timeoutPromise])) as
      | string
      | null;
    console.log("captureThumbnail: done", { length: dataUrl?.length });
    return dataUrl;
  } catch (err) {
    console.error("captureThumbnail: failed", err);
    return null;
  } finally {
    // Clean up off-screen clone and restore body overflow
    clone.remove();
    console.groupEnd();
  }
}

// Topological sort (Kahn)
export const topoSort = (n: Node[], e: Edge[]): Node[][] => {
  console.group("[Composer] Topological sort");
  console.log(
    "Input nodes:",
    n.map((nd) => nd.id),
  );
  console.log(
    "Input edges:",
    e.map((ed) => `${ed.source}->${ed.target}`),
  );
  const inDeg: Record<string, number> = {};
  n.forEach((node) => {
    inDeg[node.id] = 0;
  });
  e.forEach((edge) => {
    if (inDeg[edge.target] !== undefined) {
      inDeg[edge.target] += 1;
    }
  });

  const queue: string[] = [];
  Object.keys(inDeg).forEach((id) => {
    if (inDeg[id] === 0) queue.push(id);
  });

  const ordered: Node[][] = [];
  const map = new Map(n.map((nd) => [nd.id, nd]));

  while (queue.length) {
    // Process all nodes with current in-degree (can run concurrently)
    const currentLevel: Node[] = [];
    const nextQueue: string[] = [];

    // Process all nodes in the current queue (same in-degree)
    while (queue.length) {
      const id = queue.shift();
      if (id === undefined) break;
      const nd = map.get(id);
      if (nd) currentLevel.push(nd);

      // Update in-degrees for downstream nodes
      e.forEach((edge) => {
        if (edge.source === id) {
          inDeg[edge.target] -= 1;
          if (inDeg[edge.target] === 0) {
            nextQueue.push(edge.target);
          }
        }
      });
    }

    // Add current level to ordered result if not empty
    if (currentLevel.length > 0) {
      ordered.push(currentLevel);
    }

    // Move to next level
    queue.push(...nextQueue);
  }

  console.log("Sorted order:", ordered);
  console.groupEnd();
  return ordered;
};

// Collect inputs for a node based on upstream outputs
export const collectInputs = (
  node: Node,
  e: Edge[],
  outputs: Map<string, any>,
): Record<string, any> => {
  const obj: Record<string, any> = {};
  e.forEach((edge) => {
    if (edge.target === node.id) {
      const val = outputs.get(edge.source);
      console.log(
        "  edge",
        edge.source,
        "->",
        node.id,
        "handle",
        edge.targetHandle,
        "value",
        val,
      );
      if (val !== undefined) {
        obj[edge.targetHandle ?? "input"] = val;
      }
    }
  });
  console.log(
    `[Composer] collectInputs for ${node.id}:`,
    JSON.parse(JSON.stringify(obj)),
  );
  return obj;
};
