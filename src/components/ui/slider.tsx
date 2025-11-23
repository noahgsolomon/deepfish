"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "~/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer touch-none items-center select-none",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="bg-terminal-track border-border-default relative h-1.5 w-full grow cursor-pointer overflow-hidden rounded-none border">
      <SliderPrimitive.Range className="absolute h-full bg-blue-500/50" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="bg-surface-secondary focus-visible:ring-ring block h-4 w-4 cursor-pointer rounded-none border border-blue-400/50 shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
