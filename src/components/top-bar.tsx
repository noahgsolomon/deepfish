"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { nanoid } from "nanoid";
import { X, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/store/use-tab-store";
import { useFlowStore } from "~/store/use-flow-store";
import { useDraftFlowStore } from "~/store/use-draft-flow-store";
import { usePublicFlow, usePublicFlows, useUserFlows } from "~/hooks/flows";
import { UserButton } from "~/components/user-button";
import SaveFlowModal from "./modals/save-flow-modal";
import CreditBalance from "./credit-balance";
import { Flow } from "~/types";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  const tabs = useTabStore((s) => s.tabs);
  const addTab = useTabStore((s) => s.addTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const activeHref = useTabStore((s) => s.activeHref);
  const setActive = useTabStore((s) => s.setActive);

  const fullHref = (() => {
    return pathname ?? "";
  })();
  const { data: userFlows = [] } = useUserFlows({ withData: true });
  const dirtyMap = useFlowStore((s) => s.dirty);
  const clearDraft = useDraftFlowStore((s) => s.clearDraft);
  const setDirtyFlag = useFlowStore((s) => s.setDirty);
  // id -> name lookup map (recreated only when flows array changes)
  const flowNameMap = React.useMemo(
    () => new Map(userFlows.map((f) => [f.id, f.name])),
    [userFlows],
  );

  // Get ID from dynamic route params for composer pages
  const currentFlowId = pathname?.startsWith("/composer/")
    ? (params.id?.[0] ?? "")
    : null;

  const { data: currentPublicFlow } = usePublicFlow(currentFlowId || "", {
    enabled: !!currentFlowId && pathname?.startsWith("/composer"),
    select: (data: Flow) => ({ id: data?.id ?? "", name: data?.name ?? "" }),
  });

  const publicFlowQueries = usePublicFlows(
    tabs
      .map((t) => t.href)
      .filter((h) => h.startsWith("/composer/"))
      .map((h) => h.split("/")[2]),
  );

  const findFlow = (id: string) => {
    const { data: publicFlow } = usePublicFlow(id, {
      enabled: pathname?.startsWith("/composer"),
      select: (data: Flow) => ({ id: data?.id ?? "", name: data?.name ?? "" }),
    });
    return publicFlow;
  };

  // Save flow modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalFlowName, setSaveModalFlowName] = useState("");
  const [saveModalCallbacks, setSaveModalCallbacks] = useState<{
    onSave: () => void;
    onDontSave: () => void;
  }>({ onSave: () => {}, onDontSave: () => {} });

  // Compute label function
  const deriveLabel = (): string => {
    if (!pathname?.startsWith("/composer")) return "";

    const idParam = currentFlowId;
    if (currentPublicFlow?.id === idParam) return currentPublicFlow.name;

    return `New Flow`;
  };

  const prevHrefRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fullHref) return;

    if (pathname?.startsWith("/composer")) {
      addTab({ href: fullHref, label: deriveLabel() });
      setActive(fullHref);
    }

    prevHrefRef.current = fullHref;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullHref]);

  const handleAddTab = useCallback(() => {
    const newId = nanoid();
    const newHref = `/composer/${newId}`;
    addTab({ href: newHref, label: "New Flow" });

    router.push(newHref);
  }, [router, addTab]);

  const handleCloseTab = useCallback(
    async (href: string, e: React.MouseEvent) => {
      e.stopPropagation();

      // If corresponding flow is dirty, prompt user
      let flowId: string | null = null;
      if (href.startsWith("/composer/")) {
        // Extract ID from path like /composer/uuid
        const match = href.match(/^\/composer\/([^/?]+)/);
        flowId = match ? match[1] : null;
      }

      if (flowId && dirtyMap[flowId]) {
        // Try to get the flow name from user flows first, then from current public flow
        const flowName =
          flowNameMap.get(flowId) ||
          (currentPublicFlow?.id === flowId ? currentPublicFlow.name : null) ||
          "new flow";

        // Web: Use SaveFlowModal
        setSaveModalFlowName(flowName);
        setSaveModalCallbacks({
          onSave: () => {
            // Listen once for completion then close
            const onSaved = (ev: Event) => {
              if ((ev as CustomEvent<string>).detail === flowId) {
                window.removeEventListener("flow_saved", onSaved as any);
                actuallyCloseTab();
              }
            };

            const actuallyCloseTab = () => {
              const closingActive = href === activeHref;
              const remaining = tabs.filter((t) => t.href !== href);
              removeTab(href);
              if (closingActive) {
                const next = remaining[remaining.length - 1];
                if (next) router.push(next.href);
                else router.push("/");
              }
            };

            window.addEventListener("flow_saved", onSaved);

            // Fire request to save
            window.dispatchEvent(
              new CustomEvent("request_save_flow", { detail: flowId }),
            );

            // Switch to that tab so user sees it saving
            router.push(href);
          },
          onDontSave: () => {
            let key: string | null = null;
            if (href.startsWith("/composer/")) {
              const match = href.match(/^\/composer\/([^/?]+)/);
              key = match ? match[1] : null;
            }
            if (key) {
              console.log("clearing draft", key);
              clearDraft(key);
            }
            if (flowId) setDirtyFlag(flowId, false);

            // Close the tab
            const closingActive = href === activeHref;
            const remaining = tabs.filter((t) => t.href !== href);
            removeTab(href);
            if (closingActive) {
              const next = remaining[remaining.length - 1];
              if (next) router.push(next.href);
              else router.push("/");
            }
          },
        });
        setSaveModalOpen(true);
        return;
      }

      const closingActive = href === activeHref;
      const remaining = tabs.filter((t) => t.href !== href);

      removeTab(href);

      if (closingActive) {
        const next = remaining[remaining.length - 1];
        if (next) router.push(next.href);
        else router.push("/");
      }
    },
    [
      activeHref,
      router,
      tabs,
      dirtyMap,
      flowNameMap,
      currentPublicFlow,
      clearDraft,
      setDirtyFlag,
      removeTab,
    ],
  );

  // Overflow detection for border
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [tabs, checkOverflow]);

  return (
    <div className="bg-surface-secondary border-border-default z-[100] ml-0 flex h-8 items-center justify-between border-y text-xs sm:ml-10 md:ml-14 md:h-10">
      {/* ---------------- Tabs (left) ---------------- */}
      <div className="flex h-full items-center gap-1">
        {/* Scrollable tab list */}
        <div
          ref={scrollerRef}
          className={`flex h-full max-w-[60vw] flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden ${
            hasOverflow ? "border-border-default border-r" : ""
          }`}
        >
          {tabs.map((tab) => {
            const { href } = tab;
            // derive display label
            let displayLabel = tab.label;
            let tabId: string | null = null;

            if (href.startsWith("/composer/")) {
              // Extract ID from path like /composer/uuid
              const match = href.match(/^\/composer\/([^/?]+)/);
              tabId = match ? match[1] : null;
            }

            if (tabId) {
              // Check user flows first, then current public flow
              const nm =
                flowNameMap.get(tabId) ||
                (currentPublicFlow?.id === tabId
                  ? currentPublicFlow.name
                  : publicFlowQueries.find((f) => f.data?.id === tabId)?.data
                      ?.name) ||
                "new flow";
              displayLabel = nm ?? `NEW-${tabId.slice(0, 4)}`;
            }

            const active =
              currentFlowId && tabId ? currentFlowId === tabId : false;

            return (
              <Button
                key={href}
                variant="tab"
                size="tab"
                onClick={() => router.push(href)}
                className={`group/tab relative flex cursor-pointer items-center justify-between select-none ${
                  active
                    ? "text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:bg-yellow-400"
                    : "text-text-default"
                }`}
              >
                <span className="mr-2 max-w-[120px] truncate">
                  {displayLabel}
                </span>
                {/* Close / Dirty indicator area */}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(href, e as any);
                  }}
                  className="relative flex h-4 w-4 items-center justify-center bg-transparent hover:bg-transparent"
                >
                  {/* White dot shown when dirty; fades on hover */}
                  {dirtyMap[tabId ?? ""] && (
                    <span className="h-2 w-2 bg-white transition-opacity duration-150 group-hover/tab:opacity-0" />
                  )}
                  {/* Close icon – hidden until hover */}
                  <X
                    size={12}
                    className="absolute opacity-0 group-hover/tab:opacity-80 hover:opacity-100"
                  />
                </span>
              </Button>
            );
          })}
        </div>
        {/* Always-visible Add button */}
        <Button
          variant="tab"
          size="tab"
          onClick={handleAddTab}
          className="flex w-8 flex-shrink-0 items-center justify-center"
          title="New Tab ⌘+T"
        >
          <Plus size={12} />
        </Button>
      </div>

      {/* ---------------- User Button, Command Palette, Metrics (right) ---------------- */}
      <div className="flex items-center gap-1 pr-4">
        <CreditBalance />
        <UserButton />
      </div>

      {/* Save Flow Modal for web users */}
      <SaveFlowModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        flowName={saveModalFlowName}
        onSave={saveModalCallbacks.onSave}
        onDontSave={saveModalCallbacks.onDontSave}
      />
    </div>
  );
}
