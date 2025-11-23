"use client";

import FlowCard from "./flow-card";
import UserFlowCardSkeleton from "./user-flow-card-skeleton";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useId, useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import CreditPurchaseFlowCard from "./credit-purchase-flow-card";
import { useUser } from "~/hooks/auth";
import { FlowWithVisibility } from "~/hooks/flows";
import { Flow, PopularFlow } from "~/types";

interface FlowSectionProps {
  title: string;
  flows: FlowWithVisibility[];
  isLoading: boolean;
  variant: "user" | "popular" | "profile";
  initialCount: number;
  showCreateButton?: boolean;
}

export default function FlowSection({
  title,
  flows,
  isLoading,
  variant,
  initialCount,
  showCreateButton = false,
}: FlowSectionProps) {
  const router = useRouter();
  const carouselId = useId();
  const [scrollInfo, setScrollInfo] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    page: 0,
    totalPages: 1,
  });
  const [cardOpacities, setCardOpacities] = useState<Record<string, number>>(
    {},
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: user } = useUser();

  const handleCreateFlow = () => {
    const newId = nanoid();
    router.push(`/composer/${newId}`);
  };

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const scroller = document.getElementById(carouselId);
      if (!scroller) return;

      const scrollAmount = scroller.clientWidth * 0.8;

      scroller.scrollBy({
        left: direction * scrollAmount,
        behavior: "smooth",
      });
    },
    [carouselId],
  );

  useEffect(() => {
    const scroller = document.getElementById(carouselId);
    if (!scroller) return;

    const updateScrollInfo = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;

      // Calculate page info based on scroll position
      const pageScrollAmount = clientWidth * 0.8;
      const maxScrollLeft = scrollWidth - clientWidth;

      // If we're at or very close to the end, we're on the last page
      const isAtEnd = scrollLeft >= maxScrollLeft - 1;
      const totalPages = Math.max(
        1,
        Math.ceil(maxScrollLeft / pageScrollAmount) + 1,
      );
      const currentPage = isAtEnd
        ? totalPages - 1
        : Math.round(scrollLeft / pageScrollAmount);

      setScrollInfo({
        canScrollLeft: scrollLeft > 0,
        canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
        page: Math.max(0, Math.min(currentPage, totalPages - 1)),
        totalPages: totalPages,
      });
    };

    updateScrollInfo();
    scroller.addEventListener("scroll", updateScrollInfo, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollInfo);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollInfo);
      resizeObserver.disconnect();
    };
  }, [carouselId]);

  if (!isLoading && flows.length === 0 && !showCreateButton) {
    return null;
  }

  const allItems =
    isLoading && flows.length === 0
      ? Array(initialCount)
          .fill(0)
          .map((_, idx) => ({ id: `skeleton-${idx}`, isSkeleton: true }))
      : flows;

  return (
    <div className="mb-6">
      <div className="container px-4">
        <h3 className="text-text-emphasis mt-4 mb-4 font-mono text-lg font-bold">
          {title}
        </h3>
      </div>

      <div className="relative">
        <div className="group relative flex flex-row items-center gap-2">
          <div
            ref={containerRef}
            id={carouselId}
            className="scrollbar-hide flex snap-x snap-mandatory scroll-pl-4 space-x-2 overflow-x-auto pr-8 transition-all duration-300 ease-in-out"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="w-2 flex-none snap-start transition-opacity duration-200"></div>
            {showCreateButton && (
              <div
                className="w-64 flex-none snap-start transition-opacity duration-200"
                data-card-id="create-button"
              >
                <div
                  className="group border-border-default bg-surface-secondary hover:border-border-strong hover:bg-surface-hover flex h-full cursor-pointer flex-col rounded-none border border-dashed p-2 transition-all"
                  onClick={handleCreateFlow}
                >
                  <div className="border-border-default bg-surface-primary relative mb-2 flex aspect-[16/9] w-full items-center justify-center border">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="butt"
                      className="text-text-muted group-hover:text-text-secondary transition-colors"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <h3 className="text-text-secondary group-hover:text-text-emphasis mb-1 font-mono text-xs font-bold">
                    CREATE NEW FLOW
                  </h3>
                  <p className="text-text-muted line-clamp-2 font-mono text-[10px]">
                    Open Composer and start building
                  </p>
                </div>
              </div>
            )}

            {user && showCreateButton && variant === "user" && (
              <CreditPurchaseFlowCard />
            )}

            {allItems.map((flow, idx) => (
              <div
                key={flow.id || idx}
                data-card-id={flow.id || `skeleton-${idx}`}
                className="w-[80vw] flex-none snap-start transition-opacity duration-200 sm:w-64"
              >
                {"isSkeleton" in flow && flow.isSkeleton ? (
                  <UserFlowCardSkeleton />
                ) : (
                  <FlowCard
                    flow={flow as Flow | PopularFlow}
                    variant={variant}
                  />
                )}
              </div>
            ))}
          </div>

          {scrollInfo.canScrollLeft && (
            <button
              onClick={() => scrollByPage(-1)}
              aria-label="Scroll left"
              className="absolute top-1/2 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex"
            >
              <ChevronLeftIcon className="h-6 w-6 text-white transition-transform duration-300 hover:scale-125" />
            </button>
          )}

          {scrollInfo.canScrollRight && (
            <button
              onClick={() => scrollByPage(1)}
              aria-label="Scroll right"
              className="absolute top-1/2 right-2 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex"
            >
              <ChevronRightIcon className="h-6 w-6 text-white transition-transform duration-300 hover:scale-125" />
            </button>
          )}

          {scrollInfo.totalPages > 1 && (
            <div
              className={cn(
                "absolute top-[-1rem] right-8 hidden gap-1 transition-opacity duration-150 lg:flex",
              )}
            >
              {Array.from({ length: scrollInfo.totalPages }, (_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-[2px] w-4 bg-white transition-opacity",
                    scrollInfo.page === idx ? "opacity-100" : "opacity-30",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
