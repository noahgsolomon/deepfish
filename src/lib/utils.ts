import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FlowWithVisibility } from "~/hooks/flows";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export const optimizeFlowData = (
  flow: FlowWithVisibility,
): FlowWithVisibility => {
  try {
    const fullData = JSON.parse(flow.data || "{}");

    const minimalNodes = (fullData.nodes || []).map((node: any) => ({
      id: node.id,
      type: node.type,
      data: {
        outputType: node.data?.outputType,
        fieldType: node.data?.fieldType
          ? {
              outputType: node.data.fieldType.outputType,
            }
          : undefined,
        workflow: node.data?.workflow
          ? {
              mode: node.data.workflow.mode,
              outputType: node.data.workflow.outputType,
              schema: node.data.workflow.schema
                ? {
                    Input: {
                      required: node.data.workflow.schema.Input?.required,
                      properties: node.data.workflow.schema.Input?.properties,
                    },
                    Output: {
                      format: node.data.workflow.schema.Output?.format,
                    },
                  }
                : undefined,
            }
          : undefined,
      },
    }));

    const minimalEdges = (fullData.edges || []).map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      targetHandle: edge.targetHandle,
    }));

    const optimizedData = JSON.stringify({
      nodes: minimalNodes,
      edges: minimalEdges,
    });

    return {
      ...flow,
      data: optimizedData,
    };
  } catch (error) {
    console.warn("Failed to optimize flow data for", flow.id, error);
    return flow;
  }
};

export type ProgressStatus =
  | "downloading"
  | "installing"
  | "completed"
  | "error";

export function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: Date | string) {
  if (!date) return "Unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function formatRelativeTime(date?: Date | string) {
  if (!date) return "Unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "yesterday" : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffMins > 0) {
    return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`;
  }
  return "just now";
}

export const getProgressColor = (progress: number, status?: ProgressStatus) => {
  if (status) {
    if (status === "error") return "bg-red-600 radiate-red";
    if (status === "completed") return "bg-green-600 radiate-green";
  }
  if (progress > 80) return "bg-green-600 radiate-green";
  if (progress > 40) return "bg-yellow-500 radiate-yellow";
  return "bg-blue-600 radiate-blue";
};

const FLOW_EMOJIS = [
  "🧩",
  "🔮",
  "⚡",
  "🚀",
  "✨",
  "🌈",
  "🎮",
  "🎯",
  "🧠",
  "🔍",
  "🌟",
  "⚙️",
  "🛠️",
  "🤖",
  "🧪",
  "📊",
  "🔄",
  "🏗️",
  "🧬",
  "🔧",
  "💫",
  "🌊",
  "🔥",
  "🌿",
  "💡",
  "🎭",
  "🧵",
  "🎨",
  "📡",
  "🔔",
  "🎲",
  "🧙",
  "🦾",
  "🛸",
  "🌠",
  "💾",
  "📱",
  "🎛️",
  "⏱️",
  "🦄",
  "🐉",
  "🦋",
  "🐙",
  "🦜",
  "🐝",
  "🦊",
  "🐢",
  "🐬",
  "🦚",
  "🦁",
  "🐘",
  "🦖",
  "🦔",
  "🦇",
  "🦅",
  "🦓",
  "🐺",
  "🦈",
  "🦝",
  "🍄",
  "🌵",
  "🌋",
  "🏔️",
  "🏝️",
  "🌌",
  "⛅",
  "🌪️",
  "🌀",
  "⚗️",
  "🔭",
  "🔬",
  "🔗",
  "📐",
  "📓",
  "🧮",
  "🪄",
  "💎",
  "🎪",
  "🧶",
  "🧸",
  "🎼",
  "🎧",
  "🎬",
  "🎞️",
  "📺",
  "🎁",
  "💼",
  "🎒",
  "⏰",
  "⌚",
  "💻",
  "📱",
  "📢",
  "🔋",
  "🔌",
  "🧲",
  "🏆",
  "🌞",
  "🌜",
  "💖",
  "❤️‍🔥",
  "⚜️",
  "🟣",
  "🔱",
  "☄️",
  "🌱",
  "🍂",
  "🌾",
  "🌭",
  "🧁",
  "🍰",
  "🥇",
  "🏅",
];

export const getRandomEmoji = () => {
  return FLOW_EMOJIS[Math.floor(Math.random() * FLOW_EMOJIS.length)];
};
export const gridCols =
  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export async function downloadFile(url: string) {
  try {
    if (url.includes("app.deepfi.sh")) {
      url = url.replace("app.deepfi.sh", "deepfi.sh");
    }
    // Replace blob URL with asset URL if needed
    if (url.includes(process.env.NEXT_PUBLIC_BLOB_URL!)) {
      url = url.replace(
        process.env.NEXT_PUBLIC_BLOB_URL!,
        process.env.NEXT_PUBLIC_ASSET_URL!,
      );
    }

    console.log("THE NOW URL", url);

    // Fetch the file as a blob
    const response = await fetch(url);
    const blob = await response.blob();

    // Create a blob URL
    const blobUrl = window.URL.createObjectURL(blob);

    // Create anchor element and trigger download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = url.split("/").pop() || "download";
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Failed to download file:", error);
    // Fallback to opening in new tab if download fails
    window.open(url, "_blank");
  }
}
