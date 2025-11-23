"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function FlowIllustration() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const gap = 700;
    const timers = [
      setTimeout(() => setStep(1), gap * 1), // Show inputs
      setTimeout(() => setStep(2), gap * 2), // Show GPT Image Gen
      setTimeout(() => setStep(3), gap * 3), // Connect inputs to GPT
      setTimeout(() => setStep(4), gap * 4), // Show Upscaler
      setTimeout(() => setStep(5), gap * 5), // Connect GPT to Upscaler
      setTimeout(() => setStep(6), gap * 6), // Show Result
      setTimeout(() => setStep(7), gap * 7), // Connect Upscaler to Result
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black p-4">
      <div className="relative h-32 w-full max-w-2xl">
        {/* Input Section */}
        <div className="absolute top-1/2 left-0 flex -translate-y-1/2 flex-col gap-1">
          {/* Text Input */}
          <div
            className={`bg-surface-hover border-border-emphasis flex h-6 w-14 items-center justify-center border transition-all duration-500 ${
              step >= 1 ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            <span className="text-text-default font-mono text-[7px]">TEXT</span>
          </div>
          {/* Image Input */}
          <div
            className={`bg-surface-hover border-border-emphasis flex h-6 w-14 items-center justify-center border transition-all duration-500 ${
              step >= 1 ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            <span className="text-text-default font-mono text-[7px]">
              IMAGE
            </span>
          </div>
        </div>

        {/* GPT Image Gen */}
        <div
          className={`absolute top-1/2 left-[25%] h-14 w-20 -translate-y-1/2 border border-pink-600/30 bg-pink-600/10 p-1.5 transition-all duration-500 ${
            step >= 2 ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <div className="mb-0.5 flex items-start justify-between">
            <div className="text-text-emphasis font-mono text-[7px] leading-tight">
              GPT IMAGE
            </div>
            <Image
              width={8}
              height={8}
              src="/fal-ai.png"
              alt="fal"
              className="opacity-50"
            />
          </div>
          <div className="mt-0.5 flex gap-0.5">
            <div className="bg-surface-hover h-1.5 w-1.5" />
            <div className="bg-surface-hover h-1.5 w-1.5" />
            <div className="bg-surface-hover h-1.5 w-1.5" />
          </div>
        </div>

        {/* Upscaler */}
        <div
          className={`absolute top-1/2 left-[53%] h-14 w-20 -translate-y-1/2 border border-red-600/30 bg-red-600/10 p-1.5 transition-all duration-500 ${
            step >= 4 ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <div className="mb-0.5 flex items-start justify-between">
            <div className="text-text-emphasis font-mono text-[7px] leading-tight">
              UPSCALER
            </div>
            <Image
              width={8}
              height={8}
              src="/replicate.png"
              alt="replicate"
              className="opacity-50"
            />
          </div>
          <div className="mt-0.5 flex gap-0.5">
            <div className="bg-surface-hover h-1.5 w-1.5" />
            <div className="bg-surface-hover h-1.5 w-1.5" />
            <div className="bg-surface-hover h-1.5 w-1.5" />
          </div>
        </div>

        {/* Result Image */}
        <div
          className={`absolute top-1/2 right-0 flex h-16 w-16 -translate-y-1/2 items-center justify-center border border-blue-600/30 bg-blue-600/10 transition-all duration-500 ${
            step >= 6 ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <Image width={32} height={32} src="/gpt-image.png" alt="result" />
        </div>

        {/* Connecting Lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {/* Inputs to GPT Image Gen */}
          <line
            x1="18%"
            y1="50%"
            x2="25%"
            y2="50%"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className={`transition-all duration-500 ${
              step >= 3 ? "opacity-30" : "opacity-0"
            }`}
          />
          <line
            x1="50%"
            y1="50%"
            x2="52%"
            y2="50%"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className={`transition-all duration-500 ${
              step >= 5 ? "opacity-30" : "opacity-0"
            }`}
          />
          {/* Upscaler to Result */}
          <line
            x1="78%"
            y1="50%"
            x2="80%"
            y2="50%"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className={`transition-all duration-500 ${
              step >= 7 ? "opacity-30" : "opacity-0"
            }`}
          />
        </svg>
      </div>
    </div>
  );
}
