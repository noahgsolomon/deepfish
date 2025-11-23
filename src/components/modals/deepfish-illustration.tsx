"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function DeepFishIllustration() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const gap = 500;
    const timers = [
      setTimeout(() => setStep(1), gap * 1), // Show Replicate
      setTimeout(() => setStep(2), gap * 2), // Show Fal
      setTimeout(() => setStep(3), gap * 3), // Show ComfyUI
      setTimeout(() => setStep(4), gap * 4), // Show AI Apps
      setTimeout(() => setStep(5), gap * 5), // Show Border
      setTimeout(() => setStep(6), gap * 6), // Show Blue Overlay & DeepFish
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      {/* Container - adjusted height for closer spacing */}
      <div className="relative h-28 w-80">
        {/* Infrastructure Layer - positioned at bottom */}
        <div className="absolute right-0 bottom-0 left-0 flex justify-center gap-2">
          {/* Replicate Box */}
          <div
            className={`flex h-14 w-20 items-center justify-center border border-red-600 bg-red-600/20 font-mono text-xs transition-all duration-500 ${
              step >= 1
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <Image
              width={24}
              height={24}
              src={"/replicate.png"}
              alt="replicate"
            />
          </div>

          {/* Fal Box */}
          <div
            className={`flex h-14 w-20 items-center justify-center border border-pink-600 bg-pink-600/20 font-mono text-xs transition-all duration-500 ${
              step >= 2
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <Image width={24} height={24} src={"/fal-ai.png"} alt="fal" />
          </div>

          {/* ComfyUI Box */}
          <div
            className={`flex h-14 w-20 items-center justify-center border border-purple-600 bg-purple-600/20 font-mono text-xs transition-all duration-500 ${
              step >= 3
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <Image
              width={24}
              height={24}
              src={"/comfyui-logo.png"}
              alt="comfyui"
            />
          </div>
        </div>

        {/* AI Apps Layer - positioned above infrastructure with closer spacing */}
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 transition-all duration-500 ${
            step >= 4 ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Container to match infrastructure width exactly */}
          <div className="flex gap-2" style={{ width: "248px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border-border-emphasis flex h-8 flex-1 items-center justify-center border bg-white/10"
                style={{
                  transitionDelay: `${i * 80}ms`,
                  transform: step >= 4 ? "translateY(0)" : "translateY(10px)",
                  opacity: step >= 4 ? 1 : 0,
                }}
              >
                <span className="text-text-default font-mono text-[8px]">
                  AI APP
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Blue Border - now covers the entire container */}
        <div
          className={`absolute -inset-2 border-2 border-blue-500 transition-all duration-500 ${
            step >= 5 ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        />

        {/* Blue Overlay with DeepFish Text */}
        <div
          className={`absolute -inset-2 flex items-center justify-center bg-blue-500/40 transition-all duration-500 ${
            step >= 6 ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image width={50} height={50} alt="deep fish" src={"/app-icon.png"} />
        </div>
      </div>
    </div>
  );
}
