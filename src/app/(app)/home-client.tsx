"use client";

import { useStatusBarStore } from "~/store/use-status-bar-store";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Play, Coins } from "lucide-react";
import { Selector } from "~/components/ui/selector";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { WorkflowGrid } from "~/components/workflow-grid";
import { Button } from "~/components/ui/button";
import FlowSection from "~/components/flow-section";
import Link from "next/link";
import Image from "next/image";
import { usePopularFlows, useUserFlows } from "~/hooks/flows";
import { useAllWorkflows } from "~/hooks/workflows";
import { WorkflowData } from "~/server/db/schema";
import { useTRPC } from "~/trpc/client";

const ALL_MODALITIES = [
  "TEXT->TEXT",
  "TEXT->IMAGE",
  "TEXT->AUDIO",
  "TEXT->VIDEO",
  "IMAGE->IMAGE",
  "IMAGE->TEXT",
  "IMAGE->3D",
  "AUDIO->TEXT",
  "AUDIO->AUDIO",
  "VIDEO->VIDEO",
];

interface HomeClientProps {
  initCounts: {
    user: number;
    popular: number;
  };
}

export default function HomeClient({ initCounts }: HomeClientProps) {
  const { data: allWorkflows } = useAllWorkflows();
  const { data: userFlows } = useUserFlows({
    withData: true,
  });
  const { data: popularFlows } = usePopularFlows(24);

  const setCurrentPage = useStatusBarStore((s) => s.setCurrentPage);
  const setLeftText = useStatusBarStore((s) => s.setLeftText);
  const setRightText = useStatusBarStore((s) => s.setRightText);
  const setStatusText = useStatusBarStore((s) => s.setStatusText);
  const setStatusType = useStatusBarStore((s) => s.setStatusType);
  const setLeftUrl = useStatusBarStore((s) => s.setLeftUrl);

  const router = useRouter();

  // Helper to infer a media type from the JSON schema (duplicated from AiCard)
  const inferType = (p: any): string | null => {
    if (!p) return null;

    if (p.format === "uri") {
      const title = (p.title || "").toLowerCase();
      if (title.includes("video")) return "video";
      if (title.includes("audio")) return "audio";
      if (title.includes("image") || title.includes("mask")) return "image";
      return "file";
    }
    // Handle array of URIs or other structured inputs
    if (p.type === "array" && p.items) {
      const itemSchema = p.items;
      if (
        (itemSchema.format === "uri" || itemSchema.type === "string") &&
        (p.title || "").toLowerCase().includes("image")
      ) {
        return "image";
      }
      if (itemSchema.format === "uri") {
        return "file";
      }
    }
    if (p.type === "string") return "text";
    if (p.type === "integer" || p.type === "number" || p.type === "boolean") {
      return null;
    }
    return null;
  };

  // Extract a primary input type for each workflow (first distinct media type found)
  const getPrimaryInputType = (wf: WorkflowData): string | null => {
    const props = wf.schema?.Input?.properties ?? {};
    for (const key of Object.keys(props)) {
      const t = inferType((props as any)[key]);
      if (t) return t;
    }
    return null;
  };

  // Build a map of modality string to count (e.g. "audio->audio": 5)
  const modalityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allWorkflows?.workflows.forEach((wf) => {
      const inType = getPrimaryInputType(wf.data);
      const outType = wf.data.outputType || wf.data.schema?.Output?.format;
      if (inType && outType) {
        const key = `${inType.toUpperCase()}->${outType.toUpperCase()}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [allWorkflows]);

  const modalityOptions = useMemo(() => {
    const fromData = Object.keys(modalityCounts);
    return Array.from(new Set([...fromData, ...ALL_MODALITIES])).sort();
  }, [modalityCounts]);

  // Badge color helper (reuse from AiCard)
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
      case "file":
        return "bg-orange-500/30 border-orange-500/50 text-orange-100";
      case "3d":
        return "bg-lime-500/30 border-lime-500/50 text-lime-100";
      default:
        return "bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-100";
    }
  };

  // Determine credit cost styling based on intensity (blue to red spectrum)
  const getCreditCostDisplay = (cost: number) => {
    if (cost === 0) {
      return {
        bgColor: "bg-green-500/20",
        borderColor: "border-green-500/30",
        textColor: "text-green-400",
        label: "FREE",
      };
    } else if (cost > 0 && cost < 3) {
      return {
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/30",
        textColor: "text-blue-400",
        label: `${cost}`,
      };
    } else if (cost >= 3 && cost < 5) {
      return {
        bgColor: "bg-cyan-500/20",
        borderColor: "border-cyan-500/30",
        textColor: "text-cyan-400",
        label: `${cost}`,
      };
    } else if (cost >= 5 && cost < 7) {
      return {
        bgColor: "bg-purple-500/20",
        borderColor: "border-purple-500/30",
        textColor: "text-purple-400",
        label: `${cost}`,
      };
    } else if (cost >= 7 && cost < 9) {
      return {
        bgColor: "bg-pink-500/20",
        borderColor: "border-pink-500/30",
        textColor: "text-pink-400",
        label: `${cost}`,
      };
    } else if (cost >= 9 && cost < 12) {
      return {
        bgColor: "bg-orange-500/20",
        borderColor: "border-orange-500/30",
        textColor: "text-orange-400",
        label: `${cost}`,
      };
    } else {
      return {
        bgColor: "bg-red-500/20",
        borderColor: "border-red-500/30",
        textColor: "text-red-400",
        label: `${cost}`,
      };
    }
  };

  useEffect(() => {
    const base = allWorkflows?.workflows;
    setCurrentPage("home");
    setLeftText(`${base?.length} WORKFLOWS AVAILABLE`);
    setLeftUrl(null);
    setRightText(null);
    setStatusText(null);
    setStatusType(null);
  }, [allWorkflows]);

  const handleCreateFlow = () => {
    const newId = nanoid();
    router.push(`/composer/${newId}`);
  };

  return (
    <main className="flex-1 pt-8 pb-24" suppressHydrationWarning>
      <div className="flex min-h-0 flex-col text-white">
        <div className="relative z-10 flex min-h-0 flex-col">
          <div className="flex flex-col gap-16">
            {/* Hero Banner - Recommended Workflow */}
            {allWorkflows?.workflows.length &&
              allWorkflows?.workflows.length > 0 && (
                <div className="container px-4">
                  <div className="mb-2">
                    <span className="text-text-muted font-mono text-xs uppercase">
                      RECOMMENDED FOR YOU
                    </span>
                  </div>
                  <Link
                    href={`/workflow/${encodeURIComponent(
                      allWorkflows.workflows[0].title,
                    )}`}
                    className="group block"
                  >
                    <div className="from-surface-secondary to-surface-primary border-border-default hover:border-border-strong relative flex flex-col overflow-hidden border bg-gradient-to-r transition-all md:h-[200px] md:flex-row">
                      <div className="border-border-default relative h-[200px] w-full flex-shrink-0 overflow-hidden border-b bg-black md:h-full md:w-[300px] md:border-r md:border-b-0">
                        {allWorkflows.workflows[0].data.avatar ? (
                          <Image
                            fill
                            sizes="(max-width: 768px) 100vw, 300px"
                            src={allWorkflows.workflows[0].data.avatar}
                            alt={allWorkflows.workflows[0].data.title}
                            className="object-cover"
                            priority
                          />
                        ) : (
                          <div className="text-text-muted flex h-full w-full items-center justify-center font-mono text-4xl">
                            AI
                          </div>
                        )}
                        {allWorkflows.workflows[0].data.deepFishOfficial && (
                          <Image
                            width={32}
                            height={32}
                            src="/stamp.png"
                            alt="Deepfish Official"
                            className="pointer-events-none absolute top-2 left-2 opacity-80"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4 md:p-6">
                        <div>
                          <h2 className="group-hover:text-text-emphasis mb-2 font-mono text-lg font-bold text-white md:text-2xl">
                            {allWorkflows.workflows[0].data.shortTitle ||
                              allWorkflows.workflows[0].data.title}
                          </h2>
                          <p className="text-text-secondary mb-3 line-clamp-2 max-w-2xl font-mono text-xs md:mb-4 md:text-sm">
                            {allWorkflows.workflows[0].data.shortDescription ||
                              allWorkflows.workflows[0].data.description}
                          </p>
                          <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-4"></div>
                        </div>

                        {/* Bottom info */}
                        <div className="flex items-center justify-between">
                          <div className="text-text-muted flex items-center gap-2 font-mono text-[10px] md:gap-4 md:text-xs">
                            <span className="flex items-center gap-1">
                              <Play size={10} className="md:h-3 md:w-3" />
                              {allWorkflows?.workflows?.[0].runs || 0} RUNS
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Credit Badge */}
                      {(() => {
                        const creditCost =
                          allWorkflows?.workflows?.[0].creditCost ?? 1;
                        const creditDisplay = getCreditCostDisplay(creditCost);
                        return (
                          <div
                            className={`absolute right-2 bottom-2 flex items-center gap-1 ${creditDisplay.bgColor} border ${creditDisplay.borderColor} ${creditDisplay.textColor} rounded-none px-2 py-1 font-mono text-[10px] md:text-xs`}
                          >
                            <Coins size={12} className="md:h-3 md:w-3" />
                            <span className="font-bold">
                              {creditDisplay.label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </Link>
                </div>
              )}

            <div>
              <div className="container px-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-mono text-2xl font-bold">FLOWS</h2>
                    <div className="text-text-muted font-mono text-xs">
                      /flōz/ • <span className="italic">noun</span> • visual
                      sequences of connected AI operations
                    </div>
                  </div>
                  <button
                    onClick={handleCreateFlow}
                    aria-label="Create new flow"
                    className={`inline-flex h-8 items-center justify-center gap-2 rounded-none border border-blue-500/30 bg-blue-500/10 px-3 text-xs text-blue-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20`}
                  >
                    <span className="text-[16px]">+</span> CREATE
                  </button>
                </div>
              </div>
              <FlowSection
                title="MY FLOWS"
                flows={userFlows ?? []}
                isLoading={false}
                variant="user"
                initialCount={initCounts.user}
                showCreateButton={true}
              />

              <FlowSection
                title="PUBLIC FLOWS"
                flows={popularFlows ?? []}
                isLoading={false}
                variant="popular"
                initialCount={0}
              />
            </div>

            <div className="container px-4">
              <div className="mt-6 flex flex-1 flex-col">
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-bold">
                    WORKFLOWS
                  </span>
                  <div className="text-text-muted font-mono text-xs">
                    /ˈwərkˌflō/ • <span className="italic">noun</span> •
                    pre-built AI models ready to run
                  </div>
                </div>

                <WorkflowGrid />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
