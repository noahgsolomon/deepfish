"use client";

import { useRouter } from "next/navigation";
import { useForkFlow, useToggleFlowVisibility } from "~/hooks/flows";
import { type Flow } from "~/types";
import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Play,
  Star,
  Lock,
  Check,
  Globe,
  Copy,
  Pause,
  GitFork,
} from "lucide-react";
import Image from "next/image";
import { useTRPC } from "~/trpc/client";
import { toast } from "~/hooks/use-toast";
import { useUser } from "~/hooks/auth";

interface PopularFlow extends Flow {
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
}

interface Props {
  flow: PopularFlow | Flow;
  variant?: "user" | "popular" | "profile"; // Determines which UI features to show
  onForkSuccess?: () => void; // Callback after successful fork
}

export default function FlowCard({
  flow,
  variant = "user",
  onForkSuccess,
}: Props) {
  const router = useRouter();
  const [justCopied, setJustCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get current user info for user variant
  const { data: user } = useUser();
  const trpc = useTRPC();

  // Consider a flow popular if it has more than 50 runs
  const isPopular = (flow.runs ?? 0) > 50;
  const isPublic = flow.isPublic ?? false;

  // Fork flow mutation (for popular variant)
  const forkFlowMutation = useForkFlow({
    onSuccess: async (data) => {
      toast({
        title: "Flow forked successfully",
        description: "You can now edit your copy of this flow",
        variant: "success",
      });
      if (onForkSuccess) {
        onForkSuccess();
      }
      router.push(`/composer/${data.flowId}`);
    },
    onError: () => {
      toast({
        title: "Error forking flow",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Toggle flow visibility mutation (for user variant)
  const toggleVisibilityMutation = useToggleFlowVisibility({
    onSuccess: (data) => {
      if (data.isPublic) {
        const flowUrl = `${window.location.origin}/composer/${flow.id}`;
        navigator.clipboard.writeText(flowUrl);
        toast({
          title: "Flow published!",
          description: "Link copied to clipboard - share it with others",
        });
      } else {
        toast({
          title: "Flow is now private",
          description: "Only you can access this flow",
        });
      }
    },
    meta: {
      errorToast: {
        title: "Error updating flow",
        description: "Please try again later",
      },
      invalidate: [trpc.flow.listFlows.pathKey()],
    },
  });

  /* ---- analyse flow json to infer input/output types --- */
  const analyseFlow = useCallback((flowJson: string) => {
    try {
      const obj = JSON.parse(flowJson || "{}") as {
        nodes?: any[];
        edges?: any[];
      };
      const nodes = obj.nodes ?? [];
      const edges = obj.edges ?? [];
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const inDeg: Record<string, number> = {};
      edges.forEach((e) => {
        inDeg[e.target] = (inDeg[e.target] || 0) + 1;
      });
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
          const inner = p.items;
          if (
            (inner.format === "uri" || inner.type === "string") &&
            (p.title || "").toLowerCase().includes("image")
          )
            return "image";
          if (inner.format === "uri") return "file";
        }
        if (p.type === "string") return "text";
        return null;
      };
      const inputSet = new Set<string>();
      const add = (t: any) => {
        if (typeof t === "string") inputSet.add(t);
      };
      nodes.forEach((n: any) => {
        if (n.type === "primitiveNode" && !inDeg[n.id]) {
          add(n.data?.outputType || n.data?.fieldType?.outputType);
        }
      });
      const incomingByHandle: Record<string, Set<string>> = {};
      edges.forEach((e: any) => {
        if (!incomingByHandle[e.target]) incomingByHandle[e.target] = new Set();
        incomingByHandle[e.target].add(e.targetHandle ?? "input");
      });
      nodes.forEach((n: any) => {
        if (n.type !== "workflowNode") return;
        const wf = n.data?.workflow;
        const req: string[] = wf?.schema?.Input?.required ?? [];
        const props: Record<string, any> = wf?.schema?.Input?.properties ?? {};
        const provided = incomingByHandle[n.id] ?? new Set();
        req.forEach((name) => {
          if (!provided.has(name)) add(inferType(props[name]));
        });
      });
      const resultIds = new Set(
        nodes.filter((n: any) => n.type === "resultNode").map((n: any) => n.id),
      );
      const outSet = new Set<string>();
      const nodeOutType = (node: any): string | undefined => {
        if (!node) return undefined;
        if (node.type === "primitiveNode") return node.data?.outputType;
        if (node.type === "workflowNode")
          return (
            node.data?.workflow?.outputType ||
            node.data?.workflow?.schema?.Output?.format
          );
        if (node.type === "combineImagesNode") return "image";
        if (node.type === "replaceAudioNode") return "video";
        return undefined;
      };
      edges.forEach((e: any) => {
        if (resultIds.has(e.target)) {
          const src = byId.get(e.source);
          const t = nodeOutType(src);
          if (t) outSet.add(t);
        }
      });
      return { inputs: Array.from(inputSet), outputs: Array.from(outSet) };
    } catch {
      return { inputs: [], outputs: [] };
    }
  }, []);

  const { inputs, outputs } = useMemo(
    () => analyseFlow(flow.data),
    [flow.data, analyseFlow],
  );

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

  // Check if flow requires online (for user variant)
  let requiresOnline = false;
  try {
    const obj = JSON.parse(flow.data || "{}");
    (obj.nodes ?? []).forEach((n: any) => {
      if (n.type === "workflowNode") {
        const wf = n.data?.workflow;
        if (wf?.mode === "api") requiresOnline = true;
      }
    });
  } catch {}

  // Count nodes for stats
  const nodeCount = useMemo(() => {
    try {
      const obj = JSON.parse(flow.data || "{}");
      return obj.nodes?.length || 0;
    } catch {
      return 0;
    }
  }, [flow.data]);

  const handleMediaClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (
      flow.exampleOutputType === "video" ||
      (flow.exampleOutput &&
        (flow.exampleOutput.endsWith(".mp4") ||
          flow.exampleOutput.endsWith(".webm")))
    ) {
      if (!videoRef.current) return;
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (
      flow.exampleOutputType === "audio" ||
      (flow.exampleOutput &&
        (flow.exampleOutput.endsWith(".mp3") ||
          flow.exampleOutput.endsWith(".wav") ||
          flow.exampleOutput.endsWith(".ogg")))
    ) {
      if (!audioRef.current) {
        const audio = new Audio(flow.exampleOutput!);
        audioRef.current = audio;
        audio.addEventListener("ended", () => setIsPlaying(false));
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation();
    forkFlowMutation.mutate({ flowId: flow.id });
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleVisibilityMutation.mutate({ flowId: flow.id });
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const flowUrl = `${window.location.origin}/composer/${flow.id}`;
    navigator.clipboard.writeText(flowUrl);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
    toast({
      title: "Link copied!",
      description:
        "Share this link with others to let them view and fork your flow",
      variant: "success",
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/composer/${flow.id}`);
  };

  const handleClick = () => {
    router.push(`/composer/${flow.id}`);
  };

  return (
    <div
      className={`group group border-border-default bg-surface-secondary hover:bg-surface-hover hover:border-border-strong relative flex cursor-pointer flex-col rounded-none border p-2 transition-all duration-300`}
      onClick={handleClick}
    >
      <div className="border-border-default bg-surface-primary relative mb-2 flex aspect-[16/9] w-full items-center justify-center overflow-hidden border">
        {isPopular && (
          <div className="absolute top-1 right-1 z-10 flex items-center gap-1 border border-yellow-500/50 bg-yellow-500/20 px-2 py-0.5 font-mono text-xs text-yellow-300">
            <Star className="h-3 w-3 fill-current" />
          </div>
        )}
        {variant === "user" && (
          <div
            className={`absolute top-1 ${
              isPopular ? "right-10" : "right-1"
            } z-10 flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] ${
              isPublic
                ? "border border-blue-500/50 bg-blue-500/20 text-blue-300"
                : "bg-surface-hover border-border-default text-text-secondary border"
            }`}
          >
            {isPublic ? (
              <>
                <Globe className="h-3 w-3" />
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
              </>
            )}
          </div>
        )}

        {flow.thumbnail ? (
          <Image
            src={flow.thumbnail}
            alt={flow.name}
            fill
            sizes="(max-width: 640px) 80vw, 256px"
            className={`object-cover ${
              flow.nsfw && (!user || !user?.isOver18) ? "blur-lg" : ""
            }`}
            priority={true}
          />
        ) : (
          <span
            className={`text-3xl select-none ${
              flow.nsfw && (!user || !user?.isOver18) ? "blur-lg" : ""
            }`}
          >
            {flow.emoji ?? "🧩"}
          </span>
        )}

        {/* NSFW Overlay */}
        {flow.nsfw && (!user || !user?.isOver18) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-1">
              <div className="border border-red-800/50 bg-red-900/60 px-2 py-1 font-mono text-xs text-red-400">
                18+
              </div>
              <span className="text-text-secondary font-mono text-[10px]">
                NSFW CONTENT
              </span>
            </div>
          </div>
        )}

        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="text-text-secondary flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {flow.runs || 0}
            </span>
            <span>•</span>
            <span>
              {nodeCount} node{nodeCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Example output preview */}
        {flow.exampleOutput && flow.exampleOutputType && (
          <div
            className="border-border-strong hover:border-border-strong absolute right-1 bottom-1 z-10 h-16 w-16 cursor-pointer overflow-hidden border bg-black/80 transition-colors"
            onClick={handleMediaClick}
          >
            {flow.exampleOutputType === "image" && (
              <Image
                src={flow.exampleOutput}
                fill
                sizes="64px"
                className="object-cover"
                alt="Output preview"
                priority
              />
            )}
            {flow.exampleOutputType === "video" ||
            flow.exampleOutput.endsWith(".mp4") ||
            flow.exampleOutput.endsWith(".webm") ? (
              <div className="group/video relative flex h-full w-full items-center justify-center">
                <video
                  ref={videoRef}
                  src={flow.exampleOutput}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  loop
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/video:opacity-100">
                  {isPlaying ? (
                    <Pause className="text-text-emphasis h-4 w-4" />
                  ) : (
                    <Play className="text-text-emphasis h-4 w-4" />
                  )}
                </div>
              </div>
            ) : null}
            {flow.exampleOutputType === "audio" && (
              <div className="flex h-full w-full items-center justify-center bg-purple-500/20 transition-colors hover:bg-purple-500/30">
                {isPlaying ? (
                  <div className="relative">
                    <Pause className="h-4 w-4 text-purple-300" />
                  </div>
                ) : (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-purple-300"
                  >
                    <path
                      d="M9 18V5l12-2v13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="6" cy="18" r="3" fill="currentColor" />
                    <circle cx="18" cy="16" r="3" fill="currentColor" />
                  </svg>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="text-text-secondary group-hover:text-text-emphasis truncate font-mono text-xs font-bold">
          {flow.name}
        </h3>

        <div className="text-text-muted mb-2 flex items-center gap-1 text-[10px]">
          {variant === "popular" && "authorId" in flow && (
            <div
              className="hover:text-text-emphasis flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/user/${flow.authorId}`);
              }}
            >
              <Image
                src={flow.authorAvatar ?? "/stamp.png"}
                className="border-border-default h-3 w-3 border"
                alt={flow.authorName ?? "Anonymous"}
                width={12}
                height={12}
              />
              <span>{flow.authorName || "Anonymous"}</span>
            </div>
          )}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1">
          {inputs.map((t, idx) => (
            <span
              key={"in" + idx}
              className={`text-[9px] ${badgeColor(t)} border px-1`}
            >
              {t.toUpperCase()}
            </span>
          ))}
          {inputs.length && outputs.length ? (
            <ArrowRight size={10} className="text-text-muted" />
          ) : null}
          {outputs.map((t, idx) => (
            <span
              key={"out" + idx}
              className={`text-[9px] ${badgeColor(t)} border px-1`}
            >
              {t.toUpperCase()}
            </span>
          ))}
          {flow.nsfw && user && user.isOver18 && (
            <span className="border border-red-500/50 bg-red-500/30 px-1 text-[9px] text-red-100">
              NSFW!
            </span>
          )}
        </div>

        <div className="mt-auto flex gap-1">
          {variant === "user" ? (
            <>
              <button
                onClick={handleEdit}
                className="bg-surface-primary hover:bg-surface-hover border-border-default text-text-secondary flex h-6 flex-1 items-center justify-center gap-1 border text-[10px] transition-colors hover:text-white"
              >
                EDIT
              </button>
              {!isPublic ? (
                <button
                  onClick={handlePublish}
                  disabled={toggleVisibilityMutation.isPending}
                  className="flex h-6 flex-1 items-center justify-center gap-1 border border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-400 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Globe className="h-3 w-3" />
                  {toggleVisibilityMutation.isPending
                    ? "PUBLISHING..."
                    : "PUBLISH"}
                </button>
              ) : (
                <button
                  onClick={handleCopyLink}
                  aria-label={justCopied ? "Link copied" : "Copy link"}
                  className={`text-text-secondary flex h-6 items-center justify-center gap-1 rounded-none px-2 text-[10px] transition-colors hover:text-white ${
                    justCopied
                      ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "bg-surface-primary hover:bg-surface-hover border-border-default text-text-secondary border hover:text-white"
                  }`}
                >
                  {justCopied ? (
                    <>
                      <Check className="h-3 w-3 text-green-400" />
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            /* Popular variant actions */
            <>
              <button
                onClick={handleFork}
                disabled={forkFlowMutation.isPending}
                className="flex h-6 flex-1 items-center justify-center gap-1 border border-indigo-500/30 bg-indigo-500/10 text-[10px] text-indigo-400 transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GitFork className="h-3 w-3" />
                {forkFlowMutation.isPending ? "FORKING..." : "FORK"}
              </button>
              <button
                onClick={handleCopyLink}
                aria-label={justCopied ? "Link copied" : "Copy link"}
                className={`text-text-secondary flex h-6 items-center justify-center gap-1 rounded-none px-2 text-[10px] transition-colors hover:text-white ${
                  justCopied
                    ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-surface-primary hover:bg-surface-hover border-border-default text-text-secondary border hover:text-white"
                }`}
              >
                {justCopied ? (
                  <>
                    <Check className="h-3 w-3 text-green-400" />
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
