"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function WorkflowImportIllustration() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const gap = 500;
    const timers = [
      setTimeout(() => setStep(1), gap * 1), // Show sources
      setTimeout(() => setStep(2), gap * 2), // Fill Fal URL
      setTimeout(() => setStep(3), gap * 3), // Transform Fal to card
      setTimeout(() => setStep(4), gap * 4), // Fill Replicate URL
      setTimeout(() => setStep(5), gap * 5), // Transform Replicate to card
      setTimeout(() => setStep(6), gap * 6), // Show ComfyUI JSON
      setTimeout(() => setStep(7), gap * 7), // Transform ComfyUI to card
      setTimeout(() => setStep(8), gap * 8), // Show blue border
      setTimeout(() => setStep(9), gap * 9), // Show overlay with text
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-sm">
        {/* Import Sources Row */}
        <div className="mb-6 flex justify-center gap-4">
          {/* Fal Source */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-12 w-12 items-center justify-center border border-pink-600 bg-pink-600/20 transition-all duration-500 ${
                step >= 1 ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
            >
              <Image width={20} height={20} src="/fal-ai.png" alt="fal" />
            </div>
            <div
              className={`bg-surface-primary border-border-default flex h-6 w-24 items-center border px-2 transition-all duration-500 ${
                step >= 2 && step < 3 ? "opacity-100" : "opacity-0"
              }`}
            >
              <span
                className={`text-text-default truncate font-mono text-[8px] transition-all duration-500 ${
                  step >= 2 ? "opacity-100" : "opacity-0"
                }`}
              >
                Fal URL
              </span>
            </div>
          </div>

          {/* Replicate Source */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-12 w-12 items-center justify-center border border-red-600 bg-red-600/20 transition-all duration-500 ${
                step >= 1 ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
            >
              <Image
                width={20}
                height={20}
                src="/replicate.png"
                alt="replicate"
              />
            </div>
            <div
              className={`bg-surface-primary border-border-default flex h-6 w-24 items-center border px-2 transition-all duration-500 ${
                step >= 4 && step < 5 ? "opacity-100" : "opacity-0"
              }`}
            >
              <span
                className={`text-text-default truncate font-mono text-[8px] transition-all duration-500 ${
                  step >= 4 ? "opacity-100" : "opacity-0"
                }`}
              >
                Replicate URL
              </span>
            </div>
          </div>

          {/* ComfyUI Source */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-12 w-12 items-center justify-center border border-purple-600 bg-purple-600/20 transition-all duration-500 ${
                step >= 1 ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
            >
              <Image
                width={20}
                height={20}
                src="/comfyui-logo.png"
                alt="comfyui"
              />
            </div>
            <div
              className={`bg-surface-primary border-border-default flex h-6 w-20 items-center justify-center border transition-all duration-500 ${
                step >= 6 && step < 7
                  ? "scale-100 opacity-100"
                  : "scale-90 opacity-0"
              }`}
            >
              <span className="text-text-default font-mono text-[8px]">
                {"{...}.json"}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Cards Row */}
        <div className="relative">
          <div className="flex justify-between gap-3">
            {/* Fal Workflow Card */}
            <div
              className={`h-20 flex-1 border border-pink-600/30 bg-pink-600/10 p-3 transition-all duration-500 ${
                step >= 3
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
            >
              <div className="mb-1 flex items-start justify-between">
                <div className="text-text-emphasis font-mono text-[10px]">
                  FLUX
                </div>
                <Image
                  width={12}
                  height={12}
                  src="/fal-ai.png"
                  alt="fal"
                  className="opacity-50"
                />
              </div>
              <div className="text-text-secondary font-mono text-[8px]">
                Image Gen
              </div>
              <div className="mt-1 flex gap-1">
                <div className="bg-surface-hover h-3 w-3" />
                <div className="bg-surface-hover h-3 w-3" />
                <div className="bg-surface-hover h-3 w-3" />
              </div>
            </div>

            {/* Replicate Workflow Card */}
            <div
              className={`h-20 flex-1 border border-red-600/30 bg-red-600/10 p-3 transition-all duration-500 ${
                step >= 5
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
            >
              <div className="mb-1 flex items-start justify-between">
                <div className="text-text-emphasis font-mono text-[10px]">
                  SDXL
                </div>
                <Image
                  width={12}
                  height={12}
                  src="/replicate.png"
                  alt="replicate"
                  className="opacity-50"
                />
              </div>
              <div className="text-text-secondary font-mono text-[8px]">
                Image Gen
              </div>
              <div className="mt-1 flex gap-1">
                <div className="bg-surface-hover h-3 w-3" />
                <div className="bg-surface-hover h-3 w-3" />
                <div className="bg-surface-hover h-3 w-3" />
              </div>
            </div>

            {/* ComfyUI Workflow Card */}
            <div
              className={`h-20 flex-1 border border-purple-600/30 bg-purple-600/10 p-3 transition-all duration-500 ${
                step >= 7
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
            >
              <div className="mb-1 flex items-start justify-between">
                <div className="text-text-emphasis font-mono text-[10px]">
                  CUSTOM
                </div>
                <Image
                  width={12}
                  height={12}
                  src="/comfyui-logo.png"
                  alt="comfyui"
                  className="opacity-50"
                />
              </div>
              <div className="text-text-secondary font-mono text-[8px]">
                Workflow
              </div>
              <div className="mt-1 flex gap-1">
                <div className="bg-surface-hover h-3 w-3" />
                <div className="bg-surface-hover h-3 w-3" />
                <div className="bg-surface-hover h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Blue Border */}
          <div
            className={`absolute -inset-3 border-2 border-blue-500 transition-all duration-500 ${
              step >= 8 ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          />

          {/* Blue Overlay with Text */}
          <div
            className={`absolute -inset-3 flex items-center justify-center bg-blue-500/40 transition-all duration-500 ${
              step >= 9 ? "opacity-100" : "opacity-0"
            }`}
          >
            <span
              className={`font-mono text-base font-bold text-white transition-all duration-500 ${
                step >= 9 ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
            >
              UNIFIED WORKFLOW LIBRARY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
