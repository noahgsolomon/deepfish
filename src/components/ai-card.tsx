"use client";

import { ArrowRight, Coins } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useUserActiveRuns } from "~/hooks/workflow-runs/use-active-runs";
import Image from "next/image";
import { Workflows } from "~/types";

type WorkflowItem = Workflows["workflows"][number];

export function AiCard({ item }: { item: WorkflowItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverGifTimestamp, setHoverGifTimestamp] = useState<number | null>(
    null,
  );

  // Check if this workflow is currently running in the queue
  const { data: activeRuns = [] } = useUserActiveRuns();
  const isRunning = activeRuns.some((run) => run.workflowName === item.title);

  // --------------------------------------------------------------
  // Derive input/output type badges
  // --------------------------------------------------------------
  const inputTypes: string[] = Array.isArray(item.data.inputTypes)
    ? [...item.data.inputTypes]
    : [];
  if (inputTypes.length === 0 && item.data.schema?.Input?.properties) {
    Object.values(item.data.schema.Input.properties).forEach((prop: any) => {
      const t = inferType(prop);
      if (t && !inputTypes.includes(t)) inputTypes.push(t);
    });

    const preferred = ["text", "image", "audio", "video", "file", "3d"];
    inputTypes.sort((a, b) => preferred.indexOf(a) - preferred.indexOf(b));
  }

  const separatorChar = item.data.inOutKey?.includes("&") ? "&" : "|";

  const outputTypeBadge =
    item.data.outputType ?? item.data.schema?.Output?.format ?? "";

  function inferType(p: any): string | null {
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
      // If array items are strings with URI format
      if (
        (itemSchema.format === "uri" || itemSchema.type === "string") &&
        (p.title || "").toLowerCase().includes("image")
      ) {
        return "image";
      }
      // Generic fallback for array of URIs without clear media type
      if (itemSchema.format === "uri") {
        return "file";
      }
    }
    if (p.type === "string") return "text";
    if (p.type === "integer" || p.type === "number" || p.type === "boolean") {
      return null;
    }
    return null;
  }

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

  // Get credit cost - default to 1 if not specified
  const creditCost = item?.creditCost ?? 1;
  const creditDisplay = getCreditCostDisplay(creditCost);

  let cardBorderClass = "";
  let cardBgClass = "";

  if (isRunning) {
    cardBorderClass = "border-blue-500 animate-pulse";
    cardBgClass = "bg-surface-secondary";
  } else {
    // cardBorderClass = `border-rainbow-hover border-rainbow-hover-${rainbowIndex}`;
    cardBorderClass = "border-border-default hover:border-border-strong";
    cardBgClass = "bg-surface-secondary hover:bg-surface-hover";
  }

  const getHref = () => {
    return `/workflow/${encodeURIComponent(item.title)}`;
  };

  useEffect(() => {
    if (item.data.avatar?.endsWith(".gif") && isHovered) {
      setHoverGifTimestamp(Date.now());
    }
  }, [isHovered, item.data.avatar]);

  return (
    <Link
      href={getHref()}
      className={`group flex flex-row rounded-none border p-1 transition-all ${cardBorderClass} ${cardBgClass} relative h-[100px] text-[13px]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`border-border-default bg-surface-primary relative h-full w-24 flex-shrink-0 overflow-hidden border`}
      >
        {item.data.deepFishOfficial && (
          <Image
            width={24}
            height={24}
            src="/stamp.png"
            alt="Deepfish Official"
            className="pointer-events-none absolute top-1 left-1 h-6 w-6 opacity-80"
          />
        )}
        {item.data.avatar ? (
          <Image
            width={100}
            height={100}
            src={
              item.data.avatar.endsWith(".gif")
                ? !isHovered
                  ? item.data.avatar.replace(".gif", ".png")
                  : `${item.data.avatar}?t=${hoverGifTimestamp}`
                : item.data.avatar
            }
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src =
                item.data.provider === "fal" ? "/fal-ai.png" : "/replicate.png";
            }}
            alt={""}
            className="h-full w-full object-cover"
          />
        ) : null}
        (item.provider === "replicate" || item.provider === "fal") && (
        <Image
          src={
            item.data.provider === "replicate"
              ? "/replicate.png"
              : "/fal-ai.png"
          }
          alt={item.data.provider === "replicate" ? "Replicate" : "Fal.ai"}
          width={20}
          height={20}
          className="absolute right-1 bottom-1 opacity-70 drop-shadow"
        />
      </div>

      <div className="flex-1 overflow-hidden pl-2">
        <div className="mb-1">
          <div className="flex items-center justify-between">
            <h3 className="text-text-secondary group-hover:text-text-emphasis truncate font-mono text-xs font-bold">
              {item.data.shortTitle || item.title}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {inputTypes.map((t, idx) => (
              <React.Fragment key={`in-${t}`}>
                <div
                  className={`text-[9px] ${badgeColor(
                    t,
                  )} inline-block border px-1 py-0.5 font-mono`}
                >
                  {t.toUpperCase()}
                </div>
                {idx < inputTypes.length - 1 && separatorChar && (
                  <div className="text-text-muted inline-block px-0.5 font-mono text-[12px]">
                    {separatorChar}
                  </div>
                )}
              </React.Fragment>
            ))}
            {outputTypeBadge && inputTypes.length > 0 && (
              <ArrowRight size={12} className="text-text-muted" />
            )}
            {outputTypeBadge && (
              <div
                className={`text-[9px] ${badgeColor(
                  outputTypeBadge,
                )} inline-block border px-1 py-0.5 font-mono`}
              >
                {outputTypeBadge.toUpperCase()}
              </div>
            )}
          </div>
          <div className="tems-center mt-1 mb-1 flex flex-col gap-1">
            <p className="text-text-muted line-clamp-2 font-mono text-[10px] leading-snug">
              {item.data.shortDescription || item.data.description}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`absolute right-1 bottom-1 flex items-center gap-1 ${creditDisplay.bgColor} border ${creditDisplay.borderColor} ${creditDisplay.textColor} rounded-none px-1 py-0.5 font-mono text-[8px]`}
      >
        <Coins size={8} />
        <span className="font-bold">{creditDisplay.label}</span>
      </div>
    </Link>
  );
}
